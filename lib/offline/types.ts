// Types voor de offline sync-queue (FR-13.4, Prompt 14). Mutaties die offline
// aan de badrand ontstaan worden lokaal bewaard en later gesynchroniseerd.

export type SyncStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

/** Soorten mutaties die offline mogen ontstaan. Bewust beperkt (privacy). */
export type MutationType = "attendance.set" | "progress.skill.set" | "lesson.note.add";

export interface QueuedMutation<TPayload = unknown> {
  /** Lokaal gegenereerde, idempotente sleutel (voorkomt dubbele verwerking). */
  id: string;
  type: MutationType;
  payload: TPayload;
  actorId: string;
  lessonSessionId: string;
  createdAt: string;
  status: SyncStatus;
  retryCount: number;
  /** Server-foutmelding of conflictreden, indien van toepassing. */
  lastError?: string;
}

export interface AttendancePayload {
  studentId: string;
  status: "present" | "absent" | "late" | "no_show";
}

export interface ProgressSkillPayload {
  studentId: string;
  skillId: string;
  achieved: boolean;
  note?: string;
}
