// src/cli/commands/initiatives.ts
import { Command } from "commander";
import { LinearService } from "@/services/linear";
import { LLMService } from "@/services/llm";

export function initiativesCommand(
  linear: LinearService,
  llm: LLMService,
): Command {
  return new Command("initiatives")
    .description("List and analyze initiatives")
    .option("-a, --analyze", "Analyze with LLM")
    .option("-j, --json", "Output as JSON")
    .action(async (opts) => {
      const initiatives = await linear.listInitiatives();

      if (opts.analyze) {
        const analysis = await llm.analyze(initiatives);
        console.log(analysis);
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(initiatives, null, 2));
        return;
      }

      initiatives.forEach((i) => {
        console.log(`${i.id}: ${i.name} (${i.status})`);
      });
    });
}
