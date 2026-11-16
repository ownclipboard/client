<script setup lang="ts">
/**
 * The one report dialog, for a clip and for an account alike. It only collects
 * the reason and the note; who the report is sent to is the caller's business,
 * and the wording it is opened with is what tells the user which it is.
 */
import { ref, watch } from "vue";
import { REPORT_NOTE_MAX, REPORT_REASONS, type ReportReason } from "../data/reports";
import { ReportOptionsRef, ReportResolveFn, ShowReport } from "./ReportHandler";
import Dialog from "./ui/Dialog.vue";
import Button from "./ui/Button.vue";
import Textarea from "./ui/Textarea.vue";

const reason = ref<ReportReason | "">("");
const note = ref("");

watch(ShowReport, (open) => {
  if (!open) return;
  reason.value = "";
  note.value = "";
});

function answer(sent: boolean) {
  ShowReport.value = false;
  ReportResolveFn.value(sent && reason.value ? { reason: reason.value, note: note.value.trim() } : null);
}
</script>

<template>
  <Dialog
    :open="ShowReport"
    size="md"
    :title="ReportOptionsRef.title"
    :description="ReportOptionsRef.description"
    @close="answer(false)"
  >
    <form class="space-y-4" @submit.prevent="answer(true)">
      <fieldset class="space-y-1.5">
        <legend class="mb-1.5 text-[13px] font-medium text-fg">What is wrong with it?</legend>

        <label
          v-for="option in REPORT_REASONS"
          :key="option.value"
          :class="[
            'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors',
            reason === option.value ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong hover:bg-raised'
          ]"
        >
          <input v-model="reason" type="radio" :value="option.value" name="report-reason" class="mt-0.5 accent-accent" />
          <span class="min-w-0">
            <span :class="['block text-[13px] font-medium', reason === option.value ? 'text-accent' : 'text-fg']">
              {{ option.label }}
            </span>
            <span class="block text-xs text-muted">{{ option.hint }}</span>
          </span>
        </label>
      </fieldset>

      <div>
        <Textarea
          v-model="note"
          :label="ReportOptionsRef.noteLabel"
          :rows="3"
          :mono="false"
          :maxlength="REPORT_NOTE_MAX"
          placeholder="Optional"
        />
        <p class="mt-1 text-right text-[11px] text-faint">{{ note.length }} / {{ REPORT_NOTE_MAX }}</p>
      </div>
    </form>

    <template #footer>
      <Button variant="ghost" @click="answer(false)">Cancel</Button>
      <Button variant="danger" :disabled="!reason" @click="answer(true)">
        {{ ReportOptionsRef.confirmLabel || "Send report" }}
      </Button>
    </template>
  </Dialog>
</template>
