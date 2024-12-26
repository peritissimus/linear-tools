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

  async analyzeDuplicates(issues: any[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: API_CONFIG.DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing project issues and identifying potential duplicates. 
          Focus on:
          - Semantic similarity between issue titles and descriptions
          - Issues with similar goals or outcomes across different projects
          - Provide specific issue IDs and reasoning for potential duplicates
          Format output as JSON with structure:
          {
            "duplicate_groups": [
              {
                "issues": [{"id": string, "title": string, "project": string}],
                "similarity_reason": string,
                "recommendation": string
              }
            ]
          }`,
        },
        {
          role: "user",
          content: `Analyze these issues for potential duplicates:\n${JSON.stringify(issues, null, 2)}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    return response.choices[0].message.content || "";
  }

  async analyzeDependencies(issues: any[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: API_CONFIG.DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing project issues and identifying potential dependencies between them.
          Focus on:
          - Technical dependencies based on issue descriptions and titles
          - Sequential dependencies based on logical workflow
          - Cross-project dependencies that might affect delivery
          - Resource dependencies based on assignees and teams
          Format output as JSON with structure:
          {
            "dependency_groups": [
              {
                "primary_issue": {"id": string, "title": string, "project": string},
                "dependent_issues": [{"id": string, "title": string, "project": string}],
                "dependency_type": "technical|sequential|resource",
                "reason": string,
                "risk_level": "low|medium|high",
                "recommendation": string
              }
            ]
          }`,
        },
        {
          role: "user",
          content: `Analyze these issues for potential dependencies:\n${JSON.stringify(issues, null, 2)}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    return response.choices[0].message.content || "";
  }
}
