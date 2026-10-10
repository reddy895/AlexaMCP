/**
 * Zero-dependency PCM Tone & WAV Audio Generator.
 * Used to generate clean auditory earcons (chimes, beeps, alerts)
 * for interactive voice agent feedback.
 */

export interface ToneOptions {
  sampleRate?: number;
  volume?: number; // 0.0 to 1.0
  fadeInMs?: number;
  fadeOutMs?: number;
}

/**
 * Creates a standard 44-byte RIFF WAV header for 16-bit PCM audio.
 */
export function createWavHeader(
  dataByteLength: number,
  sampleRate = 16000,
  channels = 1,
  bitDepth = 16
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;

  // RIFF chunk descriptor
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataByteLength, 4);
  header.write("WAVE", 8);

  // "fmt " sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);

  // "data" sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataByteLength, 40);

  return header;
}

/**
 * Generates a pure sine wave tone with envelope ramp to prevent clicks.
 */
export function generateTone(
  freqHz: number,
  durationMs: number,
  opts: ToneOptions = {}
): Buffer {
  const sampleRate = opts.sampleRate ?? 16000;
  const volume = Math.max(0, Math.min(1, opts.volume ?? 0.5));
  const fadeInMs = opts.fadeInMs ?? 10;
  const fadeOutMs = opts.fadeOutMs ?? 15;

  const totalSamples = Math.floor((sampleRate * durationMs) / 1000);
  const fadeInSamples = Math.floor((sampleRate * fadeInMs) / 1000);
  const fadeOutSamples = Math.floor((sampleRate * fadeOutMs) / 1000);

  const pcmBytes = Buffer.alloc(totalSamples * 2);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let amplitude = volume * Math.sin(2 * Math.PI * freqHz * t);

    // Apply smooth envelope ramp
    if (i < fadeInSamples && fadeInSamples > 0) {
      amplitude *= i / fadeInSamples;
    } else if (i > totalSamples - fadeOutSamples && fadeOutSamples > 0) {
      amplitude *= (totalSamples - i) / fadeOutSamples;
    }

    // Convert to signed 16-bit integer (-32768 to 32767)
    const sampleVal = Math.round(amplitude * 32767);
    const clamped = Math.max(-32768, Math.min(32767, sampleVal));
    pcmBytes.writeInt16LE(clamped, i * 2);
  }

  const header = createWavHeader(pcmBytes.length, sampleRate, 1, 16);
  return Buffer.concat([header, pcmBytes]);
}

/**
 * Generates a multi-step melodic chime by sequencing frequencies.
 */
export function generateMelody(
  notes: Array<{ freqHz: number; durationMs: number }>,
  opts: ToneOptions = {}
): Buffer {
  const buffers: Buffer[] = [];
  const sampleRate = opts.sampleRate ?? 16000;

  for (const note of notes) {
    const toneWav = generateTone(note.freqHz, note.durationMs, {
      ...opts,
      sampleRate,
    });
    // Strip header to concatenate raw PCM
    buffers.push(toneWav.subarray(44));
  }

  const combinedPcm = Buffer.concat(buffers);
  const header = createWavHeader(combinedPcm.length, sampleRate, 1, 16);
  return Buffer.concat([header, combinedPcm]);
}
