import { Router } from "express";
import {
  createReview,
  getAllReviews,
  getReviewsByProductId,
} from "../controllers/review.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const reviewRouter = Router();

reviewRouter.get("/", asyncHandler(getAllReviews));
reviewRouter.post("/", asyncHandler(createReview));
reviewRouter.get("/:productId", asyncHandler(getReviewsByProductId));
