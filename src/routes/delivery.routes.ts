import { Router } from "express";
import {
  createDelivery,
  getAllDeliveries,
  getDeliveriesByUserId,
  updateDeliveryStatus,
} from "../controllers/delivery.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const deliveryRouter = Router();

deliveryRouter.post("/", asyncHandler(createDelivery));
deliveryRouter.get("/", asyncHandler(getAllDeliveries));
deliveryRouter.get("/:userId", asyncHandler(getDeliveriesByUserId));
deliveryRouter.patch("/:id", asyncHandler(updateDeliveryStatus));
