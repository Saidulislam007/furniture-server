import type { Collection, Db } from "mongodb";
import { mongoClient } from "../config/database.js";

export const database: Db = mongoClient.db("furniture-server");

export const collections: {
  users: Collection;
  furniture: Collection;
  categories: Collection;
  cart: Collection;
  deliveries: Collection;
  reviews: Collection;
  contactMessages: Collection;
} = {
  users: database.collection("user"),
  furniture: database.collection("furniture"),
  categories: database.collection("categories"),
  cart: database.collection("cart"),
  deliveries: database.collection("deliveries"),
  reviews: database.collection("reviews"),
  contactMessages: database.collection("contact-messages"),
};
