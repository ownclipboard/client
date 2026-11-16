/**
 * Why something was reported. The api's own list with the words a member sees,
 * shared by both report flows so a clip and an account cannot end up offering
 * different reasons for the same complaint.
 */
import type { components } from "../types/api";

export type ReportReason = components["schemas"]["ReportReason"];

export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: "spam", label: "Spam", hint: "Advertising, or the same thing over and over" },
  { value: "abuse", label: "Abuse or harassment", hint: "Aimed at someone, or meant to intimidate" },
  { value: "sexual", label: "Sexual content", hint: "Explicit images or text" },
  { value: "violence", label: "Violence", hint: "Threats, or something graphic" },
  { value: "illegal", label: "Illegal", hint: "Stolen credentials, or anything against the law" },
  { value: "other", label: "Something else", hint: "Say what is wrong in the note" }
];

/** What the api accepts, so the field and the api agree on where to stop. */
export const REPORT_NOTE_MAX = 1000;

export const REASON_LABELS: Record<ReportReason, string> = REPORT_REASONS.reduce(
  (all, reason) => ({ ...all, [reason.value]: reason.label }),
  {} as Record<ReportReason, string>
);
