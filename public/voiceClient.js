/**
 * Browser-side Voice Engine Client.
 * Bridges Web Speech API, Web Audio visualizer, and Digital Detective API.
 */

class VoiceClient {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.isMuted = false;

    this.onStateChange = null;
    this.onTranscript = null;
    this.onError = null;

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.isListening = true;
        this.playEarcon("listen_start");
        this.onStateChange?.("LISTENING");
      };

      this.recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const isFinal = event.results[event.results.length - 1].isFinal;
        this.onTranscript?.(transcript, isFinal);
      };

      this.recognition.onerror = (err) => {
        this.isListening = false;
        this.onStateChange?.("READY");
        this.onError?.(err);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.playEarcon("listen_stop");
        this.onStateChange?.("PROCESSING");
      };
    }
  }

  hasSpeechRecognition() {
    return this.recognition !== null;
  }

  startListening() {
    if (!this.recognition) return false;
    try {
      this.recognition.start();
      this.initVisualizer();
      return true;
    } catch {
      return false;
    }
  }

  stopListening() {
    if (!this.recognition || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch {}
  }

  async playEarcon(type) {
    try {
      const audio = new Audio(`/api/voice/earcon/${type}`);
      audio.volume = 0.35;
      await audio.play();
    } catch {
      // Audio playback might be blocked before first user gesture
    }
  }

  async speak(text, personaId = "alexa") {
    if (this.isMuted || !text) return;
    this.onStateChange?.("SPEAKING");

    // Try server-side neural TTS streaming first
    try {
      const resp = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, personaId }),
      });

      const contentType = resp.headers.get("content-type") || "";
      if (resp.ok && contentType.includes("audio/")) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            this.onStateChange?.("READY");
            resolve();
          };
          audio.onerror = () => {
            this.fallbackBrowserSpeech(text);
            resolve();
          };
          audio.play().catch(() => {
            this.fallbackBrowserSpeech(text);
            resolve();
          });
        });
      }
    } catch {}

    // Fallback to browser Web Speech API
    this.fallbackBrowserSpeech(text);
  }

  fallbackBrowserSpeech(text) {
    if (!window.speechSynthesis) {
      this.onStateChange?.("READY");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => this.onStateChange?.("READY");
    utterance.onerror = () => this.onStateChange?.("READY");
    window.speechSynthesis.speak(utterance);
  }

  async initVisualizer() {
    if (this.audioContext) return;
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
    } catch {
      // Mic access not granted or unavailable
    }
  }

  getAudioData() {
    if (!this.analyser) return null;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(buffer);
    return buffer;
  }
}

window.VoiceClient = VoiceClient;
