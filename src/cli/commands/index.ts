// src/cli/commands/index.ts
import { Command } from "commander";
import { LinearService } from "@/services/linear";
import { LLMService } from "@/services/llm";
import { initiativesCommand } from "@/cli/commands/initiatives";
import { projectsCommand } from "@/cli/commands/projects";

export function setupCommands(program: Command): void {
  const linear = new LinearService();
  const llm = new LLMService();

  program
    .addCommand(initiativesCommand(linear, llm))
    .addCommand(projectsCommand(linear, llm));
}
