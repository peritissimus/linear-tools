// src/services/linear.ts
import { LinearClient, Issue, Project, Initiative } from "@linear/sdk";
import { loadEnv } from "@/config/env";

export class LinearService {
  private client: LinearClient;

  constructor() {
    const { LINEAR_API_KEY } = loadEnv();
    this.client = new LinearClient({ apiKey: LINEAR_API_KEY });
  }

  async analyzeDuplicateIssues() {
    const projects = await this.client.projects();

    const allIssues = [];
    for (const project of projects.nodes) {
      const issues = await project.issues();
      allIssues.push(
        ...issues.nodes.map((issue) => ({
          id: issue.id,
          title: issue.title,
          description: issue.description,
          projectId: project.id,
          projectName: project.name,
        })),
      );
    }

    return allIssues;
  }

  async listInitiatives(): Promise<Initiative[]> {
    const initiatives = await this.client.initiatives();
    return initiatives.nodes;
  }

  async getInitiative(id: string): Promise<Initiative> {
    return await this.client.initiative(id);
  }

  async getInitiativeProjects(initiativeId: string) {
    const initiative = await this.client.initiative(initiativeId);
    const projects = await initiative.projects();
    return projects.nodes;
  }

  async getProject(id: string): Promise<Project> {
    return await this.client.project(id);
  }

  async getProjectIssues(projectId: string): Promise<Issue[]> {
    const project = await this.client.project(projectId);
    const issues = await project.issues();
    return issues.nodes;
  }

  async analyzeProjectHealth(projectId: string) {
    const issues = await this.getProjectIssues(projectId);
    const project = await this.getProject(projectId);

    const issuesWithStates = await Promise.all(
      issues.map(async (issue) => {
        const state = await issue.state;
        return {
          ...issue,
          state,
        } as Issue & { state: typeof state };
      }),
    );

    const totalIssues = issues.length;
    const completedIssues = issuesWithStates.filter(
      (i) => i.state?.type === "completed",
    ).length;
    const blockedIssues = issuesWithStates.filter(
      (i) => i.state?.type === "blocked",
    ).length;
    const inProgressIssues = issuesWithStates.filter(
      (i) => i.state?.type === "started",
    ).length;

    return {
      name: project.name,
      metrics: {
        completion_rate: (completedIssues / totalIssues) * 100,
        blocked_rate: (blockedIssues / totalIssues) * 100,
        in_progress_rate: (inProgressIssues / totalIssues) * 100,
      },
      risks: await this.identifyProjectRisks(issuesWithStates),
      recommendations: await this.generateRecommendations(
        issuesWithStates,
        project,
      ),
    };
  }

  private async identifyProjectRisks(issues: (Issue & { state: any })[]) {
    const risks = [];
    const overdueIssues = issues.filter(
      (i) => i.dueDate && new Date(i.dueDate) < new Date(),
    );
    const blockedIssues = issues.filter((i) => i.state?.type === "blocked");

    if (overdueIssues.length > 0) {
      risks.push({
        type: "overdue_issues",
        severity: overdueIssues.length > 5 ? "high" : "medium",
        count: overdueIssues.length,
      });
    }

    if (blockedIssues.length > 0) {
      risks.push({
        type: "blocked_issues",
        severity: blockedIssues.length > 3 ? "high" : "medium",
        count: blockedIssues.length,
      });
    }

    return risks;
  }

  private async generateRecommendations(issues: Issue[], project: Project) {
    const recommendations = [];

    // Get assignee names
    const assignees = await Promise.all(
      issues.map(async (issue) => {
        const assignee = await issue.assignee;
        return assignee?.name;
      }),
    );

    // Check workload distribution
    const assigneeCounts = assignees.reduce(
      (acc, name) => {
        if (name) {
          acc[name] = (acc[name] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const maxIssuesPerPerson = Math.max(...Object.values(assigneeCounts));
    if (maxIssuesPerPerson > 5) {
      recommendations.push(
        "Consider redistributing work - some team members have too many assignments",
      );
    }

    // Check project progress
    const targetDate = await project.targetDate;
    if (project.progress < 50 && targetDate) {
      const daysUntilTarget = Math.ceil(
        (new Date(targetDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysUntilTarget < 30) {
        recommendations.push(
          "Project progress is behind schedule - consider scope adjustment",
        );
      }
    }

    return recommendations;
  }

  async analyzeDependentIssues() {
    const projects = await this.client.projects();

    const allIssues = [];
    for (const project of projects.nodes) {
      const issues = await project.issues();
      const issuesWithDetails = await Promise.all(
        issues.nodes.map(async (issue) => {
          const state = await issue.state;
          const labels = await issue.labels();
          return {
            id: issue.id,
            title: issue.title,
            description: issue.description,
            projectId: project.id,
            projectName: project.name,
            state: state?.name,
            priority: issue.priority,
            labels: labels.nodes.map((l) => l.name),
            createdAt: issue.createdAt,
            completedAt: issue.completedAt,
          };
        }),
      );
      allIssues.push(...issuesWithDetails);
    }

    return allIssues;
  }

  // Team-related methods
  async listTeams() {
    const teams = await this.client.teams();
    return teams.nodes;
  }

  async getTeam(id: string) {
    return await this.client.team(id);
  }

  async getTeamMembers(teamId: string) {
    const team = await this.client.team(teamId);
    const members = await team.members();
    return members.nodes;
  }

  async getTeamProjects(teamId: string) {
    const team = await this.client.team(teamId);
    const projects = await team.projects();
    return projects.nodes;
  }

  async getTeamCycles(teamId: string) {
    const team = await this.client.team(teamId);
    const cycles = await team.cycles();
    return cycles.nodes;
  }

  // Cycle-related methods
  async listActiveCycles() {
    const { nodes } = await this.client.cycles({
      filter: {
        status: { in: ["active", "upcoming"] }
      }
    });
    return nodes;
  }
  
  async getCycle(id: string) {
    return await this.client.cycle(id);
  }
  
  async getCycleProjects(cycleId: string) {
    const cycle = await this.client.cycle(cycleId);
    const projects = await cycle.projects();
    return projects.nodes;
  }
  
  async getCycleIssues(cycleId: string, status?: string) {
    const cycle = await this.client.cycle(cycleId);
    let filter = {};
    
    if (status) {
      filter = {
        state: {
          name: { eq: status }
        }
      };
    }
    
    const issues = await cycle.issues({ filter });
    return issues.nodes;
  }
  
  async getCycleStats(cycleId: string) {
    const cycle = await this.client.cycle(cycleId);
    const issues = await cycle.issues();
    const totalIssues = issues.nodes.length;
    
    // Process issues to get stats
    const issuesWithStates = await Promise.all(
      issues.nodes.map(async (issue) => {
        const state = await issue.state;
        return {
          ...issue,
          state,
        };
      })
    );
    
    const completedIssues = issuesWithStates.filter(i => i.state?.type === "completed").length;
    const inProgressIssues = issuesWithStates.filter(i => i.state?.type === "started").length;
    const backlogIssues = issuesWithStates.filter(i => i.state?.type === "backlog" || i.state?.type === "unstarted").length;
    
    return {
      totalIssues,
      completedIssues,
      inProgressIssues,
      backlogIssues,
      completionRate: totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0,
      scopeChange: cycle.scopeChanges || 0
    };
  }
  
  async createCycle(data: {
    teamId: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
    description?: string;
  }) {
    const result = await this.client.createCycle({
      teamId: data.teamId,
      name: data.name,
      startsAt: data.startsAt.toISOString(),
      endsAt: data.endsAt.toISOString(),
      description: data.description
    });
    
    return result.cycle;
  }
]
}


  // Issue-related methods
  async listIssues(filter: {
    team?: string;
    project?: string;
    cycle?: string;
    status?: string;
    assignee?: string;
  } = {}) {
    const filterObj: any = {};
    
    if (filter.team) {
      filterObj.team = {
        id: { eq: filter.team }
      };
    }
    
    if (filter.project) {
      filterObj.project = {
        id: { eq: filter.project }
      };
    }
    
    if (filter.cycle) {
      filterObj.cycle = {
        id: { eq: filter.cycle }
      };
    }
    
    if (filter.status) {
      filterObj.state = {
        name: { eq: filter.status }
      };
    }
    
    if (filter.assignee) {
      filterObj.assignee = {
        id: { eq: filter.assignee }
      };
    }
    
    const { nodes } = await this.client.issues({
      filter: Object.keys(filterObj).length > 0 ? filterObj : undefined,
      first: 100
    });
    
    return nodes;
  }
  
  async getIssue(idOrKey: string) {
    // Check if it's a full identifier (e.g., ENG-123) or just an ID
    if (idOrKey.includes('-')) {
      return await this.client.issue(idOrKey);
    } else {
      return await this.client.issue(idOrKey);
    }
  }
  
  async createIssue(data: {
    title: string;
    teamId: string;
    description?: string;
    projectId?: string;
    cycleId?: string;
    assigneeId?: string;
    priority?: number;
    stateId?: string;
    parentId?: string;
    dueDate?: string;
  }) {
    const result = await this.client.createIssue(data);
    return result.issue;
  }
  
  async updateIssueState(issueId: string, stateId: string) {
    const result = await this.client.updateIssue(issueId, {
      stateId: stateId
    });
    
    return result.issue;
  }
  
  async createProject(data: {
    name: string;
    teamId: string;
    description?: string;
    state?: string;
    targetDate?: string;
    cycleId?: string;
  }) {
    const result = await this.client.createProject(data);
    return result.project;
  }
