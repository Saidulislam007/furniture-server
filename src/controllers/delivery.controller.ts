import type { Request, Response } from "express";
import { collections } from "../data/collections.js";
import { toObjectId } from "../utils/objectId.js";
import { sendServerError } from "../utils/response.js";

export async function createDelivery(req: Request, res: Response): Promise<void> {
  try {
    if (!req.body) {
      res.status(400).json({ success: false, error: "Request body is missing" });
      return;
    }

    const {
      userId, userName, userEmail, phone, productId, title, price, quantity, subtotal,
      deliveryFee, total, image, color, shippingAddress, payment
    } = req.body;
    if (!userId || !productId) {
      res.status(400).json({ success: false, error: "Missing required fields: userId or productId" });
      return;
    }

    const result = await collections.deliveries.insertOne({
      userId: String(userId),
      userName: userName || "Guest",
      userEmail: userEmail || "No Email",
      productId: String(productId),
      title,
      price: Number(price) || 0,
      quantity: Math.max(1, Number(quantity) || 1),
      subtotal: Number(subtotal) || (Number(price) || 0) * Math.max(1, Number(quantity) || 1),
      deliveryFee: Number(deliveryFee) || 0,
      total: Number(total) || ((Number(price) || 0) * Math.max(1, Number(quantity) || 1) + (Number(deliveryFee) || 0)),
      image,
      color: color || "Default",
      phone: phone || "",
      shippingAddress: shippingAddress || null,
      payment: payment ? {
        method: payment.method || "unknown",
        paymentNumber: payment.paymentNumber || "",
        transactionId: payment.transactionId || "",
        bankName: payment.bankName || "",
        bankAccountId: payment.bankAccountId || "",
        accountHolder: payment.accountHolder || "",
        status: payment.status || "Submitted",
      } : null,
      status: "Pending",
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      message: "Delivery created successfully",
    });
  } catch (error) {
    console.error("❌ DELIVERY API ERROR:", error);
    sendServerError(res, error);
  }
}

export async function getAllDeliveries(_req: Request, res: Response): Promise<void> {
  try {
    const result = await collections.deliveries.find({}).toArray();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    sendServerError(res, error);
  }
}

export async function getDeliveriesByUserId(req: Request, res: Response): Promise<void> {
  try {
    const userId = String(req.params.userId || "");
    if (!userId) {
      res.status(400).json({ success: false, error: "User ID is required" });
      return;
    }

    const userDeliveries = await collections.deliveries.find({ userId }).toArray();
    res.status(200).json({
      success: true,
      count: userDeliveries.length,
      data: userDeliveries,
    });
  } catch (error) {
    console.error("❌ Deliveries GET Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during delivery retrieval.",
    });
  }
}

export async function updateDeliveryStatus(req: Request, res: Response): Promise<void> {
  try {
    const deliveryId = String(req.params.id);
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: "Status specification missing." });
      return;
    }

    const objectId = toObjectId(deliveryId);
    if (!objectId) {
      res.status(400).json({ success: false, error: "Invalid delivery node ID." });
      return;
    }

    const updateResult = await collections.deliveries.updateOne(
      { _id: objectId },
      { $set: { status, updatedAt: new Date() } },
    );

    if (updateResult.modifiedCount === 0) {
      res.status(404).json({ success: false, error: "Delivery node not found or state unchanged." });
      return;
    }
    res.status(200).json({ success: true, message: "Logistics pipeline state committed successfully." });
  } catch (error) {
    sendServerError(res, error);
  }
}
