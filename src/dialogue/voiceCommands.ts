import { VoiceIntentClassification } from "./intentClassifier.js";
import { getVoicePersona, listVoicePersonas } from "../tts/voices.js";

export interface VoiceCommandResult {
  handled: boolean;
  speechResponse: string;
  action?: "mute" | "unmute" | "change_voice" | "help" | "exit";
  payload?: any;
}

export function handleVoiceCommand(
  classification: VoiceIntentClassification
): VoiceCommandResult {
  const text = classification.cleanedText.toLowerCase();

  // Mute command
  if (/\b(mute|be quiet|stop talking|silence)\b/i.test(text)) {
    return {
      handled: true,
      speechResponse: "Voice output muted. You can say unmute at any time.",
      action: "mute",
    };
  }

  // Unmute command
  if (/\b(unmute|speak again|turn voice on)\b/i.test(text)) {
    return {
      handled: true,
      speechResponse: "Voice output restored. I am listening.",
      action: "unmute",
    };
  }

  // Change voice persona
  if (classification.entities.targetVoice || /\b(switch voice|change voice|set voice)\b/i.test(text)) {
    const target = classification.entities.targetVoice || "alexa";
    const persona = getVoicePersona(target);
    return {
      handled: true,
      speechResponse: `Voice persona switched to ${persona.name}. How can I assist your investigation?`,
      action: "change_voice",
      payload: { personaId: persona.id },
    };
  }

  // Help command
  if (/\b(help|commands|what can i say)\b/i.test(text)) {
    const personas = listVoicePersonas().map(p => p.id).join(", ");
    return {
      handled: true,
      speechResponse: `You can speak any suspicious message, email, or web link to investigate. You can also say repeat that, mute, unmute, switch voice to ${personas}, or say goodbye to exit.`,
      action: "help",
    };
  }

  return {
    handled: false,
    speechResponse: "",
  };
}
