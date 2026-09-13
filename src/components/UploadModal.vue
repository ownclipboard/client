<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, watch, type PropType } from "vue";
import Modal from "./Modal.vue";
import { humanFileSize } from "../services/files.service";

export type UploadItem = { index: number; file: File; title: string };
/** Per-row outcome reported by the parent: true = uploaded, string = error message. */
export type UploadResults = Record<number, true | string>;

const props = defineProps({
  files: { type: Array as PropType<File[]>, required: true },
  folderName: { type: String, default: "" },
  // Set by the parent while it uploads: index of the file in flight and its progress.
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

function isDone(i: number) {
  return props.results[i] === true;
}
function errorOf(i: number) {
  const r = props.results[i];
  return typeof r === "string" ? r : null;
}

function isImage(file: File) {
  return file.type.startsWith("image/");
}

function revokeAll() {
  rows.forEach((r) => r.preview && URL.revokeObjectURL(r.preview));
}

watch(
  () => props.files,
  (files) => {
    // Keep titles already typed when the list is rebuilt (e.g. after removing a row).
    const titles = new Map(rows.map((r) => [r.file, r.title]));
    revokeAll();
    rows.splice(
      0,
      rows.length,
      ...files.map<Row>((file) => ({
        file,
        title: titles.get(file) ?? "",
        preview: isImage(file) ? URL.createObjectURL(file) : null
      }))
    );
  },
  { immediate: true }
);

onBeforeUnmount(revokeAll);

const totalSize = computed(() => rows.reduce((n, r) => n + r.file.size, 0));
// Rows still waiting to be uploaded (not done). Failed rows are retried.
const remaining = computed(() => rows.map((r, index) => ({ ...r, index })).filter((r) => !isDone(r.index)));
const hasFailures = computed(() => rows.some((_, i) => errorOf(i) !== null));

function remove(index: number) {
  if (props.uploading) return;
  // Rows are keyed by index in `results`, so blank the row instead of shifting the array.
  const row = rows[index];
  if (row?.preview) URL.revokeObjectURL(row.preview);
  emit("remove", index);
  rows.splice(index, 1);
  if (!rows.length) emit("cancel");
}

function confirm() {
  if (props.uploading || !remaining.value.length) return;
  emit(
    "confirm",
    remaining.value.map(({ index, file, title }) => ({ index, file, title: title.trim() }))
  );
}

function cancel() {
  if (props.uploading) return;
  emit("cancel");
}
</script>

<template>
  <Modal max-size="max-w-2xl" @close-modal="cancel">
    <div @keydown.esc="cancel">
      <div class="text-xl p-3 border-b border-gray-800 text-green-400 font-bold">
        Upload {{ rows.length > 1 ? `${rows.length} files` : "file" }}
        <span v-if="folderName" class="text-sm font-normal text-gray-400 ml-2">to {{ folderName }}</span>
      </div>

      <div class="p-3 max-h-[60vh] overflow-y-auto space-y-3">
        <div
          v-for="(row, i) in rows"
          :key="row.file.name + i"
          class="flex items-start space-x-3 bg-gray-800 rounded p-2 border"
          :class="errorOf(i) ? 'border-red-800' : isDone(i) ? 'border-transparent opacity-60' : 'border-transparent'">
          <div class="flex-shrink-0 w-24 h-24 bg-gray-900 rounded flex items-center justify-center overflow-hidden">
            <img v-if="row.preview" :src="row.preview" :alt="row.file.name" class="max-w-full max-h-full object-contain" />
            <i v-else class="far fa-file fa-3x text-gray-500"></i>
          </div>

          <div class="flex-1 min-w-0">
            <div class="font-medium break-all">{{ row.file.name }}</div>
            <div class="text-xs text-gray-400">
              {{ humanFileSize(row.file.size) }}
              <span v-if="row.file.type" class="ml-2">{{ row.file.type }}</span>
            </div>
            <input
              v-model="row.title"
              type="text"
              placeholder="Title (optional)"
              :disabled="uploading || isDone(i)"
              class="mt-2 w-full bg-gray-900 rounded px-2 py-1 text-sm placeholder:opacity-40 focus:outline-none" />

            <div v-if="uploading && currentIndex === i" class="mt-2">
              <div class="h-1.5 bg-gray-900 rounded overflow-hidden">
                <div class="h-full bg-green-400 transition-all" :style="{ width: `${progress ?? 0}%` }"></div>
              </div>
              <div class="text-xs text-gray-400 mt-1">Uploading {{ progress ?? 0 }}%</div>
            </div>
            <div v-else-if="isDone(i)" class="mt-2 text-xs text-green-400">
              <i class="fa fa-check mr-1"></i>Uploaded
            </div>
            <div v-else-if="errorOf(i)" class="mt-2 text-xs text-red-400">
              <i class="fa fa-exclamation-circle mr-1"></i>{{ errorOf(i) }}
            </div>
          </div>

          <button
            v-if="!uploading && !isDone(i)"
            type="button"
            @click="remove(i)"
            title="Remove"
            class="text-gray-500 hover:text-red-400 px-1">
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>

      <div class="p-3 border-t border-gray-800 flex items-center justify-between">
        <span class="text-sm text-gray-400">Total: {{ humanFileSize(totalSize) }}</span>
        <div class="space-x-3 text-sm font-medium">
          <button
            type="button"
            @click="cancel"
            :disabled="uploading"
            class="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700">
            {{ hasFailures ? "Close" : "Cancel" }}
          </button>
          <button
            type="button"
            @click="confirm"
            :disabled="uploading || !remaining.length"
            class="px-3 py-2 rounded bg-green-300 hover:bg-green-400 text-gray-800">
            <template v-if="uploading"><i class="fa fa-slash fa-spin mr-1"></i>Uploading...</template>
            <template v-else-if="hasFailures"><i class="fa fa-redo mr-1"></i>Retry failed</template>
            <template v-else><i class="fa fa-cloud-upload mr-1"></i>Upload</template>
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>
