import { MongoClient, ServerApiVersion } from "mongodb";
import { env } from "./env.js";

export const mongoClient = new MongoClient(env.mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export async function connectDatabase(): Promise<void> {
  await mongoClient.connect();
  await mongoClient.db("admin").command({ ping: 1 });
  console.log("⚡ [Database]: Connected successfully to MongoDB.");
}
