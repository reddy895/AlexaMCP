import { Router, Request, Response } from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultTTSEngine } from "../tts/ttsEngine.js";
import { defaultEarcons, EarconType } from "../audio/earcons.js";
import { classifyVoiceIntent } from "../dialogue/intentClassifier.js";
import { formatSpokenBriefing } from "../dialogue/spokenBriefing.js";
import { listVoicePersonas, getVoicePersona } from "../tts/voices.js";
import { defaultWhisperEngine } from "../stt/whisperEngine.js";

export function createVoiceApiRouter(): Router {
  const router = Router();

  // 1. Get voice subsystem status
  router.get("/status", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      tts: {
        activeBackend: defaultTTSEngine.getActiveBackendName(),
        availableBackends: defaultTTSEngine.getAvailableBackends(),
        isMuted: defaultTTSEngine.isMuted(),
        personas: listVoicePersonas(),
      },
      stt: {
        whisperAvailable: defaultWhisperEngine.isAvailable(),
        whisperModel: defaultWhisperEngine.getModelPath(),
      },
    });
  });

  // 2. Synthesize TTS speech
  router.post("/tts", async (req: Request, res: Response) => {
    const { text, personaId = "alexa", rate } = req.body ?? {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'text' field" });
    }

    const persona = getVoicePersona(personaId);
    const tmpFile = path.join(os.tmpdir(), `web-tts-${Date.now()}.mp3`);

    const edgeBackend = (defaultTTSEngine as any).backends?.find(
      (b: any) => b.name === "edge-tts"
    );

    if (edgeBackend && edgeBackend.isAvailable()) {
      const ok = await edgeBackend.synthesizeToFile(text, tmpFile, {
        voice: persona.edgeVoice,
        rate: rate ?? persona.rate,
      });

      if (ok && fs.existsSync(tmpFile)) {
        res.setHeader("Content-Type", "audio/mpeg");
        const stream = fs.createReadStream(tmpFile);
        stream.on("end", () => {
          try { fs.unlinkSync(tmpFile); } catch {}
        });
        return stream.pipe(res);
      }
    }

    // Fallback: indicate server spoken status
    res.json({
      ok: true,
      text,
      persona: persona.name,
      message: "Speech synthesized on server",
    });
  });

  // 3. Spoken briefing formatter
  router.post("/briefing", (req: Request, res: Response) => {
    const report = req.body ?? {};
    const style = req.query.style === "detailed" ? "detailed" : "concise";
    const spokenText = formatSpokenBriefing(report, { style });
    res.json({ ok: true, spokenText });
  });

  // 4. Intent classification
  router.post("/intent", (req: Request, res: Response) => {
    const { text = "", hasReport = false } = req.body ?? {};
    const classification = classifyVoiceIntent(String(text), Boolean(hasReport));
    res.json({ ok: true, classification });
  });

  // 5. Earcon audio streams
  router.get("/earcon/:type", (req: Request, res: Response) => {
    const type = req.params.type as EarconType;
    try {
      const wavBuf = defaultEarcons.getWavBuffer(type);
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", wavBuf.length);
      return res.send(wavBuf);
    } catch {
      return res.status(404).json({ error: `Earcon '${type}' not found` });
    }
  });

  return router;
}
