<script setup lang="ts">
/**
 * Top bar of the clipboard: current folder, search, and the Paste / New /
 * Upload actions. Also owns the upload flow and the global paste shortcut.
 */
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { ClipboardIcon, CloudArrowUpIcon, PencilSquareIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { currentFolder, currentTab, getFolders } from "../../stores/tabs.store";
import { composerOpen, openComposer } from "../../stores/composer.store";
import { searchQuery, searchAllFolders } from "../../stores/search.store";
import { pasteText, readPasteEvent, readSystemClipboard } from "../../services/paste.service";
import { StorageUploadBlockedError, uploadFile } from "../../services/files.service";
import { showStorageCorsHelp } from "../StorageCorsHandler";
import { $events } from "../../events";
import { $alert } from "../ws-alert/ws-alert";
import { alertRequestError } from "../../http";
import ClipsSearch from "../ClipsSearch.vue";
import UploadDialog, { type UploadItem, type UploadResults } from "./UploadDialog.vue";
import Button from "../ui/Button.vue";

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

/* ---------------- Paste ---------------- */

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

// Cmd/Ctrl+V anywhere on the page (outside inputs) pastes into the current folder.
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

// `n` opens the composer.
function onKeydown(e: KeyboardEvent) {
  if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target) && !composerOpen.value) {
    e.preventDefault();
    openComposer();
  }
}

onMounted(() => {
  window.addEventListener("paste", onWindowPaste);
  window.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener("paste", onWindowPaste);
  window.removeEventListener("keydown", onKeydown);
});

/* ---------------- Upload ---------------- */

const fileInput = ref<HTMLInputElement>();
const pendingFiles = ref<File[]>([]);
const isUploading = ref(false);
const uploadIndex = ref(-1);
const uploadProgress = ref<number | null>(null);
const uploadResults = ref<UploadResults>({});

function pickFile() {
  fileInput.value?.click();
}

function queueFiles(files: File[]) {
  if (!files.length) return;
  const folder = currentFolder.value;
  if (folder && (folder.visibility === "encrypted" || folder.hasPassword)) {
    $alert.warning("Files can't be uploaded into an encrypted folder.");
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
  const apiError = e?.response?.data?.error;
  if (apiError) return String(apiError);
  return e?.message || "Upload failed.";
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
        await uploadFile(file, {
          folder: currentTab.value,
          title: title || undefined,
          onProgress: (p) => (uploadProgress.value = p)
        });
        uploadResults.value = { ...uploadResults.value, [index]: true };
        uploaded++;
      } catch (e: any) {
        uploadResults.value = { ...uploadResults.value, [index]: uploadErrorMessage(e) };
        failed++;
        if (e instanceof StorageUploadBlockedError) {
          blocked = e;
          break; // every file will fail the same way
        }
      }
    }
  } finally {
    isUploading.value = false;
    uploadIndex.value = -1;
    uploadProgress.value = null;
  }

  if (uploaded) {
    $events.emit("refreshClips");
    await getFolders();
  }

  if (!failed) {
    pendingFiles.value = [];
    uploadResults.value = {};
  } else if (blocked) {
    showStorageCorsHelp(blocked.url, blocked.kind);
  } else {
    $alert.error(`${failed} file(s) failed to upload. Fix the issue and retry, or close the dialog.`);
  }
}

const isSearching = computed(() => !!searchQuery.value);
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-lg font-semibold tracking-tight text-fg">{{ currentFolder?.name || "Clipboard" }}</h1>
        <p class="font-mono text-[11px] text-faint">{{ currentFolder?.contents ?? 0 }} clips</p>
      </div>

      <div class="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        <ClipsSearch class="w-full sm:w-64 lg:w-72" />
        <div class="flex items-center gap-2">
        <Button variant="primary" :click="pasteFromButton" message="Pasting">
          <ClipboardIcon class="h-4 w-4" />
          Paste
          <span class="ml-0.5 hidden rounded border border-accent-fg/30 px-1 font-mono text-[10px] font-medium text-accent-fg/80 sm:inline-block">{{ isMac ? "⌘V" : "Ctrl+V" }}</span>
        </Button>
        <Button @click="openComposer" :disabled="composerOpen">
          <PencilSquareIcon class="h-4 w-4" />
          New
        </Button>
        <Button :disabled="isUploading" @click="pickFile">
          <CloudArrowUpIcon class="h-4 w-4" />
          Upload
        </Button>
        <input ref="fileInput" type="file" multiple class="hidden" @change="onFilePicked" />
        </div>
      </div>
    </div>

    <!-- Search scope, only while searching -->
    <div v-if="isSearching" class="flex items-center gap-2 text-xs">
      <span class="text-faint">Searching</span>
      <button
        type="button"
        :class="['rounded-full border px-2.5 py-1 font-medium transition-colors', !searchAllFolders ? 'border-transparent bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:text-fg']"
        :aria-pressed="!searchAllFolders"
        @click="searchAllFolders = false"
      >
        {{ currentFolder?.name || "This folder" }}
      </button>
      <button
        type="button"
        :class="['rounded-full border px-2.5 py-1 font-medium transition-colors', searchAllFolders ? 'border-transparent bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:text-fg']"
        :aria-pressed="searchAllFolders"
        @click="searchAllFolders = true"
      >
        All folders
      </button>
    </div>
  </div>

  <UploadDialog
    :files="pendingFiles"
    :folder-name="currentFolder?.name || ''"
    :uploading="isUploading"
    :current-index="uploadIndex"
    :progress="uploadProgress"
    :results="uploadResults"
    @confirm="confirmUpload"
    @remove="onRemoveFile"
    @cancel="cancelUpload"
  />
</template>
