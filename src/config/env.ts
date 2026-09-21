import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is not defined in the environment.");
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri,
  frontendUrl: process.env.FRONTEND_URL,
};
