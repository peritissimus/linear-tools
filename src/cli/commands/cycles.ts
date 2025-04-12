// src/cli/commands/cycles.ts
import { Command } from "commander";
import { LinearService } from "@/services/linear";
import { LLMService } from "@/services/llm";
import * as fs from "fs/promises";

async function writeToFile(data: any, filePath: string, isJson: boolean = false) {
  const content = isJson ? JSON.stringify(data, null, 2) : data;
  await fs.writeFile(filePath, content);
  console.log(`Output saved to ${filePath}`);
}

export function cyclesCommand(linear: LinearService, llm: LLMService): Command {
  return new Command("cycles")
    .description("Cycle operations")
    .option("-l, --list", "List all active cycles")
    .option("-t, --team <teamId>", "Filter by team ID")
    .option("-j, --json", "Output as JSON")
    .option("-o, --output <file>", "Save output to file")
    .option("-i, --info <id>", "Show detailed info for a cycle")
    .option("-p, --projects <id>", "List projects in a cycle")
    .option("-is, --issues <id>", "List issues in a cycle")
    .option("-s, --status <status>", "Filter issues by status (when using --issues)")
    .option("-c, --create <teamId>", "Create a new cycle for a team")
    .option("-n, --name <name>", "Name for the new cycle (when using --create)")
    .option("--start <date>", "Start date for new cycle (YYYY-MM-DD)")
    .option("--end <date>", "End date for new cycle (YYYY-MM-DD)")
    .action(async (opts) => {
      try {
        if (opts.list) {
          await handleListCycles(linear, opts);
          return;
        }

        if (opts.info) {
          await handleCycleInfo(linear, opts.info, opts);
          return;
        }

        if (opts.projects) {
          await handleCycleProjects(linear, opts.projects, opts);
          return;
        }

        if (opts.issues) {
          await handleCycleIssues(linear, opts.issues, opts);
          return;
        }

        if (opts.create) {
          await handleCreateCycle(linear, opts);
          return;
        }

        // If no option is provided, show help
        console.log("No option provided. Use --help to see available options.");
      } catch (error) {
        console.error("Error:", error);
        process.exit(1);
      }
    });
}

async function handleListCycles(linear: LinearService, opts: any) {
  const cycles = opts.team 
    ? await linear.getTeamCycles(opts.team)
    : await linear.listActiveCycles();
  
  if (opts.json) {
    const output = JSON.stringify(cycles, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\n${opts.team ? 'Team Cycles' : 'Active Cycles'}\n`);
  const tableData = await Promise.all(cycles.map(async cycle => {
    const team = await cycle.team;
    return {
      ID: cycle.id,
      Name: cycle.name || `Cycle ${cycle.number}`,
      Team: team ? team.name : 'N/A',
      Status: cycle.status,
      "Start Date": cycle.startsAt ? new Date(cycle.startsAt).toLocaleDateString() : "N/A",
      "End Date": cycle.endsAt ? new Date(cycle.endsAt).toLocaleDateString() : "N/A",
      Progress: cycle.progress ? `${cycle.progress}%` : "N/A"
    };
  }));
  
  if (opts.output) {
    await writeToFile(
      tableData.map(row => Object.values(row).join("\t")).join("\n"),
      opts.output
    );
  } else {
    console.table(tableData);
  }
}

async function handleCycleInfo(linear: LinearService, cycleId: string, opts: any) {
  const cycle = await linear.getCycle(cycleId);
  const team = await cycle.team;
  
  if (opts.json) {
    const cycleData = {
      ...cycle,
      team: team ? {
        id: team.id,
        name: team.name,
        key: team.key
      } : null
    };
    
    const output = JSON.stringify(cycleData, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\nCycle Information: ${cycle.name || `Cycle ${cycle.number}`}\n`);
  console.table({
    ID: cycle.id,
    Name: cycle.name || `Cycle ${cycle.number}`,
    Team: team ? team.name : 'N/A',
    Number: cycle.number,
    Status: cycle.status,
    "Start Date": cycle.startsAt ? new Date(cycle.startsAt).toLocaleDateString() : "N/A",
    "End Date": cycle.endsAt ? new Date(cycle.endsAt).toLocaleDateString() : "N/A",
    Progress: cycle.progress ? `${cycle.progress}%` : "N/A",
    "Created At": new Date(cycle.createdAt).toLocaleDateString()
  });
  
  // Get additional statistics
  const stats = await linear.getCycleStats(cycleId);
  
  console.log('\nCycle Statistics:');
  console.table({
    "Total Issues": stats.totalIssues,
    "Completed Issues": stats.completedIssues,
    "Completion Rate": `${stats.completionRate.toFixed(1)}%`,
    "In Progress Issues": stats.inProgressIssues,
    "Backlog Issues": stats.backlogIssues,
    "Scope Change": stats.scopeChange > 0 ? `+${stats.scopeChange}` : stats.scopeChange
  });
}

async function handleCycleProjects(linear: LinearService, cycleId: string, opts: any) {
  const projects = await linear.getCycleProjects(cycleId);
  const cycle = await linear.getCycle(cycleId);
  
  if (opts.json) {
    const output = JSON.stringify(projects, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\nProjects in Cycle: ${cycle.name || `Cycle ${cycle.number}`}\n`);
  const tableData = projects.map(project => ({
    ID: project.id,
    Name: project.name,
    Status: project.state,
    Progress: `${project.progress}%`,
    "Target Date": project.targetDate || "N/A",
    Description: project.description ? 
      (project.description.length > 30 ? 
        project.description.substring(0, 30) + '...' : project.description) : "N/A"
  }));
  
  if (opts.output) {
    await writeToFile(
      tableData.map(row => Object.values(row).join("\t")).join("\n"),
      opts.output
    );
  } else {
    console.table(tableData);
  }
}

async function handleCycleIssues(linear: LinearService, cycleId: string, opts: any) {
  const issues = await linear.getCycleIssues(cycleId, opts.status);
  const cycle = await linear.getCycle(cycleId);
  
  if (opts.json) {
    const output = JSON.stringify(issues, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\nIssues in Cycle: ${cycle.name || `Cycle ${cycle.number}`}${opts.status ? ` (Status: ${opts.status})` : ''}\n`);
  const tableData = await Promise.all(issues.map(async issue => {
    const assignee = await issue.assignee;
    const state = await issue.state;
    const project = await issue.project;
    
    return {
      ID: issue.id,
      Title: issue.title.length > 40 ? issue.title.substring(0, 40) + '...' : issue.title,
      Status: state ? state.name : 'N/A',
      Priority: issue.priority,
      Assignee: assignee ? assignee.name : 'Unassigned',
      Project: project ? project.name : 'N/A',
      "Due Date": issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : "N/A"
    };
  }));
  
  if (opts.output) {
    await writeToFile(
      tableData.map(row => Object.values(row).join("\t")).join("\n"),
      opts.output
    );
  } else {
    console.table(tableData);
  }
}

async function handleCreateCycle(linear: LinearService, opts: any) {
  if (!opts.name) {
    console.error("Cycle name is required. Use --name option.");
    process.exit(1);
  }
  
  if (!opts.start || !opts.end) {
    console.error("Start and end dates are required. Use --start and --end options.");
    process.exit(1);
  }
  
  const cycleData = {
    teamId: opts.create,
    name: opts.name,
    startsAt: new Date(opts.start),
    endsAt: new Date(opts.end)
  };
  
  try {
    const newCycle = await linear.createCycle(cycleData);
    
    if (opts.json) {
      if (opts.output) {
        await writeToFile(JSON.stringify(newCycle, null, 2), opts.output, true);
      } else {
        console.log(JSON.stringify(newCycle, null, 2));
      }
      return;
    }
    
    console.log(`\nSuccessfully created new cycle: ${newCycle.name}\n`);
    console.table({
      ID: newCycle.id,
      Name: newCycle.name,
      "Team ID": opts.create,
      "Start Date": new Date(newCycle.startsAt).toLocaleDateString(),
      "End Date": new Date(newCycle.endsAt).toLocaleDateString()
    });
  } catch (error) {
    console.error("Failed to create cycle:", error);
    process.exit(1);
  }
}
