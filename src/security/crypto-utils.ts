import { createHash, timingSafeEqual, createHmac } from "node:crypto";

export function constantTimeSecretEqual(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;

  // Hash both inputs to fixed length 32-byte buffers to prevent length leakage
  const hashA = createHash("sha256").update(provided).digest();
  const hashB = createHash("sha256").update(expected).digest();

  return timingSafeEqual(hashA, hashB);
}

export function computeHmacSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacSignature(signature: string, payload: string, secret: string): boolean {
  const expected = computeHmacSignature(payload, secret);
  return constantTimeSecretEqual(signature, expected);
}
