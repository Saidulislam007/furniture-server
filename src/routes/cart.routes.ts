import { Router } from "express";
import { createCartItem, getCartByUserId } from "../controllers/cart.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const cartRouter = Router();

cartRouter.post("/", asyncHandler(createCartItem));
cartRouter.get("/:userId", asyncHandler(getCartByUserId));
