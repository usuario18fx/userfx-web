import { useEffect, useRef, useState } from "react";
import { Icon, VideoStream } from "./shared";
import type { JoinOptions } from "./use-room-call";
export default function Preview({ onClose, onJoin }: { onClose: () => void; onJoin: (options: JoinOptions) => void }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [videoDeviceId, setVideoDeviceId] = useState("");
  const [audioDeviceId, setAudioDeviceId] = useState("");
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const sequence = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    active.current = true;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    void navigator.mediaDevices?.enumerateDevices().then(setDevices).catch(() => {});
    return () => { active.current = false; sequence.current += 1; streamRef.current?.getTracks().forEach((track) => track.stop()); previous?.focus(); };
  }, []);
  async function test(camera: boolean, mic: boolean, videoId = videoDeviceId, audioId = audioDeviceId) {
    const request = ++sequence.current;
    setBusy(true); setWarning("");
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null; setStream(null);
    try {
      const next = camera || mic ? await navigator.mediaDevices.getUserMedia({
        video: camera ? { deviceId: videoId ? { exact: videoId } : undefined } : false,
        audio: mic ? { deviceId: audioId ? { exact: audioId } : undefined, echoCancellation: true } : false,
      }) : null;
      if (!active.current || request !== sequence.current) { next?.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = next; setStream(next); setCameraOn(camera); setMicOn(mic);
      setDevices(await navigator.mediaDevices.enumerateDevices());
    } catch { if (active.current && request === sequence.current) { setCameraOn(false); setMicOn(false); setWarning("Device access was denied. You can enter with camera and microphone off."); } }
    finally { if (active.current && request === sequence.current) setBusy(false); }
  }
  return (
<dialog ref={dialog} className="ufx-dialog" aria-labelledby="ufx-preview-title" onCancel={onClose}>
<div className="ufx-dialog-head">
<span>
PRIVATE DEVICE CHECK
</span>
<button type="button" onClick={onClose} aria-label="Close device preview">
<Icon name="close" />
</button>
</div>
<h2 id="ufx-preview-title">
Your entrance. Your control.
</h2>
<p>
Test your devices before you go live. The microphone starts off.
</p>
<div className="ufx-preview-video">
{stream && cameraOn ?
<VideoStream stream={stream} mirrored />
 :
<div className="ufx-preview-empty">
<Icon name="camera" size={38} />
<span>
YOUR CAMERA IS OFF
</span>
</div>
}
<span className="ufx-preview-label">
ONLY YOU CAN SEE THIS
</span>
</div>
<div className="ufx-preview-controls">
<button type="button" disabled={busy} aria-pressed={cameraOn} onClick={() => void test(!cameraOn, micOn)}>
<Icon name="camera" />
{cameraOn ? "CAMERA ON" : "TEST CAMERA"}
</button>
<button type="button" disabled={busy} aria-pressed={micOn} onClick={() => void test(cameraOn, !micOn)}>
<Icon name="mic" />
{micOn ? "MIC ON" : "TEST MIC"}
</button>
</div>
<label>
CAMERA
<select value={videoDeviceId} disabled={busy} onChange={(event) => { setVideoDeviceId(event.target.value); if (cameraOn) void test(cameraOn, micOn, event.target.value); }}>
<option value="">
Default camera
</option>
{devices.filter((device) => device.kind === "videoinput" && device.deviceId).map((device, index) =>
<option key={device.deviceId} value={device.deviceId}>
{device.label || `Camera ${index + 1}`}
</option>
)}
</select>
</label>
<label>
MICROPHONE
<select value={audioDeviceId} disabled={busy} onChange={(event) => { setAudioDeviceId(event.target.value); if (micOn) void test(cameraOn, micOn, videoDeviceId, event.target.value); }}>
<option value="">
Default microphone
</option>
{devices.filter((device) => device.kind === "audioinput" && device.deviceId).map((device, index) =>
<option key={device.deviceId} value={device.deviceId}>
{device.label || `Microphone ${index + 1}`}
</option>
)}
</select>
</label>
{warning &&
<p role="alert" className="ufx-warning">
{warning}
</p>
}
<button type="button" className="ufx-primary ufx-wide" disabled={busy} onClick={() => { streamRef.current?.getTracks().forEach((track) => track.stop()); onJoin({ cameraOn, micOn, videoDeviceId, audioDeviceId }); }}>
ENTER ROOM
<Icon name="arrow" />
</button>
</dialog>
  );
}
