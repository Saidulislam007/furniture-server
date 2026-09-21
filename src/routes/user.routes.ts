import { Router } from "express";
import { getAllUsers, updateUser } from "../controllers/user.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const userRouter = Router();

userRouter.get("/", asyncHandler(getAllUsers));
userRouter.patch("/:id", asyncHandler(updateUser));
