/** Admin-only oversight. Display names only, never Discord IDs or contact details. */
export interface AdminIslandProject {
  slot: number;
  name: string;
  route: string;
  ambition: string | null;
  milestones: number[];
  members: string[];
  waitingReview: number;
  openHelp: number;
  checkinsWeek: number;
  lastActivity: string;
}

export interface AdminIslandOverview {
  projects: AdminIslandProject[];
}
