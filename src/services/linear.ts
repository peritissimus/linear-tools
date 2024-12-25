// src/services/linear.ts
import { LinearClient, Issue, Project, Initiative } from "@linear/sdk";
import { loadEnv } from "@/config/env";

export class LinearService {
  private client: LinearClient;

  constructor() {
    const { LINEAR_API_KEY } = loadEnv();
    this.client = new LinearClient({ apiKey: LINEAR_API_KEY });
  }

  async listInitiatives(): Promise<Initiative[]> {
    const initiatives = await this.client.initiatives();
    return initiatives.nodes;
  }

  async getInitiative(id: string): Promise<Initiative> {
    return await this.client.initiative(id);
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
}
