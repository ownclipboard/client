<script setup lang="ts">
/**
 * Confirm files before they upload: image previews, optional titles, per-file
 * progress and retry. Stays open until every file went through.
 */
import { computed, onBeforeUnmount, reactive, watch, type PropType } from "vue";
import { ArrowPathIcon, CheckCircleIcon, CloudArrowUpIcon, DocumentIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/vue/20/solid";
import { humanFileSize } from "../../services/files.service";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";

export type UploadItem = { index: number; file: File; title: string };
/** Per-row outcome reported by the parent: true = uploaded, string = error message. */
export type UploadResults = Record<number, true | string>;

const props = defineProps({
  files: { type: Array as PropType<File[]>, required: true },
  folderName: { type: String, default: "" },
  uploading: { type: Boolean, default: false },
  currentIndex: { type: Number, default: -1 },
  progress: { type: Number as PropType<number | null>, default: null },
  results: { type: Object as PropType<UploadResults>, default: () => ({}) }
});

const emit = defineEmits<{
  (e: "confirm", items: UploadItem[]): void;
  (e: "cancel"): void;
  (e: "remove", index: number): void;
}>();

type Row = { file: File; title: string; preview: string | null };
const rows = reactive<Row[]>([]);

const isDone = (i: number) => props.results[i] === true;
const errorOf = (i: number) => (typeof props.results[i] === "string" ? (props.results[i] as string) : null);
const isImage = (file: File) => file.type.startsWith("image/");

function revokeAll() {
  rows.forEach((r) => r.preview && URL.revokeObjectURL(r.preview));
}

watch(
  () => props.files,
  (files) => {
    const titles = new Map(rows.map((r) => [r.file, r.title]));
    revokeAll();
    rows.splice(0, rows.length, ...files.map<Row>((file) => ({
      file,
      title: titles.get(file) ?? "",
      preview: isImage(file) ? URL.createObjectURL(file) : null
    })));
  },
  { immediate: true }
);

onBeforeUnmount(revokeAll);

const totalSize = computed(() => rows.reduce((n, r) => n + r.file.size, 0));
const remaining = computed(() => rows.map((r, index) => ({ ...r, index })).filter((r) => !isDone(r.index)));
const hasFailures = computed(() => rows.some((_, i) => errorOf(i) !== null));

function remove(index: number) {
  if (props.uploading) return;
  const row = rows[index];
  if (row?.preview) URL.revokeObjectURL(row.preview);
  emit("remove", index);
  rows.splice(index, 1);
  if (!rows.length) emit("cancel");
}

function confirm() {
  if (props.uploading || !remaining.value.length) return;
  emit("confirm", remaining.value.map(({ index, file, title }) => ({ index, file, title: title.trim() })));
}

function cancel() {
  if (props.uploading) return;
  emit("cancel");
}
</script>

<template>
  <Dialog
    :open="files.length > 0"
    size="lg"
    :title="rows.length > 1 ? `Upload ${rows.length} files` : 'Upload file'"
    :description="folderName ? `Into ${folderName}` : ''"
    :dismissable="!uploading"
    flush
    @close="cancel"
  >
    <ul class="divide-y divide-line">
      <li
        v-for="(row, i) in rows"
        :key="row.file.name + i"
        :class="['flex items-start gap-3 px-5 py-3', isDone(i) ? 'opacity-60' : '']"
      >
        <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-sunken">
          <img v-if="row.preview" :src="row.preview" :alt="row.file.name" class="h-full w-full object-cover" />
          <DocumentIcon v-else class="h-6 w-6 text-faint" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-fg" :title="row.file.name">{{ row.file.name }}</div>
          <div class="font-mono text-[11px] text-faint">{{ humanFileSize(row.file.size) }}<span v-if="row.file.type"> · {{ row.file.type }}</span></div>
          <input
            v-model="row.title"
            type="text"
            placeholder="Title (optional)"
            :disabled="uploading || isDone(i)"
            class="mt-2 block h-8 w-full rounded-md border border-line bg-surface px-2.5 text-[13px] text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <div v-if="uploading && currentIndex === i" class="mt-2">
            <div class="h-1.5 overflow-hidden rounded-full bg-sunken">
              <div class="h-full bg-accent transition-[width]" :style="{ width: `${progress ?? 0}%` }"></div>
            </div>
            <div class="mt-1 font-mono text-[11px] text-muted">Uploading {{ progress ?? 0 }}%</div>
          </div>
          <div v-else-if="isDone(i)" class="mt-2 flex items-center gap-1 text-xs text-accent"><CheckCircleIcon class="h-4 w-4" /> Uploaded</div>
          <div v-else-if="errorOf(i)" class="mt-2 flex items-start gap-1 text-xs text-danger"><ExclamationCircleIcon class="h-4 w-4 shrink-0" /> {{ errorOf(i) }}</div>
        </div>

        <button
          v-if="!uploading && !isDone(i)"
          type="button"
          class="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-faint hover:bg-raised hover:text-danger"
          aria-label="Remove file"
          @click="remove(i)"
        >
          <XMarkIcon class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <template #footer>
      <span class="mr-auto font-mono text-xs text-muted">Total {{ humanFileSize(totalSize) }}</span>
      <Button variant="ghost" :disabled="uploading" @click="cancel">{{ hasFailures ? "Close" : "Cancel" }}</Button>
      <Button variant="primary" :disabled="uploading || !remaining.length" @click="confirm">
        <template v-if="uploading"><ArrowPathIcon class="h-4 w-4 animate-spin" /> Uploading</template>
        <template v-else-if="hasFailures"><ArrowPathIcon class="h-4 w-4" /> Retry failed</template>
        <template v-else><CloudArrowUpIcon class="h-4 w-4" /> Upload</template>
      </Button>
    </template>
  </Dialog>
</template>
