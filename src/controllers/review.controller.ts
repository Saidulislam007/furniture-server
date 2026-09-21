import type { Request, Response } from "express";
import { collections } from "../data/collections.js";
import { sendServerError } from "../utils/response.js";

export async function getAllReviews(_req: Request, res: Response): Promise<void> {
  try {
    const allReviews = await collections.reviews.find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, data: allReviews });
  } catch (error) {
    console.error("❌ Failed to pull universal review archives:", error);
    sendServerError(res, error);
  }
}

export async function createReview(req: Request, res: Response): Promise<void> {
  try {
    const reviewPayload = req.body;
    const finalProductId = typeof reviewPayload.productId === "object"
      ? reviewPayload.productId.$oid || reviewPayload.productId.toString()
      : reviewPayload.productId;

    await collections.reviews.insertOne({
      userId: reviewPayload.userId,
      userEmail: reviewPayload.userEmail || "N/A",
      userName: reviewPayload.userName || "Anonymous User",
      productId: finalProductId,
      productName: reviewPayload.productName || "Curated Asset Architecture",
      rating: Number(reviewPayload.rating),
      comment: reviewPayload.comment.trim(),
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, message: "Review deployed successfully." });
  } catch (error) {
    sendServerError(res, error);
  }
}

export async function getReviewsByProductId(req: Request, res: Response): Promise<void> {
  try {
    const productId = String(req.params.productId);
    const productReviews = await collections.reviews
      .find({ productId })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json({ success: true, data: productReviews });
  } catch (error) {
    sendServerError(res, error);
  }
}
