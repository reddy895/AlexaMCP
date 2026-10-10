/**
 * UI controller and dialogue state integration for Digital Detective Voice Assistant.
 */

document.addEventListener("DOMContentLoaded", () => {
  const voiceClient = new window.VoiceClient();

  // Elements
  const talkBtn = document.getElementById("talk-btn");
  const talkBtnLabel = document.getElementById("talk-btn-label");
  const muteBtn = document.getElementById("mute-btn");
  const voiceOrb = document.getElementById("voice-orb");
  const stateText = document.getElementById("current-state-text");
  const chatStream = document.getElementById("chat-stream");
  const personaSelect = document.getElementById("persona-select");
  const clearChatBtn = document.getElementById("clear-chat-btn");
  const canvas = document.getElementById("waveform-canvas");
  const ctx = canvas.getContext("2d");

  // Report elements
  const verdictBadge = document.getElementById("verdict-badge");
  const riskScoreValue = document.getElementById("risk-score-value");
  const riskMeterFill = document.getElementById("risk-meter-fill");
  const redFlagsContainer = document.getElementById("red-flags-container");
  const spokenBriefingText = document.getElementById("spoken-briefing-text");

  let isListening = false;
  let activePersona = personaSelect.value || "alexa";
  let lastReport = null;

  // Visualizer loop
  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = voiceClient.getAudioData();
    const width = canvas.width;
    const height = canvas.height;

    ctx.lineWidth = 2;
    ctx.strokeStyle = isListening ? "#f857a6" : "#00f2fe";
    ctx.beginPath();

    const sliceWidth = width / (data ? data.length : 32);
    let x = 0;

    for (let i = 0; i < (data ? data.length : 32); i++) {
      const v = data ? data[i] / 128.0 : Math.sin(Date.now() / 300 + i) * 0.2 + 1;
      const y = (v * height) / 2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }
  drawVisualizer();

  // Update State UI
  function updateState(state) {
    stateText.textContent = state;
    voiceOrb.className = "voice-orb";

    if (state === "LISTENING") {
      voiceOrb.classList.add("listening");
      talkBtn.classList.add("active");
      talkBtnLabel.textContent = "LISTENING... (TAP TO STOP)";
      isListening = true;
    } else if (state === "SPEAKING") {
      voiceOrb.classList.add("speaking");
      talkBtn.classList.remove("active");
      talkBtnLabel.textContent = "SPEAKING...";
      isListening = false;
    } else if (state === "PROCESSING") {
      talkBtn.classList.remove("active");
      talkBtnLabel.textContent = "INVESTIGATING...";
      isListening = false;
    } else {
      talkBtn.classList.remove("active");
      talkBtnLabel.textContent = "HOLD OR TAP TO TALK";
      isListening = false;
    }
  }

  voiceClient.onStateChange = updateState;

  // Add message bubble
  function addBubble(text, speaker = "agent") {
    const div = document.createElement("div");
    div.className = `chat-msg msg-${speaker}`;
    div.innerHTML = `
      <div class="msg-author">${speaker.toUpperCase()}</div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    `;
    chatStream.appendChild(div);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Handle User Input Submission
  async function processVoiceInput(transcript) {
    if (!transcript.trim()) return;
    addBubble(transcript, "user");
    updateState("PROCESSING");

    // 1. Check intent via API
    try {
      const intentResp = await fetch("/api/voice/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, hasReport: lastReport !== null }),
      });
      const { classification } = await intentResp.json();

      if (classification.intent === "CONTROL" && classification.entities?.targetVoice) {
        activePersona = classification.entities.targetVoice;
        personaSelect.value = activePersona;
      }

      // 2. Fetch spoken briefing / response
      const reportResp = await fetch("/api/voice/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastReport || {
          verdict: "SUSPICIOUS",
          riskScore: 65,
          redFlags: ["analyzing message signals", "verifying online reputation"],
          recommendation: "Always verify sender identity before sharing data.",
        }),
      });

      const { spokenText } = await reportResp.json();
      addBubble(spokenText, "agent");
      await voiceClient.speak(spokenText, activePersona);
    } catch (err) {
      const fallback = "I investigated your input. Always be cautious with unsolicited links and offers.";
      addBubble(fallback, "agent");
      await voiceClient.speak(fallback, activePersona);
    }

    updateState("READY");
  }

  voiceClient.onTranscript = (transcript, isFinal) => {
    if (isFinal && transcript.trim()) {
      processVoiceInput(transcript);
    }
  };

  // Button Listeners
  talkBtn.addEventListener("click", () => {
    if (isListening) {
      voiceClient.stopListening();
    } else {
      const started = voiceClient.startListening();
      if (!started) {
        // Fallback prompt if Web Speech API isn't allowed
        const text = prompt("Speak or type suspicious message/URL:");
        if (text) processVoiceInput(text);
      }
    }
  });

  muteBtn.addEventListener("click", () => {
    voiceClient.isMuted = !voiceClient.isMuted;
    muteBtn.innerHTML = voiceClient.isMuted ? "🔇" : "🔊";
  });

  personaSelect.addEventListener("change", (e) => {
    activePersona = e.target.value;
    voiceClient.speak(`Voice persona set to ${personaSelect.options[personaSelect.selectedIndex].text}`, activePersona);
  });

  clearChatBtn.addEventListener("click", () => {
    chatStream.innerHTML = "";
    addBubble("Conversation cleared. Ready for next query.", "agent");
  });

  // Spacebar to talk shortcut
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body && !isListening) {
      e.preventDefault();
      voiceClient.startListening();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" && isListening) {
      e.preventDefault();
      voiceClient.stopListening();
    }
  });
});
