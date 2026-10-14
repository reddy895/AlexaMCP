import path from "node:path";
import { getConfig } from "../config/env.js";
import { PermissionDeniedError, InvalidInputError } from "../core/errors.js";

const BLOCKED_FILE_PREFIXES = [".env", "id_rsa", "id_ecdsa", "id_ed25519"];

export function assertSafeWorkspacePath(
  rawPath: string,
  allowedSubdirs?: string[]
): string {
  if (!rawPath || typeof rawPath !== "string") {
    throw new InvalidInputError("Path must be a non-empty string.");
  }

  // Check for null bytes or URI encoded traversal tricks
  if (rawPath.includes("\0") || /%2e%2e/i.test(rawPath)) {
    throw new PermissionDeniedError("Forbidden characters detected in path specification.");
  }

  const config = getConfig();
  const root = path.resolve(config.WORKSPACE_ROOT);
  const resolved = path.resolve(root, rawPath);

  // Must start with root directory
  if (!resolved.startsWith(root)) {
    throw new PermissionDeniedError(
      `Path traversal denied: "${rawPath}" escapes workspace root "${root}".`
    );
  }

  // Check against sensitive file patterns
  const baseName = path.basename(resolved);
  if (BLOCKED_FILE_PREFIXES.some((prefix) => baseName.startsWith(prefix))) {
    throw new PermissionDeniedError(`Access to sensitive configuration file "${baseName}" is forbidden.`);
  }

  // If subdirectories are specified, ensure path resides in one of them
  if (allowedSubdirs && allowedSubdirs.length > 0) {
    const rel = path.relative(root, resolved);
    const inAllowed = allowedSubdirs.some((sub) => rel === sub || rel.startsWith(`${sub}${path.sep}`));
    if (!inAllowed) {
      throw new PermissionDeniedError(
        `Access to path "${rawPath}" is restricted. Allowed directories: ${allowedSubdirs.join(", ")}`
      );
    }
  }

  return resolved;
}
