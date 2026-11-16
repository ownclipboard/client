import { ref } from "vue";
import type { ReportReason } from "../data/reports";

export type ReportOptions = {
  title: string;
  /** What this report does and who reads it: the two kinds reach different people. */
  description: string;
  /** Over the note field, and it says whether anyone is shown what is written there. */
  noteLabel: string;
  confirmLabel?: string;
};

export type ReportAnswer = { reason: ReportReason; note: string };

export const ShowReport = ref(false);
export const ReportOptionsRef = ref<ReportOptions>({ title: "", description: "", noteLabel: "" });
export const ReportResolveFn = ref<(answer: ReportAnswer | null) => void>(() => {});

/**
 * Ask what is wrong with something. Resolves the reason and the note, or null
 * when the dialog is dismissed. Sending it is the caller's, because a clip and
 * an account go to different endpoints.
 */
export function askToReport(options: ReportOptions): Promise<ReportAnswer | null> {
  ReportOptionsRef.value = options;
  ShowReport.value = true;
  return new Promise((resolve) => {
    ReportResolveFn.value = resolve;
  });
}
