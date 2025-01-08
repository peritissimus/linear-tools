// src/services/llm.ts
import { API_CONFIG } from "@/config/constants";
import { loadEnv } from "@/config/env";
import { ProjectDescriptionAnalysis } from "@/types";
import { Project } from "@linear/sdk";
import OpenAI from "openai";

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

  async analyzeProjectDescriptions(
    projects: Project[],
    options: {
      suggestDescriptions?: boolean;
      suggestMilestones?: boolean;
    } = {},
  ): Promise<ProjectDescriptionAnalysis[]> {
    const projectData = await Promise.all(
      projects.map(async (project) => ({
        id: project.id,
        name: project.name,
        description: project.content || "",
      })),
    );

    const baseResponseFormat = `{
      projectId: string;
      projectName: string;
      scores: {
        clarity: number;
        impact: number;
        instructions: number;
        overall: number;
      };
      feedback: {
        clarity: string;
        impact: string;
        instructions: string;
      };`;

    const optionalFields = [
      options.suggestDescriptions ? "suggestedDescription?: string;" : "",
      options.suggestMilestones
        ? `suggestedMilestones?: Array<{
        title: string;
        description: string;
        estimatedDuration: string;
        targetDate?: string;
      }>;`
        : "",
    ]
      .filter(Boolean)
      .join("\n      ");

    const responseFormat = `[
      ${baseResponseFormat}
      ${optionalFields}
    }, 
    ...
    ]`;

    const response = await this.client.chat.completions.create({
      model: API_CONFIG.DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: `Make sure your respond in JSON.
          You are an expert at analyzing project descriptions and providing structured feedback.
          For each project, analyze these aspects and score them on a scale of 0-10:
          
          1. Clarity (How clear and understandable is the project description?)
          - Does it clearly state what the project aims to achieve?
          - Are the objectives specific and measurable?
          - Is the scope well-defined?
          
          2. Impact (How well does it communicate the project's value?)
          - Does it explain the business value or user benefit?
          - Are the expected outcomes clearly stated?
          - Does it address why this project matters?
          
          3. Instructions (How well does it outline the execution plan?)
          - Are the next steps or requirements clear?
          - Does it provide enough context for team members?
          - Are dependencies or prerequisites mentioned?
          
          ${
            options.suggestDescriptions
              ? `
          For each project, suggest an improved description that:
          - Clearly states the project's purpose and goals
          - Highlights the business impact and value
          - Outlines key deliverables
          - Mentions important dependencies or constraints
          `
              : ""
          }
          
          ${
            options.suggestMilestones
              ? `
          For each project, suggest sufficient key milestones that:
          - Align with the project's objectives
          - Have clear, measurable outcomes
          - Include reasonable estimated durations
          - Consider the project's current progress ({project.progress}%)
          - Account for the target date if specified
          `
              : ""
          }

          Respond in below Format please 
          
          {projects: ${responseFormat} }
          `,
        },
        {
          role: "user",
          content: `Analyze these projects:\n${JSON.stringify(projectData, null, 2)}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result =
      JSON.parse(response.choices[0].message.content || "{}")?.projects || [];
    return result;
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
