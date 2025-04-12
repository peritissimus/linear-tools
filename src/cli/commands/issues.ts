// src/cli/commands/issues.ts
import { Command } from "commander";
import { LinearService } from "@/services/linear";
import { LLMService } from "@/services/llm";
import * as fs from "fs/promises";

async function writeToFile(data: any, filePath: string, isJson: boolean = false) {
  const content = isJson ? JSON.stringify(data, null, 2) : data;
  await fs.writeFile(filePath, content);
  console.log(`Output saved to ${filePath}`);
}

export function issuesCommand(linear: LinearService, llm: LLMService): Command {
  return new Command("issues")
    .description("Issue operations")
    .option("-l, --list", "List issues")
    .option("-t, --team <teamId>", "Filter by team ID")
    .option("-p, --project <projectId>", "Filter by project ID")
    .option("-c, --cycle <cycleId>", "Filter by cycle ID")
    .option("-s, --status <status>", "Filter by status")
    .option("-a, --assignee <userId>", "Filter by assignee")
    .option("-j, --json", "Output as JSON")
    .option("-o, --output <file>", "Save output to file")
    .option("-i, --info <id>", "Show detailed info for an issue")
    .option("--create", "Create a new issue")
    .option("--title <title>", "Title for the new issue")
    .option("--desc <description>", "Description for the new issue")
    .option("--team-id <teamId>", "Team ID for the new issue")
    .option("--project-id <projectId>", "Project ID for the new issue (optional)")
    .option("--cycle-id <cycleId>", "Cycle ID for the new issue (optional)")
    .option("--assignee-id <userId>", "Assignee ID for the new issue (optional)")
    .option("--priority <1-4>", "Priority for the new issue (1: Urgent, 2: High, 3: Medium, 4: Low)")
    .option("--move <id>", "Move an issue to a different state")
    .option("--to-state <stateId>", "Target state ID")
    .option("--generate", "Generate issues using LLM")
    .option("--prompt <text>", "Prompt for LLM to generate issues")
    .option("--target-project <projectId>", "Target project for generated issues")
    .option("--count <number>", "Number of issues to generate (default: 3)")
    .action(async (opts) => {
      try {
        if (opts.list) {
          await handleListIssues(linear, opts);
          return;
        }

        if (opts.info) {
          await handleIssueInfo(linear, opts.info, opts);
          return;
        }

        if (opts.create && opts.title && opts.teamId) {
          await handleCreateIssue(linear, opts);
          return;
        }

        if (opts.move && opts.toState) {
          await handleMoveIssue(linear, opts.move, opts.toState, opts);
          return;
        }

        if (opts.generate && opts.prompt && opts.targetProject) {
          await handleGenerateIssues(linear, llm, opts);
          return;
        }

        // If no valid option combination is provided, show help
        console.log("Invalid or missing options. Use --help to see available options.");
      } catch (error) {
        console.error("Error:", error);
        process.exit(1);
      }
    });
}

async function handleListIssues(linear: LinearService, opts: any) {
  const filter: any = {};
  
  if (opts.team) filter.team = opts.team;
  if (opts.project) filter.project = opts.project;
  if (opts.cycle) filter.cycle = opts.cycle;
  if (opts.status) filter.status = opts.status;
  if (opts.assignee) filter.assignee = opts.assignee;
  
  const issues = await linear.listIssues(filter);
  
  if (opts.json) {
    const output = JSON.stringify(issues, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\nIssues${getFilterDescription(filter)}\n`);
  const tableData = await Promise.all(issues.map(async issue => {
    const assignee = await issue.assignee;
    const state = await issue.state;
    const project = await issue.project;
    const team = await issue.team;
    
    return {
      ID: issue.identifier,
      Title: issue.title.length > 40 ? issue.title.substring(0, 40) + '...' : issue.title,
      Status: state ? state.name : 'N/A',
      Team: team ? team.name : 'N/A',
      Project: project ? project.name : 'N/A',
      Priority: getPriorityLabel(issue.priority),
      Assignee: assignee ? assignee.name : 'Unassigned',
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

async function handleIssueInfo(linear: LinearService, issueId: string, opts: any) {
  const issue = await linear.getIssue(issueId);
  
  if (!issue) {
    console.error(`Issue ${issueId} not found.`);
    process.exit(1);
  }
  
  // Fetch related data
  const [assignee, creator, state, project, team, cycle] = await Promise.all([
    issue.assignee,
    issue.creator,
    issue.state,
    issue.project,
    issue.team,
    issue.cycle
  ]);
  
  if (opts.json) {
    const issueData = {
      ...issue,
      assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
      creator: creator ? { id: creator.id, name: creator.name } : null,
      state: state ? { id: state.id, name: state.name, type: state.type } : null,
      project: project ? { id: project.id, name: project.name } : null,
      team: team ? { id: team.id, name: team.name, key: team.key } : null,
      cycle: cycle ? { id: cycle.id, name: cycle.name } : null,
    };
    
    const output = JSON.stringify(issueData, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\nIssue Information: ${issue.identifier} - ${issue.title}\n`);
  console.table({
    ID: issue.identifier,
    Title: issue.title,
    Status: state ? state.name : 'N/A',
    Team: team ? team.name : 'N/A',
    Project: project ? project.name : 'N/A',
    Cycle: cycle ? (cycle.name || `Cycle ${cycle.number}`) : 'N/A',
    Priority: getPriorityLabel(issue.priority),
    Assignee: assignee ? assignee.name : 'Unassigned',
    Creator: creator ? creator.name : 'N/A',
    "Created At": new Date(issue.createdAt).toLocaleDateString(),
    "Updated At": new Date(issue.updatedAt).toLocaleDateString(),
    "Due Date": issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : "N/A"
  });
  
  console.log('\nDescription:');
  console.log(issue.description || '(No description)');
  
  // Fetch and display comments if available
  const comments = await issue.comments();
  if (comments.nodes.length > 0) {
    console.log('\nComments:');
    for (const comment of comments.nodes) {
      const author = await comment.user;
      console.log(`\n[${new Date(comment.createdAt).toLocaleString()}] ${author ? author.name : 'Unknown'}:`);
      console.log(comment.body);
    }
  }
}

async function handleCreateIssue(linear: LinearService, opts: any) {
  const issueData: any = {
    title: opts.title,
    teamId: opts.teamId,
    description: opts.desc || ''
  };
  
  if (opts.projectId) issueData.projectId = opts.projectId;
  if (opts.cycleId) issueData.cycleId = opts.cycleId;
  if (opts.assigneeId) issueData.assigneeId = opts.assigneeId;
  if (opts.priority) issueData.priority = parseInt(opts.priority, 10);
  
  try {
    const newIssue = await linear.createIssue(issueData);
    
    if (opts.json) {
      if (opts.output) {
        await writeToFile(JSON.stringify(newIssue, null, 2), opts.output, true);
      } else {
        console.log(JSON.stringify(newIssue, null, 2));
      }
      return;
    }
    
    console.log(`\nSuccessfully created new issue: ${newIssue.identifier}\n`);
    console.table({
      ID: newIssue.identifier,
      Title: newIssue.title,
      URL: newIssue.url
    });
  } catch (error) {
    console.error("Failed to create issue:", error);
    process.exit(1);
  }
}

async function handleMoveIssue(linear: LinearService, issueId: string, stateId: string, opts: any) {
  try {
    const issue = await linear.getIssue(issueId);
    if (!issue) {
      console.error(`Issue ${issueId} not found.`);
      process.exit(1);
    }
    
    // Get the current state for logging
    const currentState = await issue.state;
    
    // Move the issue
    const updatedIssue = await linear.updateIssueState(issueId, stateId);
    
    // Get new state for logging
    const newState = await updatedIssue.state;
    
    if (opts.json) {
      if (opts.output) {
        await writeToFile(JSON.stringify(updatedIssue, null, 2), opts.output, true);
      } else {
        console.log(JSON.stringify(updatedIssue, null, 2));
      }
      return;
    }
    
    console.log(`\nSuccessfully moved issue ${issue.identifier} from "${currentState?.name}" to "${newState?.name}"\n`);
    console.table({
      ID: updatedIssue.identifier,
      Title: updatedIssue.title,
      Status: newState?.name || 'Unknown',
      URL: updatedIssue.url
    });
  } catch (error) {
    console.error("Failed to move issue:", error);
    process.exit(1);
  }
}

async function handleGenerateIssues(linear: LinearService, llm: LLMService, opts: any) {
  // Get project info for context
  const project = await linear.getProject(opts.targetProject);
  
  if (!project) {
    console.error(`Project ${opts.targetProject} not found.`);
    process.exit(1);
  }
  
  console.log(`\nGenerating issues for project: ${project.name}\n`);
  
  const count = opts.count || 3;
  
  try {
    // Get existing issues for context
    const existingIssues = await linear.getProjectIssues(opts.targetProject);
    
    // Generate issues using LLM
    const generatedIssues = await llm.generateIssues({
      projectName: project.name,
      projectDescription: project.description || '',
      prompt: opts.prompt,
      existingIssues: existingIssues.map(i => i.title),
      count: count
    });
    
    console.log(`Generated ${generatedIssues.length} issues:`);
    
    const createdIssues = [];
    for (const issue of generatedIssues) {
      // Create each issue
      const newIssue = await linear.createIssue({
        title: issue.title,
        description: issue.description,
        teamId: project.teamId,
        projectId: project.id,
        priority: issue.priority
      });
      
      createdIssues.push(newIssue);
      console.log(` - Created: ${newIssue.identifier} - ${newIssue.title}`);
    }
    
    if (opts.json) {
      const output = JSON.stringify(createdIssues, null, 2);
      if (opts.output) {
        await writeToFile(output, opts.output, true);
      } else {
        console.log(output);
      }
    }
  } catch (error) {
    console.error("Failed to generate issues:", error);
    process.exit(1);
  }
}

// Helper functions
function getFilterDescription(filter: any): string {
  const parts = [];
  if (filter.team) parts.push(`team: ${filter.team}`);
  if (filter.project) parts.push(`project: ${filter.project}`);
  if (filter.cycle) parts.push(`cycle: ${filter.cycle}`);
  if (filter.status) parts.push(`status: ${filter.status}`);
  if (filter.assignee) parts.push(`assignee: ${filter.assignee}`);
  
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

function getPriorityLabel(priority?: number): string {
  switch (priority) {
    case 0: return 'No priority';
    case 1: return 'Urgent';
    case 2: return 'High';
    case 3: return 'Medium';
    case 4: return 'Low';
    default: return 'Unknown';
  }
}
