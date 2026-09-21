import type { Request, Response } from "express";
import type { Document, Filter } from "mongodb";
import { collections } from "../data/collections.js";
import type { FurniturePayload } from "../data/types.js";
import { toObjectId } from "../utils/objectId.js";
import { sendServerError } from "../utils/response.js";

export async function createFurniture(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as FurniturePayload;
    if (!payload.title || !payload.price || !payload.category) {
      res.status(400).json({ success: false, error: "Missing validated structural attributes." });
      return;
    }

    await collections.furniture.insertOne({
      title: payload.title,
      price: Number(payload.price),
      oldPrice: payload.oldPrice ? Number(payload.oldPrice) : null,
      deliveryFee: Number(payload.deliveryFee || 0),
      category: payload.category,
      subCategory: payload.subCategory,
      stock: Number(payload.stock || 0),
      material: payload.material,
      warranty: payload.warranty,
      description: payload.description,
      image: payload.image,
      dimensions: payload.dimensions,
      colors: payload.colors || [],
      status: "Pending",
      managerId: payload.managerId,
      managerEmail: payload.managerEmail,
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, message: "Asset specification committed successfully." });
  } catch (error) {
    sendServerError(res, error);
  }
}

export async function getAllFurniture(_req: Request, res: Response): Promise<void> {
  try {
    const result = await collections.furniture.find({}).sort({ _id: -1 }).toArray();
    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    sendServerError(res, error);
  }
}


export async function getFurnitureById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const objectId = toObjectId(id);
    if (!objectId) {
      res.status(400).json({ success: false, error: "Invalid product specification node ID." });
      return;
    }

    const singleProduct = await collections.furniture.findOne({ _id: objectId });
    if (!singleProduct) {
      res.status(404).json({ success: false, error: "Target asset record not found." });
      return;
    }

    res.status(200).json({ success: true, data: singleProduct });
  } catch (error) {
    console.error("❌ Failed to fetch single furniture node:", error);
    sendServerError(res, error);
  }
}

export async function deleteFurniture(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const objectId = toObjectId(id);
    if (!objectId) {
      res.status(400).json({ success: false, error: "Invalid product specification node ID." });
      return;
    }

    const result = await collections.furniture.deleteOne({ _id: objectId });
    if (result.deletedCount === 1) {
      res.status(200).json({ success: true, message: "Asset purged successfully." });
      return;
    }
    res.status(404).json({ success: false, error: "Asset node not found." });
  } catch (error) {
    sendServerError(res, error);
  }
}

export async function updateFurniture(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const updatedData = { ...req.body } as Record<string, unknown>;
    if (!id) {
      res.status(400).json({ success: false, error: "Product node ID is required." });
      return;
    }
    if (Object.keys(updatedData).length === 0) {
      res.status(400).json({ success: false, error: "Update payload matrix cannot be empty." });
      return;
    }

    delete updatedData._id;
    if (updatedData.price !== undefined) updatedData.price = Number(updatedData.price);
    if (updatedData.deliveryFee !== undefined) updatedData.deliveryFee = Number(updatedData.deliveryFee);
    if (updatedData.stock !== undefined) updatedData.stock = Number(updatedData.stock);

    const objectId = toObjectId(id);
    const queryTarget: Filter<Document> = objectId
      ? { _id: objectId }
      : ({ _id: id } as unknown as Filter<Document>);
    const result = await collections.furniture.updateOne(queryTarget, { $set: updatedData });

    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, error: "Target asset record not found in central registry." });
      return;
    }
    res.status(200).json({ success: true, message: "Asset updated successfully." });
  } catch (error) {
    console.error("❌ Critical failure in furniture TS PATCH pipeline:", error);
    sendServerError(res, error);
  }
}
