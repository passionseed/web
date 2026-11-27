import { randomBytes } from "crypto";

/** Server-side: a teacher link's public code (8 hex, like a student's) and its private page token (32 hex, like a pay token). */
export const newTeacherCode = () => randomBytes(4).toString("hex");
export const newTeacherToken = () => randomBytes(16).toString("hex");
