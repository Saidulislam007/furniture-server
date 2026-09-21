import { Router } from "express";
import {
  createFurniture,
  deleteFurniture,
  getAllFurniture,
  getFurnitureById,
  updateFurniture,
} from "../controllers/furniture.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const furnitureRouter = Router();

furnitureRouter.post("/", asyncHandler(createFurniture));
furnitureRouter.get("/", asyncHandler(getAllFurniture));
furnitureRouter.get("/:id", asyncHandler(getFurnitureById));
furnitureRouter.patch("/:id", asyncHandler(updateFurniture));
furnitureRouter.delete("/:id", asyncHandler(deleteFurniture));
