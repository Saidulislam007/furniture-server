import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";

const app = express();

app.use(express.json());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World! Engine is operational.");
});

registerRoutes(app);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌ [Unhandled Error]:", error);
  const message = error instanceof Error ? error.message : "Internal Server Error";
  res.status(500).json({ success: false, error: message });
});

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    app.listen(env.port, () => {
      console.log(`🚀 [Server]: Engine successfully running on port ${env.port}`);
    });
  } catch (error) {
    console.error("❌ [Database Error]: Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

void startServer();
