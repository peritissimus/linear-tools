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
