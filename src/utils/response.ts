import type { Response } from "express";

export function sendServerError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : "Internal Server Error";
  res.status(500).json({ success: false, error: message });
}
