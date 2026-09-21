import { Router } from "express";
import {
  createContactMessage,
  getAllContactMessages,
} from "../controllers/contact.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const contactRouter = Router();

contactRouter.post("/", asyncHandler(createContactMessage));
contactRouter.get("/", asyncHandler(getAllContactMessages));
