/** The peer check as the website shows it (schema 15). Client-safe: types only. */
import type { EvidencePhotoView } from "./evidenceTypes";

export interface PeerQueueItem {
  submissionId: string;
  title: string;
  revision: number;
  createdAt: string;
  photos: number;
  /** How many peers already checked it (hidden ones not counted). */
  checks: number;
}

export interface PeerCheckRow {
  id: string;
  /** The peer's name, or null without that peer's consent on file ("a peer on the island"). */
  peer: string | null;
  ticked: string[];
  line: string;
  createdAt: string;
  hidden: boolean;
}

/** One submission as a peer sees it: the quest and the work, no name, no team. */
export interface PeerView {
  submissionId: string;
  revision: number;
  status: string;
  title: string;
  goal: string;
  criteria: string;
  kind: "main" | "side" | "proposed";
  slug: string | null;
  milestone: number | null;
  evidence: string | null;
  reflection: string | null;
  artifactUrl: string | null;
  photos: EvidencePhotoView[];
  canCheck: boolean;
  mine: PeerCheckRow | null;
}

/** The peer checks of a quest's latest submission, for its team and the mentors. */
export interface PeerList {
  submissionId: string;
  revision: number;
  peerOpen: boolean;
  checks: PeerCheckRow[];
}
