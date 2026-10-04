const MAX_BASE64_LENGTH = 8_000_000;

function getOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;

    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part?.text === "string") {
        const text = part.text.trim();
        if (text) return text;
      }
    }
  }

  return "";
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      code: "OPENAI_API_KEY_MISSING",
      error: "FX voice backend is waiting for OPENAI_API_KEY.",
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const audioBase64 = String(body.audioBase64 || "");
    const mimeType = String(body.mimeType || "audio/mp4");
    const fileName = String(body.fileName || "fx-voice.m4a");
    const language = String(body.language || "").trim();

    if (!audioBase64) {
      return res.status(400).json({
        ok: false,
        error: "Audio is required.",
      });
    }

    if (audioBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({
        ok: false,
        error: "Audio sample is too large.",
      });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");

    if (!audioBuffer.length) {
      return res.status(400).json({
        ok: false,
        error: "Audio sample is empty.",
      });
    }

    const transcriptForm = new FormData();
    transcriptForm.append(
      "file",
      new Blob([audioBuffer], { type: mimeType }),
      fileName.includes(".") ? fileName : "fx-voice.m4a"
    );
    transcriptForm.append(
      "model",
      process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe"
    );

    if (language) {
      transcriptForm.append("language", language);
    }

    const transcriptionResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: transcriptForm,
      }
    );

    const transcriptionPayload = await transcriptionResponse.json().catch(() => ({}));

    if (!transcriptionResponse.ok) {
      console.error("[api/fx-voice] transcription", {
        status: transcriptionResponse.status,
        error: transcriptionPayload?.error?.message || "unknown",
        ip: getClientIp(req),
      });

      return res.status(502).json({
        ok: false,
        stage: "transcription",
        error:
          transcriptionPayload?.error?.message ||
          "FX could not transcribe this audio.",
      });
    }

    const transcript = String(transcriptionPayload?.text || "").trim();

    if (!transcript) {
      return res.status(422).json({
        ok: false,
        stage: "transcription",
        error: "No speech was detected.",
      });
    }

    const responsePayload = {
      model: process.env.OPENAI_FX_MODEL || "gpt-6-luna",
      instructions:
        "You are FX, pronounced F-X, a personal mobile voice assistant. " +
        "Reply in the same language as the user. Be concise, natural and useful for spoken output. " +
        "Prefer 1 to 3 short sentences. Do not mention transcription, models, APIs or internal reasoning. " +
        "If the request is ambiguous, ask one brief clarifying question.",
      input: transcript,
      reasoning: {
        effort: "none",
      },
      text: {
        verbosity: "low",
      },
      max_output_tokens: 180,
      store: false,
    };

    const responseRequest = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(responsePayload),
    });

    const responseJson = await responseRequest.json().catch(() => ({}));
    const reply = getOutputText(responseJson);

    if (!responseRequest.ok || !reply) {
      console.error("[api/fx-voice] response", {
        status: responseRequest.status,
        error: responseJson?.error?.message || "empty reply",
        ip: getClientIp(req),
      });

      return res.status(200).json({
        ok: true,
        transcript,
        reply: `Te escuché: ${transcript}`,
        degraded: true,
      });
    }

    return res.status(200).json({
      ok: true,
      transcript,
      reply,
      transcriptionModel:
        process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
      responseModel: process.env.OPENAI_FX_MODEL || "gpt-6-luna",
    });
  } catch (error) {
    console.error("[api/fx-voice]", error);

    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "FX voice backend failed.",
    });
  }
}
