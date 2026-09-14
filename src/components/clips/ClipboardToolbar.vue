<script setup lang="ts">
/**
 * Top bar of the clipboard: current folder, search, and the Paste / New /
 * Upload actions. Also owns the upload flow and the global paste shortcut.
 */
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { ClipboardIcon, CloudArrowUpIcon, ExclamationTriangleIcon, LockClosedIcon, PencilSquareIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { currentFolder, currentFolderNeedsPassword, currentTab, getFolders } from "../../stores/tabs.store";
import { composerOpen, openComposer } from "../../stores/composer.store";
import { openFolderSettings } from "../../stores/folder-settings.store";
import { searchQuery, searchAllFolders } from "../../stores/search.store";
import { useAuthUser } from "../../stores/auth.store";
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
const authUser = useAuthUser();
const $router = useRouter();

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
  if (isEditable(e.target) || composerOpen.value || currentFolderNeedsPassword.value) return;
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
  if (currentFolderNeedsPassword.value) return;
  if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target) && !composerOpen.value) {
    e.preventDefault();
    openComposer();
  }
}

const DRAG_EVENTS = [
  ["dragenter", onDragEnter],
  ["dragover", onDragOver],
  ["dragleave", onDragLeave],
  ["drop", onDrop],
  ["dragend", onDragEnd]
] as const;

onMounted(() => {
  window.addEventListener("paste", onWindowPaste);
  window.addEventListener("keydown", onKeydown);
  for (const [name, fn] of DRAG_EVENTS) window.addEventListener(name, fn as EventListener);
});
onBeforeUnmount(() => {
  window.removeEventListener("paste", onWindowPaste);
  window.removeEventListener("keydown", onKeydown);
  for (const [name, fn] of DRAG_EVENTS) window.removeEventListener(name, fn as EventListener);
  hideDropTarget();
});

/* ---------------- Upload ---------------- */

const fileInput = ref<HTMLInputElement>();
const pendingFiles = ref<File[]>([]);
const isUploading = ref(false);
const uploadIndex = ref(-1);
const uploadProgress = ref<number | null>(null);
const uploadResults = ref<UploadResults>({});

/**
 * With no storage connected there is nowhere to put a file, so send the user to
 * the place that fixes it rather than opening a picker that cannot finish.
 */
function pickFile() {
  if (!authUser.canUpload) {
    $alert.warning(authUser.uploadBlockedReason);
    return $router.push({ name: "settings", query: { tab: "storage" } });
  }
  fileInput.value?.click();
}

/**
 * Why a file cannot be taken right now, or "" when one can. Files go to the
 * user's own storage, and an encrypted folder has no way to encrypt them.
 */
const uploadIssue = computed(() => {
  if (!authUser.canUpload) return `${authUser.uploadBlockedReason} You can fix that in settings.`;

  const folder = currentFolder.value;
  if (folder && (folder.visibility === "encrypted" || folder.hasPassword)) {
    return "Files can't be uploaded into an encrypted folder.";
  }
  return "";
});

function queueFiles(files: File[]) {
  hideDropTarget();
  if (!files.length) return;

  // A pasted or dropped file should not yank the page elsewhere, so only say what is wrong.
  if (uploadIssue.value) {
    $alert.warning(uploadIssue.value);
    return;
  }

  pendingFiles.value = files;
  uploadResults.value = {};
}

/* ---------------- Drag and drop ---------------- */

// dragenter and dragleave fire for every child element, so count them instead of
// Counting dragenter against dragleave drifts out of step on a real drag and
// leaves the overlay stuck on screen. Instead the overlay follows dragover,
// which repeats for as long as a drag is over the page: when it stops arriving,
// the drag is over, whatever the browser did or did not send us.
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
  // Without this the browser refuses the drop and opens the file in a tab instead.
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  showDropTarget();
}

/** Only a leave with no destination means the pointer left the window. */
function onDragLeave(e: DragEvent) {
  if (hasFiles(e) && !e.relatedTarget) hideDropTarget();
}

function onDrop(e: DragEvent) {
  if (!hasFiles(e)) return;
  e.preventDefault();
  hideDropTarget();
  queueFiles(Array.from(e.dataTransfer?.files || []));
}

function onDragEnd() {
  hideDropTarget();
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
const needsPassword = computed(() => currentFolderNeedsPassword.value);
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
        <Button v-if="needsPassword" variant="primary" @click="openFolderSettings(currentTab)">
          <LockClosedIcon class="h-4 w-4" />
          Set a password
        </Button>
        <template v-else>
        <Button variant="primary" :click="pasteFromButton" message="Pasting">
          <ClipboardIcon class="h-4 w-4" />
          Paste
          <span class="ml-0.5 hidden rounded border border-accent-fg/30 px-1 font-mono text-[10px] font-medium text-accent-fg/80 sm:inline-block">{{ isMac ? "⌘V" : "Ctrl+V" }}</span>
        </Button>
        <Button @click="openComposer" :disabled="composerOpen">
          <PencilSquareIcon class="h-4 w-4" />
          New
        </Button>
        <Button
          :disabled="isUploading"
          :title="authUser.canUpload ? undefined : authUser.uploadBlockedReason"
          @click="pickFile"
        >
          <CloudArrowUpIcon class="h-4 w-4" />
          Upload
        </Button>
        </template>
        <input ref="fileInput" type="file" multiple class="hidden" @change="onFilePicked" />
        </div>
      </div>
    </div>

    <!-- Encrypted folder that cannot take clips yet -->
    <div v-if="needsPassword" class="flex items-start gap-2.5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
      <LockClosedIcon class="mt-px h-4 w-4 shrink-0" />
      <p>This folder encrypts its clips in your browser, so it needs a password before you can add anything.</p>
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

  <!-- Drop anywhere on the page while dragging files in -->
  <Teleport to="body">
    <div
      v-if="draggingFiles"
      class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6 backdrop-blur-[2px]"
      aria-hidden="true"
    >
      <div
        :class="[
          'flex max-w-sm flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-surface px-10 py-12 text-center shadow-pop',
          uploadIssue ? 'border-warn' : 'border-accent'
        ]"
      >
        <ExclamationTriangleIcon v-if="uploadIssue" class="h-9 w-9 text-warn" />
        <CloudArrowUpIcon v-else class="h-9 w-9 text-accent" />

        <p class="text-[15px] font-medium text-fg">{{ uploadIssue ? "Can't upload here" : "Drop to upload" }}</p>
        <p class="text-sm text-muted">
          {{ uploadIssue || `Files go into ${currentFolder?.name || "this folder"}.` }}
        </p>
      </div>
    </div>
  </Teleport>

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
