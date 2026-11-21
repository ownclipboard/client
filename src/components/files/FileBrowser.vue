<script setup lang="ts">
/**
 * The files of one place as a grid: the account's own, or a space's.
 *
 * Fetching belongs to the page above, which knows where its files come from
 * and owns the list. Everything done *to* a file is here — opening, previewing,
 * downloading, deleting — so the two pages behave alike by construction rather
 * than by being kept in step.
 *
 * `space` is the switch between the two: with it, a tile says who uploaded the
 * file and anything asked for by hand comes from the space's routes.
 *
 * Both sides are served the same way otherwise. A listing carries urls signed
 * for one shared window, which cost nothing to draw and expire together; where
 * it carries none, a space's thumbnails are fetched one by one instead.
 */
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  ArrowDownTrayIcon,
  DocumentIcon,
  FilmIcon,
  MusicalNoteIcon,
  PhotoIcon,
  TrashIcon
} from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertDeleteError, alertRequestError } from "../../http";
import {
  deleteFile,
  getFileUrl,
  humanFileSize,
  type FilePreview,
  type StoredFile
} from "../../services/files.service";
import { getSpaceFileUrl } from "../../services/spaces.service";
import { askToConfirm } from "../ConfirmHandler";
import { askForPassword } from "../PasswordPromptHandler";
import { foldersAsObject } from "../../stores/tabs.store";
import { useAuthUser } from "../../stores/auth.store";
import Select from "../ui/Select.vue";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import IconButton from "../ui/IconButton.vue";
import Skeleton from "../ui/Skeleton.vue";
import EmptyState from "../ui/EmptyState.vue";
import Paginator, { type Pagination } from "../paginator/Paginator.vue";
import FilePreviewModal from "./FilePreviewModal.vue";

const props = withDefaults(
  defineProps<{
    files: Pagination<StoredFile>;
    loading: boolean;
    folders: { slug: string; name: string }[];
    folder: string;
    type: string;
    /** The key the listing's urls are signed with, when it has one. */
    preview?: FilePreview | null;
    /** A space's publicId. Set, and every file here belongs to that space. */
    space?: string;
    /** Whether a file can be deleted from here. */
    canDelete?: boolean;
  }>(),
  { preview: null, space: "", canDelete: true }
);

const emit = defineEmits<{
  (e: "update:folder", value: string): void;
  (e: "update:type", value: string): void;
  (e: "page", page: number): void;
  /** Gone from storage. The page owns the list, so it is the page that trims it. */
  (e: "deleted", file: StoredFile): void;
  /** The listing's urls are about to expire, taking its thumbnails with them. */
  (e: "refresh"): void;
}>();

const authUser = useAuthUser();

// Kept separate from `open` so the dialog holds its content while it animates out.
const previewing = ref<StoredFile | null>(null);
const previewOpen = ref(false);

/**
 * Thumbnails are drawn at a fraction of their size, so a large image costs a lot
 * of bandwidth for a few hundred pixels. Past this the icon stands in; opening
 * the file still fetches the real thing. Matches the 1024-based sizes shown.
 */
const PREVIEW_MAX_BYTES = 2 * 1024 * 1024;

const TYPES = [
  { value: "", label: "All types" },
  { value: "image", label: "Images" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "application/pdf", label: "PDF" }
];

const isFiltered = computed(() => !!props.folder || !!props.type);

function iconFor(file: StoredFile) {
  if (file.contentType.startsWith("image/")) return PhotoIcon;
  if (file.contentType.startsWith("video/")) return FilmIcon;
  if (file.contentType.startsWith("audio/")) return MusicalNoteIcon;
  return DocumentIcon;
}

/**
 * Where the listing came with no urls, a space's thumbnails are signed for one
 * at a time, and the tiles fill in as they arrive. Nothing to do for the
 * account's own files: without them they have no inline preview at all.
 */
const thumbs = ref<Record<string, string>>({});

watch(
  () => props.files.data,
  (files) => {
    if (!props.space) return;
    thumbs.value = {};
    for (const file of files) {
      if (!file.hasThumbnail || file.status !== "uploaded" || file.thumbUrl) continue;
      const id = file.publicId;
      getSpaceFileUrl(props.space, id, true)
        .then((url) => (thumbs.value[id] = url))
        .catch(() => undefined);
    }
  },
  { immediate: true }
);

// The signing window rolls and the urls in hand die with it, so ask the page for
// a fresh listing a little early. One already spent is caught on the next load.
let keyTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.preview?.expiresAt,
  (expiresAt) => {
    clearTimeout(keyTimer);
    if (!expiresAt) return;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (Number.isNaN(remaining)) return;
    keyTimer = setTimeout(() => emit("refresh"), Math.min(Math.max(remaining - 30_000, 5_000), 2_000_000_000));
  },
  { immediate: true }
);

onBeforeUnmount(() => clearTimeout(keyTimer));

/**
 * Only images are drawn inline: a video or pdf would pull the whole file. The
 * thumbnail is tiny whatever the original weighs, so the size cap applies only
 * to the full image behind it.
 */
function thumbnailOf(file: StoredFile) {
  if (file.status !== "uploaded") return "";
  if (file.hasThumbnail && file.thumbUrl) return file.thumbUrl;
  if (file.previewUrl && file.contentType.startsWith("image/") && file.size <= PREVIEW_MAX_BYTES) {
    return file.previewUrl;
  }
  // Signed for on its own, which only a space's files are.
  return thumbs.value[file.publicId] || "";
}

function folderNameOf(file: StoredFile) {
  return props.folders.find((f) => f.slug === file.folder)?.name || file.folder;
}

/** The signed url of the real file, from whichever side of the api it lives on. */
function urlOf(file: StoredFile) {
  return props.space ? getSpaceFileUrl(props.space, file.publicId) : getFileUrl(file.publicId);
}

function openPreview(file: StoredFile) {
  previewing.value = file;
  previewOpen.value = true;
}

/**
 * Download one file. The tab is opened before the signed url is fetched, so the
 * browser does not treat the later navigation as a popup. The signed url is used
 * rather than the preview one: that key expires and may be cached.
 */
async function downloadFile(btn: ILoadingButton, file: StoredFile) {
  const tab = window.open("", "_blank");
  try {
    const url = await urlOf(file);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (e) {
    tab?.close();
    alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}

/**
 * Deleting the file deletes the clip it arrived as, which is what takes the
 * object out of storage too. The clipboard asks the same way, so a folder with
 * a password asks for it here instead of for a confirmation.
 */
async function removeFile(file: StoredFile, btn?: ILoadingButton) {
  // The delete below is the account's own route, and a space's files are not
  // deleted from here. The button is hidden, so this is a guard, not a path.
  if (props.space) return btn?.stopLoading();

  const folder = foldersAsObject.value[file.folder];
  let password: string | undefined;

  if (folder?.hasPassword) {
    password = await askForPassword("Enter the folder password to delete this file.");
    if (!password) return btn?.stopLoading();
  } else {
    const ok = await askToConfirm({
      title: "Delete this file?",
      message: `"${file.title || file.name}" is taken out of your storage as well, and that cannot be undone.`,
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return btn?.stopLoading();
  }

  try {
    await deleteFile(file.publicId, password);
    emit("deleted", file);
  } catch (e) {
    // Storage is what holds the file, so a disconnected one is the likely cause.
    alertDeleteError(e, !!authUser.storage?.connected);
  } finally {
    btn?.stopLoading();
  }
}

function deleteFromTile(btn: ILoadingButton, file: StoredFile) {
  return removeFile(file, btn);
}

/** Closed first: the file it is showing is on its way out. */
function deleteFromPreview() {
  const file = previewing.value;
  previewOpen.value = false;
  if (file) removeFile(file);
}
</script>

<template>
  <div>
    <div class="mb-5 flex flex-wrap items-end gap-3">
      <Select
        :model-value="folder"
        label="Folder"
        class="w-44"
        @update:model-value="emit('update:folder', String($event))"
      >
        <option value="">All folders</option>
        <option v-for="f in folders" :key="f.slug" :value="f.slug">{{ f.name }}</option>
      </Select>
      <Select :model-value="type" label="Type" class="w-44" @update:model-value="emit('update:type', String($event))">
        <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </Select>
      <p v-if="!loading && files.total" class="ml-auto text-xs text-muted">
        {{ files.total }} file<span v-if="files.total !== 1">s</span>
      </p>
    </div>

    <slot name="notice" />

    <div v-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div v-for="n in 8" :key="n" class="overflow-hidden rounded-lg border border-line bg-surface">
        <Skeleton class="aspect-square w-full rounded-none" />
        <div class="space-y-1.5 p-2.5">
          <Skeleton class="h-3 w-3/4" />
          <Skeleton class="h-2.5 w-1/2" />
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="!files.data.length"
      :title="isFiltered ? 'No files match these filters' : 'No files yet'"
      :description="
        isFiltered
          ? 'Try another folder or type.'
          : space
            ? 'Files uploaded to this space show up here.'
            : 'Files you upload into a folder show up here.'
      "
    >
      <template #icon><PhotoIcon /></template>
      <Button
        v-if="isFiltered"
        variant="ghost"
        size="sm"
        @click="emit('update:folder', ''); emit('update:type', '')"
      >
        Clear filters
      </Button>
    </EmptyState>

    <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div
        v-for="file in files.data"
        :key="file.publicId"
        class="group relative overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-line-strong"
      >
        <button type="button" class="block w-full text-left" :title="file.name" @click="openPreview(file)">
          <div class="relative flex aspect-square items-center justify-center bg-sunken">
            <img
              v-if="thumbnailOf(file)"
              :src="thumbnailOf(file)"
              :alt="file.name"
              loading="lazy"
              class="h-full w-full object-cover transition-opacity group-hover:opacity-90"
            />
            <component :is="iconFor(file)" v-else class="h-8 w-8 text-faint" />
            <Badge v-if="file.status === 'pending'" variant="neutral" class="absolute left-2 top-2">Pending</Badge>
            <span
              v-else-if="file.ext"
              class="absolute left-2 top-2 rounded bg-bg/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted"
            >{{ file.ext }}</span>
          </div>
          <div class="p-2.5">
            <p class="truncate text-[13px] text-fg">{{ file.title || file.name }}</p>
            <p class="mt-0.5 truncate text-[11px] text-faint">
              <span v-if="space" :class="file.mine ? 'text-accent' : ''">{{ file.mine ? "You" : file.author }} · </span>
              {{ humanFileSize(file.size) }} · <TimeAgo :date="file.uploadedAt || file.createdAt" />
            </p>
          </div>
        </button>

        <div class="absolute right-2 top-2 flex gap-1">
          <IconButton
            label="Download"
            size="sm"
            variant="subtle"
            class="shadow-card"
            :disabled="file.status === 'pending'"
            :click="downloadFile"
            :data="file"
          >
            <ArrowDownTrayIcon />
          </IconButton>
          <IconButton
            v-if="canDelete"
            label="Delete"
            size="sm"
            variant="subtle"
            class="shadow-card"
            :click="deleteFromTile"
            :data="file"
          >
            <TrashIcon />
          </IconButton>
        </div>
      </div>
    </div>

    <Paginator :data="files" @on-page-change="emit('page', $event)" />

    <FilePreviewModal
      :file="previewing"
      :open="previewOpen"
      :space="space"
      :folder-name="previewing ? folderNameOf(previewing) : ''"
      :can-delete="canDelete"
      @close="previewOpen = false"
      @delete="deleteFromPreview"
    />
  </div>
</template>
