<script setup lang="ts">
/**
 * Header of a space: its name and folders on one side, search and the ways to
 * add a clip on the other. Owns the paste, compose and upload flows, the same
 * three the personal clipboard has, pointed at the space endpoints.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  ClipboardIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  FolderPlusIcon,
  PencilSquareIcon,
  UsersIcon
} from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $alert } from "../ws-alert/ws-alert";
import { $events } from "../../events";
import { readPasteEvent, readSystemClipboard } from "../../services/paste.service";
import {
  createSpaceFolder,
  pasteIntoSpace,
  startSpaceUpload,
  confirmSpaceUpload,
  type SpaceFolder
} from "../../services/spaces.service";
import {
  currentSpace,
  currentSpaceFolder,
  currentSpaceFolders,
  refreshSpaceFolders,
  spaceUploadIssue
} from "../../stores/spaces.store";
import { putToStorage, StorageUploadBlockedError, humanFileSize } from "../../services/files.service";
import { showStorageCorsHelp } from "../StorageCorsHandler";
import Button from "../ui/Button.vue";
import Input from "../ui/Input.vue";
import Badge from "../ui/Badge.vue";
import UploadDialog, { type UploadItem, type UploadResults } from "../clips/UploadDialog.vue";
import SpaceComposer from "./SpaceComposer.vue";

const props = defineProps<{ spaceId: string }>();
const emit = defineEmits<{ (e: "settings"): void; (e: "update:query", q: string): void }>();

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const query = ref("");

function onSearch(value: string) {
  query.value = value;
  emit("update:query", value.trim());
}

function onClearSearch() {
  query.value = "";
  emit("update:query", "");
}
$events.on("space:clear-search", onClearSearch);
onBeforeUnmount(() => $events.off("space:clear-search", onClearSearch));

/* ---------------- Folders ---------------- */

const addingFolder = ref(false);
const newFolderName = ref("");

function selectFolder(folder: SpaceFolder) {
  currentSpaceFolder.value = folder.slug;
}

function createFolder(btn: ILoadingButton) {
  const name = newFolderName.value.trim();
  if (!name) return btn.stopLoading();

  return createSpaceFolder(props.spaceId, name)
    .then(async ({ folder }) => {
      addingFolder.value = false;
      newFolderName.value = "";
      await refreshSpaceFolders(props.spaceId);
      currentSpaceFolder.value = folder.slug;
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/* ---------------- Compose and paste ---------------- */

const composerOpen = ref(false);

async function pasteText(text: string, title?: string) {
  const content = text.trim();
  if (!content) return false;

  await pasteIntoSpace(props.spaceId, { content, title: title || undefined, folder: currentSpaceFolder.value });
  $events.emit("space:clips-changed");
  return true;
}

async function pasteFromButton(btn: ILoadingButton) {
  try {
    const item = await readSystemClipboard();
    if (!item) return $alert.info("Nothing to paste. Copy some text or an image first.");
    await handlePasteItem(item);
  } catch (e) {
    alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}

async function handlePasteItem(item: NonNullable<ReturnType<typeof readPasteEvent>>) {
  if (item.type === "text") await pasteText(item.data);
  else queueFiles([item.data]);
}

function isEditable(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  return !!node && (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.isContentEditable);
}

async function onWindowPaste(e: ClipboardEvent) {
  if (isEditable(e.target) || composerOpen.value) return;
  const item = readPasteEvent(e);
  if (!item) return;
  e.preventDefault();
  try {
    await handlePasteItem(item);
  } catch (err) {
    alertRequestError(err);
  }
}

/* ---------------- Upload ---------------- */

const fileInput = ref<HTMLInputElement>();
const pendingFiles = ref<File[]>([]);
const isUploading = ref(false);
const uploadIndex = ref(-1);
const uploadProgress = ref<number | null>(null);
const uploadResults = ref<UploadResults>({});

function pickFile() {
  if (spaceUploadIssue.value) return $alert.warning(spaceUploadIssue.value);
  fileInput.value?.click();
}

function queueFiles(files: File[]) {
  hideDropTarget();
  if (!files.length) return;

  if (spaceUploadIssue.value) {
    $alert.warning(spaceUploadIssue.value);
    return;
  }

  pendingFiles.value = files;
  uploadResults.value = {};
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = "";
  queueFiles(files);
}

function cancelUpload() {
  if (isUploading.value) return;
  pendingFiles.value = [];
  uploadResults.value = {};
}

function onRemoveFile(index: number) {
  const next: UploadResults = {};
  for (const [k, v] of Object.entries(uploadResults.value)) {
    const i = Number(k);
    if (i < index) next[i] = v;
    else if (i > index) next[i - 1] = v;
  }
  uploadResults.value = next;
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index);
}

function uploadErrorMessage(e: any) {
  return e?.response?.data?.error || e?.message || "Upload failed.";
}

/** Slot from the api, bytes straight to storage, then confirm. */
async function uploadOne(file: File, title?: string) {
  const { clip, upload } = await startSpaceUpload(props.spaceId, {
    name: file.name,
    title: title || undefined,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    folder: currentSpaceFolder.value
  });

  await putToStorage(upload.url, upload.method, upload.headers, file, (p) => (uploadProgress.value = p));
  await confirmSpaceUpload(props.spaceId, clip.publicId);
}

async function confirmUpload(items: UploadItem[]) {
  isUploading.value = true;
  let uploaded = 0;
  let failed = 0;
  let blocked: StorageUploadBlockedError | null = null;

  try {
    for (const { index, file, title } of items) {
      uploadIndex.value = index;
      uploadProgress.value = 0;
      try {
        await uploadOne(file, title);
        uploadResults.value = { ...uploadResults.value, [index]: true };
        uploaded++;
      } catch (e: any) {
        uploadResults.value = { ...uploadResults.value, [index]: uploadErrorMessage(e) };
        failed++;
        if (e instanceof StorageUploadBlockedError) {
          blocked = e;
          break; // every file fails the same way
        }
      }
    }
  } finally {
    isUploading.value = false;
    uploadIndex.value = -1;
    uploadProgress.value = null;
  }

  if (uploaded) $events.emit("space:clips-changed");

  if (!failed) {
    pendingFiles.value = [];
    uploadResults.value = {};
  } else if (blocked) {
    showStorageCorsHelp(blocked.url, blocked.kind);
  } else {
    $alert.error(`${failed} ${failed === 1 ? "file" : "files"} failed to upload. Each row says why.`);
  }
}

/* ---------------- Drag and drop ---------------- */

const draggingFiles = ref(false);
let dragTimer: ReturnType<typeof setTimeout> | undefined;

function hasFiles(e: DragEvent) {
  return Array.from(e.dataTransfer?.types || []).includes("Files");
}

function showDropTarget() {
  draggingFiles.value = true;
  if (dragTimer) clearTimeout(dragTimer);
  dragTimer = setTimeout(hideDropTarget, 700);
}

function hideDropTarget() {
  if (dragTimer) clearTimeout(dragTimer);
  dragTimer = undefined;
  draggingFiles.value = false;
}

function onDragEnter(e: DragEvent) {
  if (!hasFiles(e)) return;
  e.preventDefault();
  showDropTarget();
}

function onDragOver(e: DragEvent) {
  if (!hasFiles(e)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  showDropTarget();
}

function onDragLeave(e: DragEvent) {
  if (hasFiles(e) && !e.relatedTarget) hideDropTarget();
}

function onDrop(e: DragEvent) {
  if (!hasFiles(e)) return;
  e.preventDefault();
  queueFiles(Array.from(e.dataTransfer?.files || []));
}

const DRAG_EVENTS = [
  ["dragenter", onDragEnter],
  ["dragover", onDragOver],
  ["dragleave", onDragLeave],
  ["drop", onDrop],
  ["dragend", hideDropTarget]
] as const;

onMounted(() => {
  window.addEventListener("paste", onWindowPaste);
  for (const [name, fn] of DRAG_EVENTS) window.addEventListener(name, fn as EventListener);
});
onBeforeUnmount(() => {
  window.removeEventListener("paste", onWindowPaste);
  for (const [name, fn] of DRAG_EVENTS) window.removeEventListener(name, fn as EventListener);
  hideDropTarget();
});

/* ---------------- Header figures ---------------- */

const storageLabel = computed(() => {
  const storage = currentSpace.value?.limits.storage;
  if (!storage) return "";
  return `${humanFileSize(storage.used)} of ${humanFileSize(storage.max)}`;
});

const folderName = computed(
  () => currentSpaceFolders.value.find((f) => f.slug === currentSpaceFolder.value)?.name || "Clipboard"
);
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="truncate text-lg font-semibold tracking-tight text-fg">{{ currentSpace?.name }}</h1>
          <Badge variant="accent" uppercase>Space</Badge>
        </div>
        <p class="flex items-center gap-2 font-mono text-[11px] text-faint">
          <span class="inline-flex items-center gap-1"><UsersIcon class="h-3 w-3" />{{ currentSpace?.members }}</span>
          <span v-if="storageLabel">· {{ storageLabel }}</span>
        </p>
      </div>

      <div class="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        <Input
          :model-value="query"
          size="sm"
          class="w-full sm:w-56"
          :placeholder="`Search in ${currentSpace?.name || 'space'}`"
          @update:model-value="onSearch"
        />
        <div class="flex items-center gap-2">
          <Button variant="primary" size="sm" :click="pasteFromButton" message="Pasting">
            <ClipboardIcon class="h-4 w-4" />
            Paste
            <span class="ml-0.5 hidden rounded border border-accent-fg/30 px-1 font-mono text-[10px] font-medium text-accent-fg/80 sm:inline-block">
              {{ isMac ? "⌘V" : "Ctrl+V" }}
            </span>
          </Button>
          <Button size="sm" :disabled="composerOpen" @click="composerOpen = true">
            <PencilSquareIcon class="h-4 w-4" />New
          </Button>
          <Button size="sm" :disabled="isUploading" :title="spaceUploadIssue || undefined" @click="pickFile">
            <CloudArrowUpIcon class="h-4 w-4" />Upload
          </Button>
          <Button size="sm" variant="ghost" title="Space settings" @click="emit('settings')">
            <Cog6ToothIcon class="h-4 w-4" />
          </Button>
          <input ref="fileInput" type="file" multiple class="hidden" @change="onFilePicked" />
        </div>
      </div>
    </div>

    <!-- Folders -->
    <div class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="folder in currentSpaceFolders"
        :key="folder.slug"
        type="button"
        :class="[
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
          folder.slug === currentSpaceFolder
            ? 'border-transparent bg-accent-soft text-accent'
            : 'border-line bg-surface text-muted hover:text-fg'
        ]"
        @click="selectFolder(folder)"
      >
        {{ folder.name }}
        <span class="font-mono tabular-nums opacity-70">{{ folder.contents ?? 0 }}</span>
      </button>

      <form v-if="addingFolder" class="flex items-center gap-1.5" @submit.prevent>
        <Input v-model="newFolderName" size="sm" placeholder="Folder name" class="w-40" />
        <Button size="sm" variant="primary" type="submit" :click="createFolder" message="">Add</Button>
        <Button size="sm" variant="ghost" @click="addingFolder = false">Cancel</Button>
      </form>
      <button
        v-else
        type="button"
        class="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
        @click="addingFolder = true"
      >
        <FolderPlusIcon class="h-3.5 w-3.5" />New folder
      </button>
    </div>

    <SpaceComposer v-if="composerOpen" :folder-name="folderName" :save="pasteText" @close="composerOpen = false" />
  </div>

  <Teleport to="body">
    <div
      v-if="draggingFiles"
      class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6 backdrop-blur-[2px]"
      aria-hidden="true"
    >
      <div
        :class="[
          'flex max-w-sm flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-surface px-10 py-12 text-center shadow-pop',
          spaceUploadIssue ? 'border-warn' : 'border-accent'
        ]"
      >
        <CloudArrowUpIcon :class="['h-9 w-9', spaceUploadIssue ? 'text-warn' : 'text-accent']" />
        <p class="text-[15px] font-medium text-fg">{{ spaceUploadIssue ? "Can't upload here" : "Drop to upload" }}</p>
        <p class="text-sm text-muted">{{ spaceUploadIssue || `Files go into ${folderName}, for everyone in the space.` }}</p>
      </div>
    </div>
  </Teleport>

  <UploadDialog
    :files="pendingFiles"
    :folder-name="folderName"
    :uploading="isUploading"
    :current-index="uploadIndex"
    :progress="uploadProgress"
    :results="uploadResults"
    @confirm="confirmUpload"
    @remove="onRemoveFile"
    @cancel="cancelUpload"
  />
</template>
