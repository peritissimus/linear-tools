import { Command } from "commander";
import { LinearService } from "@/services/linear";
import { LLMService } from "@/services/llm";
import * as fs from "fs/promises";

async function writeToFile(
  data: any,
  filePath: string,
  isJson: boolean = false,
) {
  const content = isJson ? JSON.stringify(data, null, 2) : data;
  await fs.writeFile(filePath, content);
  console.log(`Output saved to ${filePath}`);
}

export function initiativesCommand(
  linear: LinearService,
  llm: LLMService,
): Command {
  return new Command("initiatives")
    .description("List and analyze initiatives")
    .option("-a, --analyze", "Analyze with LLM")
    .option("-j, --json", "Output as JSON")
    .option("-p, --projects <id>", "Get projects for initiative ID")
    .option(
      "-d, --descriptions <id>",
      "Analyze project descriptions for initiative ID",
    )
    .option("-s, --suggest", "Include suggested improved descriptions")
    .option("-m, --milestones", "Include suggested milestones")
    .option("-o, --output <file>", "Save output to file")
    .action(async (opts) => {
      if (opts.descriptions) {
        await handleProjectDescriptionAnalysis(
          linear,
          llm,
          opts.descriptions,
          opts,
        );
        return;
      }
      if (opts.projects) {
        const projects = await linear.getInitiativeProjects(opts.projects);
        if (opts.json) {
          const output = JSON.stringify(projects, null, 2);
          if (opts.output) {
            await writeToFile(output, opts.output);
          } else {
            console.log(output);
          }
          return;
        }
        const tableData = projects.map((p) => ({
          ID: p.id,
          Name: p.name,
          Progress: `${p.progress}%`,
          Status: p.state,
        }));
        if (opts.output) {
          await writeToFile(
            tableData.map((row) => Object.values(row).join("\t")).join("\n"),
            opts.output,
          );
        } else {
          console.table(tableData);
        }
        return;
      }
      const initiatives = await linear.listInitiatives();
      if (opts.analyze) {
        const analysis = await llm.analyze(initiatives);
        if (opts.output) {
          await writeToFile(analysis, opts.output);
        } else {
          console.log(analysis);
        }
        return;
      }
      if (opts.json) {
        const output = JSON.stringify(initiatives, null, 2);
        if (opts.output) {
          await writeToFile(output, opts.output);
        } else {
          console.log(output);
        }
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
      if (opts.output) {
        await writeToFile(
          tableData.map((row) => Object.values(row).join("\t")).join("\n"),
          opts.output,
        );
      } else {
        console.table(tableData);
      }
    });
}

async function handleProjectDescriptionAnalysis(
  linear: LinearService,
  llm: LLMService,
  initiativeId: string,
  opts: any,
) {
  const projects = await linear.getInitiativeProjects(initiativeId);
  const initiative = await linear.getInitiative(initiativeId);
  console.log(`\nAnalyzing projects for initiative: ${initiative.name}\n`);

  const analysis = await llm.analyzeProjectDescriptions(projects, {
    suggestDescriptions: opts.suggest,
    suggestMilestones: opts.milestones,
  });

  if (opts.json) {
    const output = JSON.stringify(analysis, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output);
      return;
    }
    console.log(output);
    return;
  }

  let output = "";
  analysis.forEach((result) => {
    output += `\nProject: ${result.projectName}\n`;
    output += "Scores:\n";
    output += `Clarity: ${result.scores.clarity}\n`;
    output += `Impact: ${result.scores.impact}\n`;
    output += `Instructions: ${result.scores.instructions}\n`;
    output += `Overall: ${result.scores.overall}\n`;

    output += "\nFeedback:\n";
    output += `- Clarity: ${result.feedback.clarity}\n`;
    output += `- Impact: ${result.feedback.impact}\n`;
    output += `- Instructions: ${result.feedback.instructions}\n`;

    if (result.suggestedDescription) {
      output += "\nSuggested Description:\n";
      output += `${result.suggestedDescription}\n`;
    }

    if (result.suggestedMilestones) {
      output += "\nSuggested Milestones:\n";
      result.suggestedMilestones.forEach((milestone, idx) => {
        output += `\n${idx + 1}. ${milestone.title}\n`;
        output += `   Description: ${milestone.description}\n`;
        output += `   Estimated Duration: ${milestone.estimatedDuration}\n`;
      });
    }
    output += "\n----------------------------------------\n";
  });

  if (opts.output) {
    await writeToFile(output, opts.output);
  } else {
    console.log(output);
  }
}
