// src/cli/commands/index.ts
import { Command } from "commander";
import { LinearService } from "@/services/linear";
import { LLMService } from "@/services/llm";
import { initiativesCommand } from "@/cli/commands/initiatives";
import { projectsCommand } from "@/cli/commands/projects";
import { teamsCommand } from "@/cli/commands/teams";
import { cyclesCommand } from "@/cli/commands/cycles";
import { issuesCommand } from "@/cli/commands/issues";

export function setupCommands(program: Command): void {
  const linear = new LinearService();
  const llm = new LLMService();

  program
    .addCommand(initiativesCommand(linear, llm))
    .addCommand(projectsCommand(linear, llm))
    .addCommand(teamsCommand(linear, llm))
    .addCommand(cyclesCommand(linear, llm))
    .addCommand(issuesCommand(linear, llm));
}
