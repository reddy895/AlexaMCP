export interface SmalltalkResult {
  handled: boolean;
  speechResponse: string;
}

export function handleSmalltalk(text: string): SmalltalkResult {
  const lower = text.toLowerCase().trim();

  // Greetings
  if (/^(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(lower)) {
    return {
      handled: true,
      speechResponse:
        "Hello! I am Digital Detective, your voice-activated fraud investigation assistant. Read or paste any suspicious message, job offer, or web link, and I will investigate it for you.",
    };
  }

  // Identity & capabilities
  if (/\b(who are you|what is your name|what can you do|tell me about yourself)\b/i.test(lower)) {
    return {
      handled: true,
      speechResponse:
        "I am Digital Detective, an autonomous scam detection agent built on the Model Context Protocol. I inspect suspicious URLs with SSRF protection, search live web evidence, analyze red flags, and calculate calibrated risk scores to protect you from fraud.",
    };
  }

  // How does this work
  if (/\b(how does this work|how do you work)\b/i.test(lower)) {
    return {
      handled: true,
      speechResponse:
        "When you speak a suspicious message, I break down factual claims, examine URLs for spoofing, cross-reference live threat databases, and score overall risk so you never get tricked.",
    };
  }

  // Gratitude
  if (/\b(thanks|thank you|awesome|great job)\b/i.test(lower)) {
    return {
      handled: true,
      speechResponse:
        "You are very welcome! Stay alert and always verify before you trust.",
    };
  }

  // Educational security queries
  if (/\b(ssrf|server side request forgery)\b/i.test(lower)) {
    return {
      handled: true,
      speechResponse:
        "SSRF, or Server Side Request Forgery, is a security vulnerability where an attacker tricks a server into accessing internal network resources. I protect against SSRF by validating domains and blocking internal IP ranges before inspecting any web page.",
    };
  }

  if (/\b(advance fee|upfront fee|registration fee)\b/i.test(lower)) {
    return {
      handled: true,
      speechResponse:
        "Legitimate employers never demand upfront registration or training fees before hiring. Upfront fee demands are one of the most reliable indicators of employment scams.",
    };
  }

  return {
    handled: false,
    speechResponse: "",
  };
}
