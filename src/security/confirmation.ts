import { createHmac, randomUUID } from "node:crypto";
import { ConfirmationRequiredError, PermissionDeniedError } from "../core/errors.js";
import type { ProposedAction, ExecutionContext } from "../core/types.js";

const CONFIRMATION_SECRET = process.env.CONFIRMATION_SECRET || "alexa-mcp-internal-action-key";

export type ToolEffectClass = "read_only" | "locally_mutating" | "externally_consequential";

export interface PendingActionRecord {
  id: string;
  actionId: string;
  resource: string;
  description: string;
  payload: Record<string, unknown>;
  token: string;
  expiresAt: number;
}

export class ConfirmationManager {
  private pending = new Map<string, PendingActionRecord>();

  public createPendingAction(
    actionId: string,
    resource: string,
    description: string,
    payload: Record<string, unknown>,
    ttlMs = 300_000
  ): PendingActionRecord {
    const id = `act_${randomUUID()}`;
    const token = generateConfirmationToken(actionId, resource);
    const record: PendingActionRecord = {
      id,
      actionId,
      resource,
      description,
      payload,
      token,
      expiresAt: Date.now() + ttlMs,
    };

    this.pending.set(token, record);
    return record;
  }

  public validateAndConsume(token: string, actionId: string, resource: string): PendingActionRecord {
    const record = this.pending.get(token);
    if (!record) {
      if (!verifyConfirmationToken(token, actionId, resource)) {
        throw new PermissionDeniedError("Invalid or forged confirmation token.");
      }
      return {
        id: "stateless",
        actionId,
        resource,
        description: "Stateless action",
        payload: {},
        token,
        expiresAt: Date.now() + 60_000,
      };
    }

    if (Date.now() > record.expiresAt) {
      this.pending.delete(token);
      throw new PermissionDeniedError("Action confirmation has expired. Please re-initiate the request.");
    }

    if (record.actionId !== actionId || record.resource !== resource) {
      throw new PermissionDeniedError("Confirmation token mismatch for the intended action or resource.");
    }

    this.pending.delete(token);
    return record;
  }
}

export const confirmationManager = new ConfirmationManager();

export function generateConfirmationToken(actionId: string, resource: string): string {
  return createHmac("sha256", CONFIRMATION_SECRET)
    .update(`${actionId}:${resource}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyConfirmationToken(token: string, actionId: string, resource: string): boolean {
  if (!token) return false;
  const expected = generateConfirmationToken(actionId, resource);
  return token === expected;
}

export function assertActionConfirmed(
  action: ProposedAction,
  context: ExecutionContext
): void {
  if (!action.requiresConfirmation) {
    return;
  }

  const token = context.confirmationToken;
  if (!token) {
    const pending = confirmationManager.createPendingAction(
      action.actionId,
      action.resource,
      action.description,
      action.payload
    );

    throw new ConfirmationRequiredError(
      `Action "${action.description}" affecting resource "${action.resource}" requires explicit confirmation before execution.`,
      {
        actionId: pending.actionId,
        resource: pending.resource,
        confirmationToken: pending.token,
        expiresAt: new Date(pending.expiresAt).toISOString(),
      }
    );
  }

  confirmationManager.validateAndConsume(token, action.actionId, action.resource);
}
