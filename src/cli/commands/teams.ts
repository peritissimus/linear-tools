// src/cli/commands/teams.ts
import { Command } from "commander";
import { LinearService } from "@/services/linear";
import { LLMService } from "@/services/llm";
import * as fs from "fs/promises";

async function writeToFile(data: any, filePath: string, isJson: boolean = false) {
  const content = isJson ? JSON.stringify(data, null, 2) : data;
  await fs.writeFile(filePath, content);
  console.log(`Output saved to ${filePath}`);
}

export function teamsCommand(linear: LinearService, llm: LLMService): Command {
  return new Command("teams")
    .description("Team operations")
    .option("-l, --list", "List all teams")
    .option("-j, --json", "Output as JSON")
    .option("-o, --output <file>", "Save output to file")
    .option("-i, --info <id>", "Show detailed info for a team")
    .option("-m, --members <id>", "List members of a team")
    .option("-p, --projects <id>", "List projects for a team")
    .option("-c, --cycles <id>", "List cycles for a team")
    .action(async (opts) => {
      try {
        if (opts.list) {
          await handleListTeams(linear, opts);
          return;
        }

        if (opts.info) {
          await handleTeamInfo(linear, opts.info, opts);
          return;
        }

        if (opts.members) {
          await handleTeamMembers(linear, opts.members, opts);
          return;
        }

        if (opts.projects) {
          await handleTeamProjects(linear, opts.projects, opts);
          return;
        }

        if (opts.cycles) {
          await handleTeamCycles(linear, opts.cycles, opts);
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

async function handleListTeams(linear: LinearService, opts: any) {
  const teams = await linear.listTeams();
  
  if (opts.json) {
    const output = JSON.stringify(teams, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  const tableData = teams.map(team => ({
    ID: team.id,
    Name: team.name,
    Key: team.key,
    Members: team.memberCount || "N/A",
    Description: team.description ? 
      (team.description.length > 30 ? 
        team.description.substring(0, 30) + '...' : team.description) : "N/A"
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

async function handleTeamInfo(linear: LinearService, teamId: string, opts: any) {
  const team = await linear.getTeam(teamId);
  
  if (opts.json) {
    const output = JSON.stringify(team, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\nTeam Information: ${team.name}\n`);
  console.table({
    ID: team.id,
    Name: team.name,
    Key: team.key,
    Description: team.description || "N/A",
    "Private": team.private ? "Yes" : "No",
    "Created At": new Date(team.createdAt).toLocaleDateString(),
    "Updated At": team.updatedAt ? new Date(team.updatedAt).toLocaleDateString() : "N/A"
  });
}

async function handleTeamMembers(linear: LinearService, teamId: string, opts: any) {
  const members = await linear.getTeamMembers(teamId);
  const team = await linear.getTeam(teamId);
  
  if (opts.json) {
    const output = JSON.stringify(members, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\nMembers of Team: ${team.name}\n`);
  const tableData = members.map(member => ({
    ID: member.id,
    Name: member.name,
    Email: member.email || "N/A",
    Role: member.role || "N/A",
    "Active": member.active ? "Yes" : "No"
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

async function handleTeamProjects(linear: LinearService, teamId: string, opts: any) {
  const projects = await linear.getTeamProjects(teamId);
  const team = await linear.getTeam(teamId);
  
  if (opts.json) {
    const output = JSON.stringify(projects, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\nProjects for Team: ${team.name}\n`);
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

async function handleTeamCycles(linear: LinearService, teamId: string, opts: any) {
  const cycles = await linear.getTeamCycles(teamId);
  const team = await linear.getTeam(teamId);
  
  if (opts.json) {
    const output = JSON.stringify(cycles, null, 2);
    if (opts.output) {
      await writeToFile(output, opts.output, true);
    } else {
      console.log(output);
    }
    return;
  }
  
  console.log(`\nCycles for Team: ${team.name}\n`);
  const tableData = cycles.map(cycle => ({
    ID: cycle.id,
    Name: cycle.name || `Cycle ${cycle.number}`,
    Status: cycle.status,
    "Start Date": cycle.startsAt ? new Date(cycle.startsAt).toLocaleDateString() : "N/A",
    "End Date": cycle.endsAt ? new Date(cycle.endsAt).toLocaleDateString() : "N/A",
    Progress: cycle.progress ? `${cycle.progress}%` : "N/A"
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
