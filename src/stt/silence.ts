import { createWavHeader } from "../audio/tones.js";

export interface AudioStats {
  durationMs: number;
  rms: number;
  maxSample: number;
  isSilent: boolean;
}

/**
 * Calculates RMS (root mean square) energy of 16-bit PCM samples in a WAV buffer.
 */
export function calculateAudioEnergy(wavBuffer: Buffer): AudioStats {
  if (wavBuffer.length <= 44) {
    return { durationMs: 0, rms: 0, maxSample: 0, isSilent: true };
  }

  const pcmBytes = wavBuffer.subarray(44);
  const sampleCount = Math.floor(pcmBytes.length / 2);
  if (sampleCount === 0) {
    return { durationMs: 0, rms: 0, maxSample: 0, isSilent: true };
  }

  let sumSquares = 0;
  let maxSample = 0;

  for (let i = 0; i < sampleCount; i++) {
    const sample = pcmBytes.readInt16LE(i * 2);
    sumSquares += sample * sample;
    const absVal = Math.abs(sample);
    if (absVal > maxSample) {
      maxSample = absVal;
    }
  }

  const rms = Math.sqrt(sumSquares / sampleCount);
  const sampleRate = wavBuffer.readUInt32LE(24) || 16000;
  const durationMs = Math.round((sampleCount / sampleRate) * 1000);

  // A typical speech threshold is RMS >= 300 (out of 32767)
  const isSilent = rms < 250;

  return {
    durationMs,
    rms: Math.round(rms),
    maxSample,
    isSilent,
  };
}

/**
 * Trims leading and trailing silent chunks from a 16-bit PCM WAV buffer.
 */
export function trimSilence(
  wavBuffer: Buffer,
  thresholdRms = 250,
  chunkMs = 50
): Buffer {
  if (wavBuffer.length <= 44) return wavBuffer;

  const sampleRate = wavBuffer.readUInt32LE(24) || 16000;
  const channels = wavBuffer.readUInt16LE(22) || 1;
  const bitDepth = wavBuffer.readUInt16LE(34) || 16;
  const pcmBytes = wavBuffer.subarray(44);

  const samplesPerChunk = Math.floor((sampleRate * chunkMs) / 1000);
  const bytesPerChunk = samplesPerChunk * 2;
  const totalChunks = Math.floor(pcmBytes.length / bytesPerChunk);

  if (totalChunks <= 2) return wavBuffer;

  let firstVoiceChunk = 0;
  let lastVoiceChunk = totalChunks - 1;

  // Find start
  for (let c = 0; c < totalChunks; c++) {
    const chunkStart = c * bytesPerChunk;
    const chunkEnd = chunkStart + bytesPerChunk;
    const sub = pcmBytes.subarray(chunkStart, chunkEnd);

    let sum = 0;
    for (let i = 0; i < samplesPerChunk; i++) {
      const s = sub.readInt16LE(i * 2);
      sum += s * s;
    }
    const rms = Math.sqrt(sum / samplesPerChunk);
    if (rms >= thresholdRms) {
      firstVoiceChunk = Math.max(0, c - 1); // keep 1 chunk headroom
      break;
    }
  }

  // Find end
  for (let c = totalChunks - 1; c >= 0; c--) {
    const chunkStart = c * bytesPerChunk;
    const chunkEnd = chunkStart + bytesPerChunk;
    const sub = pcmBytes.subarray(chunkStart, chunkEnd);

    let sum = 0;
    for (let i = 0; i < samplesPerChunk; i++) {
      const s = sub.readInt16LE(i * 2);
      sum += s * s;
    }
    const rms = Math.sqrt(sum / samplesPerChunk);
    if (rms >= thresholdRms) {
      lastVoiceChunk = Math.min(totalChunks - 1, c + 1); // keep 1 chunk headroom
      break;
    }
  }

  if (firstVoiceChunk >= lastVoiceChunk) {
    return wavBuffer;
  }

  const startByte = firstVoiceChunk * bytesPerChunk;
  const endByte = (lastVoiceChunk + 1) * bytesPerChunk;
  const trimmedPcm = pcmBytes.subarray(startByte, endByte);

  const header = createWavHeader(trimmedPcm.length, sampleRate, channels, bitDepth);
  return Buffer.concat([header, trimmedPcm]);
}
