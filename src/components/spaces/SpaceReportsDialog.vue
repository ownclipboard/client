<script setup lang="ts">
/**
 * What members have reported in this space, for its owner to answer. Two ways
 * to answer one: delete the clip, which closes every report about it, or leave
 * the clip and dismiss the report.
 *
 * The snapshot is what the clip said when it was reported, kept by the api in
 * case the author edits or deletes it afterwards, so it is the thing to show:
 * the clip itself may no longer be what was complained about, or be there.
 */
import { ref, watch } from "vue";
import { FlagIcon, TrashIcon } from "@heroicons/vue/20/solid";
import { alertRequestError } from "../../http";
import { $events } from "../../events";
import { askToConfirm } from "../ConfirmHandler";
import { REASON_LABELS } from "../../data/reports";
import {
  deleteSpaceClip,
  dismissSpaceReport,
  getSpaceReports,
  type SpaceReport
} from "../../services/spaces.service";
import { refreshSpaceReports } from "../../stores/spaces.store";
import Dialog from "../ui/Dialog.vue";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Skeleton from "../ui/Skeleton.vue";
import EmptyState from "../ui/EmptyState.vue";

const props = defineProps<{ open: boolean; spaceId: string }>();
const emit = defineEmits<{ (e: "close"): void }>();

type Status = SpaceReport["status"];

const FILTERS: { value: Status; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" }
];

const status = ref<Status>("open");
const reports = ref<SpaceReport[]>([]);
const loading = ref(true);
const working = ref("");

async function load() {
  loading.value = true;
  try {
    const res = await getSpaceReports(props.spaceId, status.value);
    reports.value = res.reports;
    // `open` counts them whatever was asked for, so the badge is right either way.
    refreshSpaceReports(props.spaceId);
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    status.value = "open";
    load();
  },
  { immediate: true }
);

watch(status, () => props.open && load());

/** Deletes the clip for everyone in the space and closes its reports. */
async function removeClip(report: SpaceReport) {
  if (!report.clip) return;

  const ok = await askToConfirm({
    title: `Delete ${report.author || "this member"}'s clip?`,
    message: "The clip is deleted for everyone in the space and its reports are closed.",
    confirmLabel: "Delete",
    danger: true
  });
  if (!ok) return;

  working.value = report.publicId;
  try {
    await deleteSpaceClip(props.spaceId, report.clip);
    $events.emit("space:clips-changed");
    await load();
  } catch (e) {
    alertRequestError(e);
  } finally {
    working.value = "";
  }
}

/** Keeps the clip and closes the report. */
async function dismiss(report: SpaceReport) {
  working.value = report.publicId;
  try {
    await dismissSpaceReport(props.spaceId, report.publicId);
    await load();
  } catch (e) {
    alertRequestError(e);
  } finally {
    working.value = "";
  }
}

const STATUS_BADGE: Record<Status, "warn" | "danger" | "neutral"> = {
  open: "warn",
  actioned: "danger",
  dismissed: "neutral"
};

const EMPTY: Record<Status, string> = {
  open: "No open reports.",
  actioned: "No reports where the clip was deleted.",
  dismissed: "No dismissed reports."
};
</script>

<template>
  <Dialog
    :open="open"
    size="lg"
    title="Reported clips"
    description="What members have reported in this space. Only you can see this."
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div class="flex gap-1.5" role="tablist" aria-label="Report status">
        <button
          v-for="filter in FILTERS"
          :key="filter.value"
          type="button"
          role="tab"
          :aria-selected="status === filter.value"
          :class="[
            'rounded-md border px-2.5 py-1 text-[13px] font-medium transition-colors',
            status === filter.value
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line text-muted hover:border-line-strong hover:text-fg'
          ]"
          @click="status = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <div v-if="loading" class="space-y-2">
        <Skeleton v-for="i in 2" :key="i" class="h-28" />
      </div>

      <EmptyState v-else-if="!reports.length" title="Nothing here" :description="EMPTY[status]">
        <template #icon><FlagIcon /></template>
      </EmptyState>

      <ul v-else class="space-y-3">
        <li
          v-for="report in reports"
          :key="report.publicId"
          :class="[
            'rounded-lg border border-line bg-surface p-3.5',
            working === report.publicId ? 'opacity-50' : ''
          ]"
        >
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="outline" uppercase>{{ REASON_LABELS[report.reason] || report.reason }}</Badge>
            <Badge :variant="STATUS_BADGE[report.status]">{{ report.status }}</Badge>
            <span class="text-[11px] text-faint"><TimeAgo :date="report.createdAt" /></span>
          </div>

          <p class="mt-2 text-[13px] text-muted">
            <span class="font-medium text-fg">{{ report.reportedBy || "A member" }}</span> reported
            <span class="font-medium text-fg">{{ report.author || "a member" }}</span>'s clip
          </p>

          <p v-if="report.note" class="mt-1.5 border-l-2 border-line-strong pl-2.5 text-[13px] italic text-fg/90">
            {{ report.note }}
          </p>

          <!-- What it said when it was reported, which the clip may no longer say. -->
          <div v-if="report.snapshot" class="mt-2.5 rounded-md bg-sunken px-3 py-2">
            <p v-if="report.snapshot.title" class="truncate text-[13px] font-medium text-fg">
              {{ report.snapshot.title }}
            </p>
            <p v-if="report.snapshot.fileName" class="truncate font-mono text-xs text-muted">
              {{ report.snapshot.fileName }}
            </p>
            <pre
              v-if="report.snapshot.context"
              class="mt-0.5 max-h-32 overflow-y-auto scroll-thin whitespace-pre-wrap break-words text-xs leading-relaxed text-clip-fg"
            >{{ report.snapshot.context }}</pre>
          </div>

          <p v-if="!report.clip" class="mt-2 text-xs text-faint">The clip is already gone.</p>

          <div v-if="report.status === 'open'" class="mt-3 flex flex-wrap gap-2">
            <Button v-if="report.clip" size="sm" variant="danger" @click="removeClip(report)">
              <TrashIcon class="h-4 w-4" />Delete the clip
            </Button>
            <Button size="sm" @click="dismiss(report)">Dismiss</Button>
          </div>
          <p v-else-if="report.resolvedAt" class="mt-2 text-xs text-faint">
            {{ report.status === "actioned" ? "Clip deleted" : "Dismissed" }} <TimeAgo :date="report.resolvedAt" />
          </p>
        </li>
      </ul>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Close</Button>
    </template>
  </Dialog>
</template>
