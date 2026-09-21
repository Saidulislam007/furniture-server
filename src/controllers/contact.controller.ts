import type { Request, Response } from "express";
import { collections } from "../data/collections.js";
import { sendServerError } from "../utils/response.js";

export async function createContactMessage(req: Request, res: Response): Promise<void> {
  try {
    const contactPayload = req.body;
    if (!contactPayload.name || !contactPayload.email || !contactPayload.subject || !contactPayload.message) {
      res.status(400).json({
        success: false,
        error: "Missing required contact specification fields.",
      });
      return;
    }

    await collections.contactMessages.insertOne({
      name: contactPayload.name,
      email: contactPayload.email,
      phone: contactPayload.phone,
      subject: contactPayload.subject,
      message: contactPayload.message,
      status: "Unread",
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Message transmitted and ledger record deployed successfully.",
    });
  } catch (error) {
    console.error("❌ Critical failure in contact post pipeline:", error);
    sendServerError(res, error);
  }
}

export async function getAllContactMessages(_req: Request, res: Response): Promise<void> {
  try {
    const messages = await collections.contactMessages.find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("❌ Failed to pull contact ledger logs:", error);
    sendServerError(res, error);
  }
}
