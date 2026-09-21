import type { Express } from "express";
import { cartRouter } from "./cart.routes.js";
import { categoryRouter } from "./category.routes.js";
import { contactRouter } from "./contact.routes.js";
import { deliveryRouter } from "./delivery.routes.js";
import { furnitureRouter } from "./furniture.routes.js";
import { reviewRouter } from "./review.routes.js";
import { userRouter } from "./user.routes.js";

export function registerRoutes(app: Express): void {
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/furniture", furnitureRouter);

  // Main category API. Reads only from MongoDB `categories` collection.
  app.use("/api/v1/categories", categoryRouter);

  // Backward-compatible aliases so older client builds do not return 404.
  app.use("/api/v1/furniture/category", categoryRouter);
  app.use("/api/v1/furniture/categories", categoryRouter);

  app.use("/api/v1/cart", cartRouter);
  app.use("/api/v1/deliveries", deliveryRouter);
  app.use("/api/v1/reviews", reviewRouter);
  app.use("/api/v1/contact", contactRouter);
}
