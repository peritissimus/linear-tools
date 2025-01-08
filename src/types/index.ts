export interface ProjectDescriptionAnalysis {
  projectId: string;
  projectName: string;
  scores: {
    clarity: number;
    impact: number;
    instructions: number;
    overall: number;
  };
  feedback: {
    clarity: string;
    impact: string;
    instructions: string;
  };
  suggestedDescription?: string;
  suggestedMilestones?: Array<{
    title: string;
    description: string;
    estimatedDuration: string;
    targetDate?: string;
  }>;
}

export interface DuplicateIssue {
  id: string;
  title: string;
  project: string;
}

export interface DuplicateGroup {
  issues: DuplicateIssue[];
  similarity_reason: string;
  recommendation: string;
}

export interface DuplicateAnalysis {
  duplicate_groups: DuplicateGroup[];
}

export interface DependencyIssue {
  id: string;
  title: string;
  project: string;
}

export interface DependencyGroup {
  primary_issue: DependencyIssue;
  dependent_issues: DependencyIssue[];
  dependency_type: "technical" | "sequential" | "resource";
  reason: string;
  risk_level: "low" | "medium" | "high";
  recommendation: string;
}

export interface DependencyAnalysis {
  dependency_groups: DependencyGroup[];
}
