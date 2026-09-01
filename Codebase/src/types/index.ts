export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export type Status = 'queue' | 'in_progress' | 'review' | 'completed';
export type Priority = 'low' | 'medium' | 'high';
export type ActionType = 'viewed' | 'opened' | 'edited' | 'created' | 'deleted' | 'status_changed';

export interface Assignment {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  course?: string;
  due_date?: string;
  priority: Priority;
  weightage?: number;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  course?: string;
  due_date?: string;
  priority: Priority;
  weightage?: number;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  email: string;
  joined_at: string;
}

export interface FileRecord {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type?: string;
  assignment_id?: string;
  project_id?: string;
  folder_id?: string | null;
  uploaded_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  user_email: string;
  action_type: ActionType;
  assignment_id?: string;
  project_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  session_id?: string;
}

export interface AnalysisHistory {
  id: string;
  user_id: string;
  content_preview: string;
  overall_score: number;
  result: AnalysisResult;
  created_at: string;
}

export interface AnalysisResult {
  grammarAndSpelling: {
    issues: string[];
    score: number;
  };
  structure: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    score: number;
  };
  contentQuality: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    score: number;
  };
  clarityAndFlow: {
    rating: string;
    feedback: string;
    score: number;
  };
  plagiarismRisk: {
    level: string;
    reasoning: string;
    warnings: string[];
  };
  overallScore: number;
  readyToSubmit: {
    answer: string;
    reasoning: string;
  };
  recommendedTools: Array<{
    name: string;
    purpose: string;
    url: string;
  }>;
  summary: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  coins: number;
  rank: number;
  points: number;
  on_time_submissions: number;
  total_submissions: number;
  file_edits: number;
  current_streak: number;
  longest_streak: number;
  last_submission_date: string | null;
  last_rank_update: string;
  projects_completed: number;
  assignments_completed: number;
  team_members_invited: number;
  files_uploaded: number;
  ai_sessions: number;
  on_time_projects: number;
  created_at: string;
  updated_at: string;
}

export interface FileFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  children?: FileFolder[];
  files?: FileRecord[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: 'on_time_submissions' | 'rank' | 'file_edits' | 'streak' | 'total_submissions';
  criteria_value: number;
  display_order: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
}

export interface BadgeProgress extends Badge {
  unlocked: boolean;
  progress: number;
  unlocked_at?: string;
}


