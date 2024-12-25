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

      const tableData = initiatives.map((i) => ({
        ID: i.id,
        Name: i.name,
        Status: i.status,
        Description:
          i.description?.slice(0, 50) +
            (i.description && i.description.length > 50 ? "..." : "") || "",
      }));

      console.table(tableData);
    });
}
