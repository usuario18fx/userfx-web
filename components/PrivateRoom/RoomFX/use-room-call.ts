import { useCallback, useEffect, useRef, useState } from "react";
import { roomRequest, RoomError, type Participant, type RoomState } from "./client";

export type JoinOptions = { cameraOn: boolean; micOn: boolean; videoDeviceId?: string; audioDeviceId?: string };
type Signal = { id: number; fromSession: string; kind: "offer" | "answer" | "ice"; payload: string };
type Peer = { pc: RTCPeerConnection; video?: RTCRtpTransceiver; audio?: RTCRtpTransceiver; makingOffer: boolean; ignoreOffer: boolean; ice: RTCIceCandidateInit[] };

// Adapted from the supplied Moodroom call hook: vault transport, perfect
// negotiation, recv/send transceivers, checked admission, and full cleanup.
export function useRoomCall(client: string, roomId: string, selfId: string, iceServers: RTCIceServer[]) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [error, setError] = useState("");
  const peers = useRef(new Map<string, Peer>());
  const stream = useRef<MediaStream | null>(null);
  const active = useRef(false);
  const camera = useRef(false);
  const mic = useRef(false);
  const busy = useRef(false);
  const cursor = useRef(0);
  const presenceBusy = useRef(false);
  const signalBusy = useRef(false);
  const generation = useRef(0);

  const signal = useCallback(async (toSession: string, kind: string, payload: unknown) => {
    await roomRequest(client, roomId, "signals", { method: "POST", body: { toSession, kind, payload: JSON.stringify(payload) } });
  }, [client, roomId]);

  const offer = useCallback(async (id: string, peer: Peer) => {
    if (!active.current || peer.makingOffer || peer.pc.signalingState !== "stable") return;
    try {
      peer.makingOffer = true;
      await peer.pc.setLocalDescription(await peer.pc.createOffer());
      await signal(id, "offer", peer.pc.localDescription);
    } catch { if (active.current) setError("Connection interrupted. Rejoining can restore your call."); }
    finally { peer.makingOffer = false; }
  }, [signal]);

  const createPeer = useCallback((id: string) => {
    const existing = peers.current.get(id);
    if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers });
    const local = stream.current || new MediaStream();
    // The answerer binds its tracks to the offered transceivers after applying
    // the remote description; precreating them duplicates media sections.
    const initiator = selfId < id;
    const video = initiator ? pc.addTransceiver(local.getVideoTracks()[0] || "video", { direction: "sendrecv", streams: [local] }) : undefined;
    const audio = initiator ? pc.addTransceiver(local.getAudioTracks()[0] || "audio", { direction: "sendrecv", streams: [local] }) : undefined;
    const peer: Peer = { pc, video, audio, makingOffer: false, ignoreOffer: false, ice: [] };
    peers.current.set(id, peer);
    pc.onicecandidate = (event) => { if (event.candidate && active.current) void signal(id, "ice", event.candidate.toJSON()).catch(() => {}); };
    pc.ontrack = (event) => {
      setRemoteStreams((current) => {
        const incoming = new MediaStream(current[id]?.getTracks() || []);
        const tracks = [...(event.streams[0]?.getTracks() || []), event.track];
        for (const track of tracks) if (!incoming.getTracks().some((existing) => existing.id === track.id)) incoming.addTrack(track);
        return { ...current, [id]: incoming };
      });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        pc.close();
        peers.current.delete(id);
        setError("A connection failed. Leave and rejoin; some networks require a relay service.");
      }
    };
    if (selfId < id) void offer(id, peer);
    return peer;
  }, [iceServers, selfId, offer, signal]);

  const reset = useCallback(() => {
    generation.current += 1;
    active.current = false;
    camera.current = false;
    mic.current = false;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    for (const peer of peers.current.values()) peer.pc.close();
    peers.current.clear();
    setJoined(false); setLocalStream(null); setRemoteStreams({}); setCameraOn(false); setMicOn(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!active.current || presenceBusy.current) return;
    presenceBusy.current = true;
    const version = generation.current;
    try {
      await roomRequest(client, roomId, "presence", { method: "POST", body: { cameraOn: camera.current, micOn: mic.current } });
      const data = await roomRequest<RoomState>(client, roomId, "state");
      if (!active.current || version !== generation.current) return;
      setParticipants(data.participants);
      const others = new Set(data.participants.filter((person) => person.id !== selfId).map((person) => person.id));
      for (const id of others) createPeer(id);
      for (const [id, peer] of peers.current) {
        if (!others.has(id)) {
          peer.pc.close(); peers.current.delete(id);
          setRemoteStreams((current) => { const next = { ...current }; delete next[id]; return next; });
        }
      }
    } catch (cause) {
      if (cause instanceof RoomError && (cause.status === 401 || cause.status === 403)) reset();
      setError(cause instanceof Error ? cause.message : "The network is reconnecting.");
    } finally { presenceBusy.current = false; }
  }, [client, roomId, selfId, createPeer, reset]);

  const poll = useCallback(async () => {
    if (!active.current || signalBusy.current) return;
    signalBusy.current = true;
    const version = generation.current;
    try {
      const data = await roomRequest<{ signals: Signal[] }>(client, roomId, "signals", { after: cursor.current });
      if (!active.current || version !== generation.current) return;
      for (const item of data.signals) {
        cursor.current = Math.max(cursor.current, item.id);
        const peer = createPeer(item.fromSession);
        const pc = peer.pc;
        try {
          if (item.kind === "ice") {
            if (peer.ignoreOffer) continue;
            const ice = JSON.parse(item.payload) as RTCIceCandidateInit;
            if (pc.remoteDescription) await pc.addIceCandidate(ice); else peer.ice.push(ice);
          } else {
            const description = JSON.parse(item.payload) as RTCSessionDescriptionInit;
            const collision = description.type === "offer" && (peer.makingOffer || pc.signalingState !== "stable");
            peer.ignoreOffer = selfId < item.fromSession && collision;
            if (peer.ignoreOffer) continue;
            if (collision) await pc.setLocalDescription({ type: "rollback" });
            await pc.setRemoteDescription(description);
            for (const ice of peer.ice.splice(0)) await pc.addIceCandidate(ice);
            if (description.type === "offer") {
              for (const kind of ["video", "audio"] as const) {
                const transceiver = pc.getTransceivers().find((item) => item.receiver.track.kind === kind);
                if (transceiver) {
                  peer[kind] = transceiver;
                  transceiver.direction = "sendrecv";
                  const track = kind === "video" ? stream.current?.getVideoTracks()[0] : stream.current?.getAudioTracks()[0];
                  await transceiver.sender.replaceTrack(track || null);
                  if (stream.current) transceiver.sender.setStreams(stream.current);
                }
              }
              await pc.setLocalDescription(await pc.createAnswer());
              await signal(item.fromSession, "answer", pc.localDescription);
            }
          }
        } catch { /* Stale descriptions expire and do not interrupt other peers. */ }
      }
    } catch (cause) {
      if (cause instanceof RoomError && cause.status === 401) { reset(); setError(cause.message); }
    } finally { signalBusy.current = false; }
  }, [client, roomId, selfId, createPeer, signal, reset]);

  const join = useCallback(async (options: JoinOptions) => {
    if (active.current || busy.current) return;
    busy.current = true; setConnecting(true); setError("");
    const version = ++generation.current;
    let acquired: MediaStream | null = null;
    try {
      // Server approval and capacity are checked before requesting devices.
      const last = await roomRequest<{ cursor: number }>(client, roomId, "signals", { latest: true });
      cursor.current = last.cursor;
      await roomRequest(client, roomId, "presence", { method: "POST", body: { cameraOn: false, micOn: false } });
      if (version !== generation.current) {
        void roomRequest(client, roomId, "presence", { method: "DELETE" }).catch(() => {});
        return;
      }
      if (options.cameraOn || options.micOn) {
        acquired = await navigator.mediaDevices.getUserMedia({
          video: options.cameraOn ? { deviceId: options.videoDeviceId ? { exact: options.videoDeviceId } : undefined, width: { ideal: 1280 } } : false,
          audio: options.micOn ? { deviceId: options.audioDeviceId ? { exact: options.audioDeviceId } : undefined, echoCancellation: true, noiseSuppression: true } : false,
        });
      } else acquired = new MediaStream();
      if (version !== generation.current) { acquired.getTracks().forEach((track) => track.stop()); return; }
      stream.current = acquired; active.current = true;
      camera.current = !!acquired.getVideoTracks().length; mic.current = !!acquired.getAudioTracks().length;
      setLocalStream(acquired); setCameraOn(camera.current); setMicOn(mic.current); setJoined(true);
      await refresh(); void poll();
    } catch (cause) {
      acquired?.getTracks().forEach((track) => track.stop());
      reset();
      void roomRequest(client, roomId, "presence", { method: "DELETE" }).catch(() => {});
      setError(cause instanceof RoomError ? cause.message : "Camera or microphone permission was denied. Check your devices, or join with both off.");
    } finally { busy.current = false; setConnecting(false); }
  }, [client, roomId, refresh, poll, reset]);

  const leave = useCallback(async () => {
    reset(); setError("");
    await roomRequest(client, roomId, "presence", { method: "DELETE" }).catch(() => {});
  }, [client, roomId, reset]);

  const toggleMedia = useCallback(async (kind: "video" | "audio") => {
    if (!active.current) return;
    const enabled = kind === "video" ? camera.current : mic.current;
    const tracks = kind === "video" ? stream.current?.getVideoTracks() : stream.current?.getAudioTracks();
    const version = generation.current;
    if (enabled) {
      tracks?.forEach((track) => { track.stop(); stream.current?.removeTrack(track); });
      for (const peer of peers.current.values()) await peer[kind]?.sender.replaceTrack(null);
    } else {
      try {
        const acquired = await navigator.mediaDevices.getUserMedia({ video: kind === "video", audio: kind === "audio" });
        if (!active.current || version !== generation.current) { acquired.getTracks().forEach((track) => track.stop()); return; }
        const track = acquired.getTracks()[0];
        stream.current?.addTrack(track);
        for (const peer of peers.current.values()) await peer[kind]?.sender.replaceTrack(track);
      } catch { setError(`Allow access to your ${kind === "video" ? "camera" : "microphone"} to enable it.`); return; }
    }
    if (kind === "video") { camera.current = !enabled; setCameraOn(!enabled); } else { mic.current = !enabled; setMicOn(!enabled); }
    setLocalStream(new MediaStream(stream.current?.getTracks() || []));
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const presenceTimer = window.setInterval(() => void refresh(), 5000);
    const signalTimer = window.setInterval(() => void poll(), 1200);
    return () => { clearInterval(presenceTimer); clearInterval(signalTimer); };
  }, [refresh, poll]);

  useEffect(() => {
    const peerMap = peers.current;
    const cleanup = () => {
      generation.current += 1;
      if (active.current) void roomRequest(client, roomId, "presence", { method: "DELETE", keepalive: true }).catch(() => {});
      active.current = false;
      stream.current?.getTracks().forEach((track) => track.stop());
      for (const peer of peerMap.values()) peer.pc.close();
      peerMap.clear();
    };
    window.addEventListener("pagehide", cleanup);
    return () => { window.removeEventListener("pagehide", cleanup); cleanup(); };
  }, [client, roomId]);

  return { participants, remoteStreams, localStream, joined, connecting, cameraOn, micOn, error, join, leave, toggleMedia };
}
