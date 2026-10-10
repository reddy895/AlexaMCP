import { TTSBackendType } from "./types.js";

export interface VoicePersona {
  id: string;
  name: string;
  description: string;
  edgeVoice: string;
  spdVoice: string;
  rate: string;
  pitch: string;
}

export const VOICE_PERSONAS: Record<string, VoicePersona> = {
  alexa: {
    id: "alexa",
    name: "Alexa Detective",
    description: "Crisp, balanced, clear natural assistant tone",
    edgeVoice: "en-US-AriaNeural",
    spdVoice: "female1",
    rate: "+0%",
    pitch: "+0Hz",
  },
  detective: {
    id: "detective",
    name: "Cyber Detective",
    description: "Sharp, authoritative investigative voice",
    edgeVoice: "en-US-GuyNeural",
    spdVoice: "male1",
    rate: "+5%",
    pitch: "-2Hz",
  },
  forensics: {
    id: "forensics",
    name: "Forensics Specialist",
    description: "Deep, calm, highly technical analytical voice",
    edgeVoice: "en-US-ChristopherNeural",
    spdVoice: "male2",
    rate: "-2%",
    pitch: "-5Hz",
  },
  advisor: {
    id: "advisor",
    name: "Security Advisor",
    description: "Warm, supportive, protective advisory voice",
    edgeVoice: "en-IN-NeerjaNeural",
    spdVoice: "female2",
    rate: "+0%",
    pitch: "+0Hz",
  },
};

export function getVoicePersona(id = "alexa"): VoicePersona {
  const normalized = id.toLowerCase().trim();
  return VOICE_PERSONAS[normalized] ?? VOICE_PERSONAS.alexa;
}

export function listVoicePersonas(): VoicePersona[] {
  return Object.values(VOICE_PERSONAS);
}

export function resolveVoiceForBackend(personaId: string, backend: TTSBackendType): string {
  const persona = getVoicePersona(personaId);
  switch (backend) {
    case "edge-tts":
      return persona.edgeVoice;
    case "spd-say":
      return persona.spdVoice;
    default:
      return persona.edgeVoice;
  }
}
