import { Router } from "express";
import {
  getCategoryProductById,
  getCategoryProducts,
} from "../controllers/category.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const categoryRouter = Router();

// Keep the specific route before the dynamic category route.
categoryRouter.get("/product/:id", asyncHandler(getCategoryProductById));
categoryRouter.get("/:category", asyncHandler(getCategoryProducts));
