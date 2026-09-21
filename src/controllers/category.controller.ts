import type { Request, Response } from "express";
import type { Filter, Document } from "mongodb";
import { collections } from "../data/collections.js";
import { toObjectId } from "../utils/objectId.js";
import { sendServerError } from "../utils/response.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getCategoryProducts(req: Request, res: Response): Promise<void> {
  try {
    const categorySlug = String(req.params.category || "").toLowerCase().trim();

    if (!categorySlug) {
      res.status(400).json({ success: false, error: "Category slug is required." });
      return;
    }

    const readableCategory = categorySlug.replace(/-/g, " ");
    const exactCategoryRegex = new RegExp(`^${escapeRegExp(readableCategory)}$`, "i");

    // Category products live only in the `categories` collection.
    // Support categorySlug plus common imported JSON field names so direct
    // MongoDB imports work without changing the shop `furniture` collection.
    const query: Filter<Document> = {
      $or: [
        { categorySlug },
        { slug: categorySlug },
        { category: exactCategoryRegex },
        { subCategory: exactCategoryRegex },
      ],
    };

    const result = await collections.categories
      .find(query)
      .sort({ createdAt: 1, _id: 1 })
      .toArray();

    res.status(200).json({
      success: true,
      category: categorySlug,
      count: result.length,
      data: result,
    });
  } catch (error) {
    sendServerError(res, error);
  }
}

export async function getCategoryProductById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || "");
    const objectId = toObjectId(id);

    if (!objectId) {
      res.status(400).json({ success: false, error: "Invalid category product ID." });
      return;
    }

    const product = await collections.categories.findOne({ _id: objectId });

    if (!product) {
      res.status(404).json({ success: false, error: "Category product not found." });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    sendServerError(res, error);
  }
}
