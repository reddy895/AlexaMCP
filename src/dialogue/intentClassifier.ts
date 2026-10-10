export type VoiceIntentType =
  | "INVESTIGATE"
  | "CONTROL"
  | "SMALLTALK"
  | "EXPLAIN"
  | "EXIT"
  | "REPEAT"
  | "UNKNOWN";

export interface VoiceIntentClassification {
  intent: VoiceIntentType;
  confidence: number;
  entities: {
    command?: string;
    targetVoice?: string;
    extractedUrls?: string[];
  };
  cleanedText: string;
}

export function classifyVoiceIntent(
  text: string,
  hasPreviousReport = false
): VoiceIntentClassification {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      intent: "UNKNOWN",
      confidence: 0,
      entities: {},
      cleanedText: "",
    };
  }

  // 1. Check for EXIT commands
  if (/^(exit|quit|bye|goodbye|stop listening|shutdown|see you)\b/i.test(lower)) {
    return {
      intent: "EXIT",
      confidence: 1.0,
      entities: {},
      cleanedText: trimmed,
    };
  }

  // 2. Check for REPEAT commands
  if (/^(repeat|say again|can you repeat|what did you say|say that again)\b/i.test(lower)) {
    return {
      intent: "REPEAT",
      confidence: 0.95,
      entities: {},
      cleanedText: trimmed,
    };
  }

  // 3. Check for voice CONTROL commands
  if (
    /^(mute|unmute|be quiet|stop talking|cancel|pause)\b/i.test(lower) ||
    /^(change voice|set voice|switch voice)\b/i.test(lower) ||
    /^(volume up|volume down|louder|softer)\b/i.test(lower)
  ) {
    let targetVoice: string | undefined;
    const voiceMatch = lower.match(/(?:to|voice)\s+(alexa|detective|forensics|advisor)/i);
    if (voiceMatch) {
      targetVoice = voiceMatch[1];
    }
    return {
      intent: "CONTROL",
      confidence: 0.9,
      entities: {
        command: lower,
        targetVoice,
      },
      cleanedText: trimmed,
    };
  }

  // 4. Check for SMALLTALK & capabilities questions
  if (
    /^(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(lower) ||
    /^(who are you|what is your name|what can you do|how does this work|help|tell me about yourself)\b/i.test(lower) ||
    /^(thanks|thank you|awesome|great job|cool)\b/i.test(lower)
  ) {
    return {
      intent: "SMALLTALK",
      confidence: 0.9,
      entities: {},
      cleanedText: trimmed,
    };
  }

  // 5. Check for EXPLAIN / follow-up on previous report
  if (
    hasPreviousReport &&
    (/^(why|how come|what does that mean|explain|tell me more|what should i do|what next|why is it high risk|why is it safe)\b/i.test(lower) ||
      /^(who is the sender|tell me about the url|what evidence)\b/i.test(lower))
  ) {
    return {
      intent: "EXPLAIN",
      confidence: 0.85,
      entities: {},
      cleanedText: trimmed,
    };
  }

  // 6. Default to INVESTIGATE for suspicious messages, URLs, or explicit check prompts
  return {
    intent: "INVESTIGATE",
    confidence: 0.8,
    entities: {},
    cleanedText: trimmed,
  };
}
