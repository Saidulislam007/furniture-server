import type { Request, Response } from "express";
import { collections } from "../data/collections.js";
import { toObjectId } from "../utils/objectId.js";
import { sendServerError } from "../utils/response.js";

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = String(req.params.id).trim();
    const { name, email, image, role } = req.body;
    const objectId = toObjectId(userId);

    if (!objectId) {
      res.status(404).json({ success: false, error: "User profile identity not found." });
      return;
    }

    const dbUserSnapshot = await collections.users.findOne({ _id: objectId });
    if (!dbUserSnapshot) {
      res.status(404).json({ success: false, error: "User profile identity not found." });
      return;
    }

    const dbOldEmail = dbUserSnapshot.email;
    const dbOldName = dbUserSnapshot.name;
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };

    if (name) updateSet.name = String(name).trim();
    if (email) updateSet.email = String(email).trim().toLowerCase();
    if (image !== undefined) updateSet.image = image;
    if (role) updateSet.role = role;

    const updateResult = await collections.users.updateOne(
      { _id: dbUserSnapshot._id },
      { $set: updateSet },
    );

    if (updateResult.matchedCount === 0) {
      res.status(404).json({ success: false, error: "User not found during update!" });
      return;
    }

    if (name || email) {
      const subCollectionFilter = {
        $or: [
          { userId },
          { userEmail: dbOldEmail },
          { userName: dbOldName },
        ],
      };
      const updatePayload = {
        $set: {
          userName: name ? String(name).trim() : dbOldName,
          userEmail: email ? String(email).trim().toLowerCase() : dbOldEmail,
        },
      };

      await Promise.all([
        collections.reviews.updateMany(subCollectionFilter, updatePayload),
        collections.deliveries.updateMany(subCollectionFilter, updatePayload),
        collections.cart.updateMany(subCollectionFilter, updatePayload),
      ]);
    }

    res.status(200).json({ success: true, message: "Profile and role synchronized." });
  } catch (error) {
    console.error("❌ PATCH Error:", error);
    sendServerError(res, error);
  }
}

export async function getAllUsers(_req: Request, res: Response): Promise<void> {
  try {
    const users = await collections.users.find({}).toArray();
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error("❌ Users GET Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during user governance metrics retrieval.",
    });
  }
}
