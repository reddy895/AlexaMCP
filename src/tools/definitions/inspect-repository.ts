import { z } from "zod";
import path from "node:path";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import type { ToolDefinition } from "../registry.js";
import { getConfig } from "../../config/env.js";
import { PermissionDeniedError, NotFoundError } from "../../core/errors.js";

export const InspectRepositoryInputSchema = z.object({
  path: z.string().optional().default(".").describe("Relative sub-path within workspace to inspect."),
  depth: z.number().int().min(1).max(4).optional().default(2).describe("Depth of directory inspection."),
});

const BLOCKED_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".data",
  ".cache",
  ".ssh",
  ".gnupg",
]);

export function assertWithinWorkspace(targetPath: string, workspaceRoot: string): string {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedTarget = path.resolve(resolvedRoot, targetPath);

  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new PermissionDeniedError(
      `Access to path "${targetPath}" is forbidden: path traversal outside workspace root is not allowed.`
    );
  }

  return resolvedTarget;
}

export function inspectDirectoryTree(dirPath: string, currentDepth: number, maxDepth: number): any {
  if (currentDepth > maxDepth) return { truncated: true };

  const entries = readdirSync(dirPath, { withFileTypes: true });
  const children: Record<string, any> = {};

  for (const entry of entries) {
    if (BLOCKED_DIR_NAMES.has(entry.name) || entry.name.startsWith(".env")) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        children[entry.name] = inspectDirectoryTree(fullPath, currentDepth + 1, maxDepth);
      } else {
        const stats = statSync(fullPath);
        children[entry.name] = {
          type: "file",
          sizeBytes: stats.size,
          extension: path.extname(entry.name) || "none",
        };
      }
    } catch {
      // Ignore unreadable entries
    }
  }

  return children;
}

export const inspectRepositoryTool: ToolDefinition = {
  name: "inspect_repository",
  description:
    "Inspect the project workspace: directory structure, key files, dependencies, and configuration while strictly enforcing directory boundaries.",
  parameters: InspectRepositoryInputSchema,
  effectClass: "read_only",
  requiresConfirmation: false,
  execute: async (args: z.infer<typeof InspectRepositoryInputSchema>) => {
    const config = getConfig();
    const resolvedPath = assertWithinWorkspace(args.path, config.WORKSPACE_ROOT);

    if (!existsSync(resolvedPath)) {
      throw new NotFoundError(`Path "${args.path}" does not exist in workspace.`);
    }

    const isDir = statSync(resolvedPath).isDirectory();
    if (!isDir) {
      const stats = statSync(resolvedPath);
      return {
        path: args.path,
        type: "file",
        sizeBytes: stats.size,
      };
    }

    // Inspect package.json if present at workspace root
    let projectMetadata: Record<string, unknown> | null = null;
    const pkgPath = path.join(config.WORKSPACE_ROOT, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkgJson = JSON.parse(readFileSync(pkgPath, "utf-8"));
        projectMetadata = {
          name: pkgJson.name,
          version: pkgJson.version,
          scripts: Object.keys(pkgJson.scripts ?? {}),
          dependencies: Object.keys(pkgJson.dependencies ?? {}),
          devDependencies: Object.keys(pkgJson.devDependencies ?? {}),
        };
      } catch {
        // Ignore JSON parse errors in package.json
      }
    }

    const structure = inspectDirectoryTree(resolvedPath, 1, args.depth);

    return {
      workspacePath: args.path,
      projectMetadata,
      structure,
      summary: `Workspace inspected at "${args.path}" up to depth ${args.depth}.`,
    };
  },
};
