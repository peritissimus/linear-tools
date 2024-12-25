// src/cli/commands/projects.ts
import { Command } from "commander";
import { LinearService } from "@/services/linear";
import { LLMService } from "@/services/llm";

export function projectsCommand(
  linear: LinearService,
  llm: LLMService,
): Command {
  return new Command("project")
    .description("Project operations")
    .argument("<id>", "Project ID")
    .option("-h, --health", "Show health metrics")
    .option("-a, --analyze", "Analyze with LLM")
    .option("-j, --json", "Output as JSON")
    .action(async (id, opts) => {
      if (opts.health) {
        const health = await linear.analyzeProjectHealth(id);
        if (opts.analyze) {
          const analysis = await llm.analyze(health);
          console.log(analysis);
          return;
        }
        console.log(
          opts.json
            ? JSON.stringify(health, null, 2)
            : `Health metrics for ${health.name}:\n` +
                `Completion rate: ${health.metrics.completion_rate.toFixed(1)}%\n` +
                `Blocked rate: ${health.metrics.blocked_rate.toFixed(1)}%\n` +
                `Risks: ${health.risks.length}`,
        );
        return;
      }

      const project = await linear.getProject(id);
      console.log(
        opts.json
          ? JSON.stringify(project, null, 2)
          : `${project.name}\n${project.description || ""}\nProgress: ${project.progress}%`,
      );
    });
}
