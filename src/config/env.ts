// src/config/env.ts
import dotenv from "dotenv";
import path from "path";

export interface EnvConfig {
  LINEAR_API_KEY: string;
  OPENAI_API_KEY: string;
  NODE_ENV: "development" | "production" | "test";
  DEBUG?: boolean;
}

export function loadEnv(): EnvConfig {
  dotenv.config({ path: path.join(process.cwd(), ".env") });

  const requiredEnvVars = ["LINEAR_API_KEY", "OPENAI_API_KEY"];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar],
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  return {
    LINEAR_API_KEY: process.env.LINEAR_API_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    NODE_ENV: (process.env.NODE_ENV as EnvConfig["NODE_ENV"]) || "development",
    DEBUG: process.env.DEBUG === "true",
  };
}
