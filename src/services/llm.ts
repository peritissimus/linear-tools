// src/services/llm.ts
import OpenAI from "openai";
import { loadEnv } from "@/config/env";
import { API_CONFIG } from "@/config/constants";

export class LLMService {
  private client: OpenAI;

  constructor() {
    const { OPENAI_API_KEY } = loadEnv();
    this.client = new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: API_CONFIG.OPENAI_BASE_URL,
    });
  }

  async analyze(data: any): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: API_CONFIG.DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a project management analyst. Analyze the provided project data and generate insights about progress, risks, and recommendations.",
        },
        {
          role: "user",
          content: `Project Data:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || "";
  }
}
