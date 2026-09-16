<script setup lang="ts">
/**
 * Every uploaded file, newest first, with folder and type filters.
 *
 * Images are drawn straight from storage using the `previewUrl` the api hands
 * out, which needs no authentication but stops working when the shared key
 * rotates, so the listing refreshes itself just before `preview.expiresAt`.
 * When the api sends no preview block at all the thumbnails are replaced by
 * icons and a file's url is fetched only when it is opened.
 */
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowDownTrayIcon, ArrowPathIcon, DocumentIcon, FilmIcon, MusicalNoteIcon, PhotoIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../http";
import { listFiles, getFileUrl, humanFileSize, type FilePreview, type StoredFile } from "../services/files.service";
import { folders } from "../stores/tabs.store";
import { useAuthUser } from "../stores/auth.store";
import PageHeader from "../components/ui/PageHeader.vue";
import Select from "../components/ui/Select.vue";
import Badge from "../components/ui/Badge.vue";
import Button from "../components/ui/Button.vue";
import IconButton from "../components/ui/IconButton.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import EmptyState from "../components/ui/EmptyState.vue";
import Paginator, { Pagination } from "../components/paginator/Paginator.vue";
import FilePreviewModal from "../components/files/FilePreviewModal.vue";

const $route = useRoute();
const authUser = useAuthUser();

const files = ref(Pagination<StoredFile>());
const preview = ref<FilePreview | null>(null);
const loading = ref(true);
const folder = ref("");
const type = ref("");

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

const isFiltered = computed(() => !!folder.value || !!type.value);
/** Without a preview block nothing can be drawn inline; urls are fetched per file instead. */
const previewsOff = computed(() => !loading.value && files.value.data.length > 0 && !preview.value);

function iconFor(file: StoredFile) {
  if (file.contentType.startsWith("image/")) return PhotoIcon;
  if (file.contentType.startsWith("video/")) return FilmIcon;
  if (file.contentType.startsWith("audio/")) return MusicalNoteIcon;
  return DocumentIcon;
}

/** Only images are drawn inline: a video or pdf thumbnail would pull the whole file. */
function thumbnailOf(file: StoredFile) {
  if (file.status !== "uploaded" || !file.previewUrl) return "";
  if (!file.contentType.startsWith("image/")) return "";
  return file.size <= PREVIEW_MAX_BYTES ? file.previewUrl : "";
}

async function loadFiles(page = Number($route.query.page) || 1) {
  loading.value = true;
  try {
    const res = await listFiles({
      page,
      folder: folder.value || undefined,
      type: type.value || undefined
    });
    files.value = res.files;
    preview.value = res.preview;
    scheduleRefresh();
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

// The preview key rotates, so the urls in hand die with it. Re-fetch a little
// early; a key that is already spent is refreshed on the next tick instead.
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  if (!preview.value?.expiresAt) return;
  const remaining = new Date(preview.value.expiresAt).getTime() - Date.now();
  if (Number.isNaN(remaining)) return;
  refreshTimer = setTimeout(() => loadFiles(files.value.page), Math.min(Math.max(remaining - 30_000, 5_000), 2_000_000_000));
}

watch([folder, type], () => loadFiles(1));
onMounted(loadFiles);
onBeforeUnmount(() => clearTimeout(refreshTimer));

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
    const url = await getFileUrl(file.publicId);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (e) {
    tab?.close();
    alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}
</script>

<template>
  <div class="max-w-5xl">
    <PageHeader title="Files" description="Everything you have uploaded, newest first.">
      <Button variant="ghost" size="sm" :disabled="loading" @click="loadFiles(files.page)">
        <ArrowPathIcon :class="['h-4 w-4', loading ? 'animate-spin' : '']" />
        Refresh
      </Button>
    </PageHeader>

    <div v-if="!authUser.storage?.connected" class="mb-5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
      File storage is disconnected, so these files cannot be opened or previewed until you reconnect it in Settings.
    </div>

    <div class="mb-5 flex flex-wrap items-end gap-3">
      <Select v-model="folder" label="Folder" class="w-44">
        <option value="">All folders</option>
        <option v-for="f in folders" :key="f.slug" :value="f.slug">{{ f.name }}</option>
      </Select>
      <Select v-model="type" label="Type" class="w-44">
        <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </Select>
      <p v-if="!loading && files.total" class="ml-auto text-xs text-muted">
        {{ files.total }} file<span v-if="files.total !== 1">s</span>
      </p>
    </div>

    <p v-if="previewsOff" class="mb-4 text-xs text-faint">
      Inline previews are off for your storage, so files open in a new tab instead.
    </p>

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
      :description="isFiltered ? 'Try another folder or type.' : 'Files you upload into a folder show up here.'"
    >
      <template #icon><PhotoIcon /></template>
      <Button v-if="isFiltered" variant="ghost" size="sm" @click="folder = ''; type = ''">Clear filters</Button>
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
            {{ humanFileSize(file.size) }} · <TimeAgo :date="file.uploadedAt || file.createdAt" />
          </p>
        </div>
        </button>

        <IconButton
          label="Download"
          size="sm"
          variant="subtle"
          class="absolute right-2 top-2 shadow-card"
          :disabled="file.status === 'pending'"
          :click="downloadFile"
          :data="file"
        >
          <ArrowDownTrayIcon />
        </IconButton>
      </div>
    </div>

    <Paginator :data="files" @on-page-change="loadFiles" />

    <FilePreviewModal :file="previewing" :open="previewOpen" @close="previewOpen = false" />
  </div>
</template>
