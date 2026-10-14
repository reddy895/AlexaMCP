import path from "node:path";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { getConfig } from "../config/env.js";
import { PermissionDeniedError, InvalidInputError } from "../core/errors.js";

export const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".ts",
  ".js",
  ".yaml",
  ".yml",
]);

export const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB

export interface LoadedDocument {
  absolutePath: string;
  relativePath: string;
  content: string;
  sizeBytes: number;
  mimeType: string;
}

export function isFileAllowed(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);

  if (base.startsWith(".") || base.startsWith(".env")) {
    return false;
  }

  return ALLOWED_EXTENSIONS.has(ext);
}

export function loadDocumentsFromDirectory(
  targetDir: string,
  workspaceRoot: string
): LoadedDocument[] {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedDir = path.resolve(resolvedRoot, targetDir);

  if (!resolvedDir.startsWith(resolvedRoot)) {
    throw new PermissionDeniedError(
      `Access to directory "${targetDir}" is forbidden: path traversal outside workspace root.`
    );
  }

  if (!existsSync(resolvedDir)) {
    return [];
  }

  const loaded: LoadedDocument[] = [];

  function scan(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "build") {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && isFileAllowed(fullPath)) {
        try {
          const stats = statSync(fullPath);
          if (stats.size > MAX_FILE_SIZE_BYTES) {
            continue; // Skip oversized files
          }

          const content = readFileSync(fullPath, "utf-8");
          const relPath = path.relative(resolvedRoot, fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const mimeType = ext === ".json" ? "application/json" : "text/plain";

          loaded.push({
            absolutePath: fullPath,
            relativePath: relPath,
            content,
            sizeBytes: stats.size,
            mimeType,
          });
        } catch {
          // Ignore unreadable files
        }
      }
    }
  }

  scan(resolvedDir);
  return loaded;
}

export function loadApprovedDocuments(): LoadedDocument[] {
  const config = getConfig();
  const approvedDirs = config.APPROVED_DOCS_DIRS.split(",").map((d) => d.trim());
  const allDocs: LoadedDocument[] = [];

  for (const dir of approvedDirs) {
    if (dir) {
      allDocs.push(...loadDocumentsFromDirectory(dir, config.WORKSPACE_ROOT));
    }
  }

  return allDocs;
}
