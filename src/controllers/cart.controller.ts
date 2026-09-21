import type { Request, Response } from "express";
import { collections } from "../data/collections.js";

export async function createCartItem(req: Request, res: Response): Promise<void> {
  try {
    const { userId, productId, title, price, image, color, userName, userEmail } = req.body;
    if (!userId || !productId) {
      res.status(400).json({ success: false, error: "Missing required fields (userId, productId)" });
      return;
    }

    const existingItem = await collections.cart.findOne({ userId, productId });
    if (existingItem) {
      res.status(409).json({ success: false, error: "This product is already in your cart matrix." });
      return;
    }

    const result = await collections.cart.insertOne({
      userId,
      userName,
      userEmail,
      productId,
      title,
      price: Number(price),
      image,
      color,
      addedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Asset committed to cart node successfully.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("❌ Cart POST Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during cart synchronization.",
    });
  }
}

export async function getCartByUserId(req: Request, res: Response): Promise<void> {
  try {
    const result = await collections.cart.find({ userId: req.params.userId }).toArray();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    res.status(500).json({ success: false, error: message });
  }
}
