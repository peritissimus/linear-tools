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

    const totalIssues = issues.length;
    const completedIssues = issues.filter(
      (i) => i.state?.type === "completed",
    ).length;
    const blockedIssues = issues.filter(
      (i) => i.state?.type === "blocked",
    ).length;
    const inProgressIssues = issues.filter(
      (i) => i.state?.type === "started",
    ).length;

    return {
      name: project.name,
      metrics: {
        completion_rate: (completedIssues / totalIssues) * 100,
        blocked_rate: (blockedIssues / totalIssues) * 100,
        in_progress_rate: (inProgressIssues / totalIssues) * 100,
      },
      risks: this.identifyProjectRisks(issues),
      recommendations: this.generateRecommendations(issues, project),
    };
  }

  private identifyProjectRisks(issues: Issue[]) {
    const risks = [];

    // Check overdue issues
    const overdueIssues = issues.filter(
      (i) => i.dueDate && new Date(i.dueDate) < new Date(),
    );
    if (overdueIssues.length > 0) {
      risks.push({
        type: "overdue_issues",
        severity: overdueIssues.length > 5 ? "high" : "medium",
        count: overdueIssues.length,
      });
    }

    // Check blocked issues
    const blockedIssues = issues.filter((i) => i.state?.type === "blocked");
    if (blockedIssues.length > 0) {
      risks.push({
        type: "blocked_issues",
        severity: blockedIssues.length > 3 ? "high" : "medium",
        count: blockedIssues.length,
      });
    }

    return risks;
  }

  private generateRecommendations(issues: Issue[], project: Project) {
    const recommendations = [];

    // Check workload distribution
    const assigneeCounts = issues.reduce(
      (acc, issue) => {
        const assignee = issue.assignee?.name;
        if (assignee) {
          acc[assignee] = (acc[assignee] || 0) + 1;
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
    if (project.progress < 50 && project.targetDate) {
      const daysUntilTarget = Math.ceil(
        (new Date(project.targetDate).getTime() - new Date().getTime()) /
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
