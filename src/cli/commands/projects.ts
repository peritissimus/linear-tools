// src/cli/commands/projects.ts
import { Command } from "commander";
import { LinearService } from "@/services/linear";
import { LLMService } from "@/services/llm";
import { DuplicateAnalysis } from "@/types";

export function projectsCommand(
  linear: LinearService,
  llm: LLMService,
): Command {
  return new Command("project")
    .description("Project operations")
    .option("-h, --health [id]", "Show health metrics for a project")
    .option("-a, --analyze", "Analyze with LLM")
    .option("-j, --json", "Output as JSON")
    .option("-d, --duplicates", "Analyze duplicate issues in Engineering team")
    .option("-dep, --dependencies", "Analyze dependencies between issues")
    .option("-l, --list [id]", "List all issues in a project")
    .action(async (opts) => {
      try {
        if (opts.dependencies) {
          await handleDependenciesAnalysis(linear, llm, opts);
          return;
        }
        if (opts.duplicates) {
          await handleDuplicatesAnalysis(linear, llm, opts);
          return;
        }
        if (opts.list) {
          await handleListIssues(linear, opts);
          return;
        }
        if (opts.health) {
          await handleProjectHealth(linear, llm, opts);
          return;
        }
        await handleProjectInfo(linear, opts);
      } catch (error) {
        console.error("Error:", error);
        process.exit(1);
      }
    });
}

async function handleListIssues(linear: LinearService, opts: any) {
  if (typeof opts.list !== "string") {
    console.error("Project ID is required for listing issues");
    process.exit(1);
  }

  const issues = await linear.getProjectIssues(opts.list);

  if (opts.json) {
    console.log(JSON.stringify(issues, null, 2));
    return;
  }

  console.log("\nProject Issues:");
  console.table(
    issues.map((issue) => ({
      ID: issue.id,
      Title: issue.title,
      Priority: issue.priority,
      DueDate: issue.dueDate
        ? new Date(issue.dueDate).toLocaleDateString()
        : "N/A",
    })),
  );
}

async function handleDependenciesAnalysis(
  linear: LinearService,
  llm: LLMService,
  opts: any,
) {
  const issues = await linear.analyzeDependentIssues();
  const analysis = await llm.analyzeDependencies(issues);

  if (opts.json) {
    console.log(analysis);
    return;
  }

  const parsedAnalysis = JSON.parse(analysis) as {
    dependency_groups: Array<{
      primary_issue: { id: string; title: string; project: string };
      dependent_issues: Array<{ id: string; title: string; project: string }>;
      dependency_type: string;
      reason: string;
      risk_level: string;
      recommendation: string;
    }>;
  };

  console.log("\nPotential Dependencies Found:");

  parsedAnalysis.dependency_groups.forEach((group, index) => {
    console.log(`\nDependency Group ${index + 1}:`);
    console.log("\nPrimary Issue:");
    console.table([group.primary_issue]);
    console.log("\nDependent Issues:");
    console.table(group.dependent_issues);
    console.log("Dependency Type:", group.dependency_type);
    console.log("Reason:", group.reason);
    console.log("Risk Level:", group.risk_level);
    console.log("Recommendation:", group.recommendation);
    console.log("----------------------------------------");
  });
}

async function handleDuplicatesAnalysis(
  linear: LinearService,
  llm: LLMService,
  opts: any,
) {
  const issues = await linear.analyzeDuplicateIssues();
  const analysis = await llm.analyzeDuplicates(issues);

  if (opts.json) {
    console.log(analysis);
    return;
  }

  const parsedAnalysis = JSON.parse(analysis) as DuplicateAnalysis;
  console.log("\nPotential Duplicate Issues Found:");

  parsedAnalysis.duplicate_groups.forEach((group, index) => {
    console.log(`\nGroup ${index + 1}:`);
    console.table(group.issues);
    console.log("Reason:", group.similarity_reason);
    console.log("Recommendation:", group.recommendation);
  });
}

async function handleProjectHealth(
  linear: LinearService,
  llm: LLMService,
  opts: any,
) {
  if (typeof opts.health !== "string") {
    console.error("Project ID is required for health analysis");
    process.exit(1);
  }

  const health = await linear.analyzeProjectHealth(opts.health);

  if (opts.analyze) {
    const analysis = await llm.analyze(health);
    console.log(analysis);
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify(health, null, 2));
    return;
  }

  // Display project health metrics
  console.table({
    Name: health.name,
    "Completion Rate": `${health.metrics.completion_rate.toFixed(1)}%`,
    "Blocked Rate": `${health.metrics.blocked_rate.toFixed(1)}%`,
    "In Progress Rate": `${health.metrics.in_progress_rate.toFixed(1)}%`,
    "Risk Count": health.risks.length,
    Recommendations: health.recommendations.length,
  });

  // Display risks if any
  if (health.risks.length > 0) {
    console.log("\nRisks:");
    console.table(
      health.risks.map((risk) => ({
        Type: risk.type,
        Severity: risk.severity,
        Count: risk.count,
      })),
    );
  }

  // Display recommendations if any
  if (health.recommendations.length > 0) {
    console.log("\nRecommendations:");
    console.table(
      health.recommendations.map((rec, i) => ({
        ID: i + 1,
        Recommendation: rec,
      })),
    );
  }
}

async function handleProjectInfo(linear: LinearService, opts: any) {
  const projectId = opts.health;
  if (!projectId) {
    console.error("Project ID is required");
    process.exit(1);
  }

  const project = await linear.getProject(projectId);
  if (opts.json) {
    console.log(JSON.stringify(project, null, 2));
    return;
  }

  console.table({
    Name: project.name,
    Description: project.description || "N/A",
    Progress: `${project.progress}%`,
    Status: project.state,
    "Target Date": project.targetDate || "N/A",
    "Created At": new Date(project.createdAt).toLocaleDateString(),
  });
}
