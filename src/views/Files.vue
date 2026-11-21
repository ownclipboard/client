<script setup lang="ts">
/**
 * Every file this account has uploaded, newest first.
 *
 * The grid itself is FileBrowser, which a space's files page uses too. What
 * stays here is where the files come from, and the one thing only an account's
 * own files have: the storage it connected.
 */
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowPathIcon } from "@heroicons/vue/20/solid";
import { alertRequestError } from "../http";
import { listFiles, type FilePreview, type StoredFile } from "../services/files.service";
import { folders, foldersAsObject } from "../stores/tabs.store";
import { $events } from "../events";
import type { RealtimeChange } from "../services/realtime.service";
import { useAuthUser } from "../stores/auth.store";
import PageHeader from "../components/ui/PageHeader.vue";
import Button from "../components/ui/Button.vue";
import { Pagination } from "../components/paginator/Paginator.vue";
import FileBrowser from "../components/files/FileBrowser.vue";

const $route = useRoute();
const authUser = useAuthUser();

const files = ref(Pagination<StoredFile>());
const preview = ref<FilePreview | null>(null);
const loading = ref(true);
const folder = ref("");
const type = ref("");

/** Without a preview block nothing can be drawn inline; urls are fetched per file instead. */
const previewsOff = computed(() => !loading.value && files.value.data.length > 0 && !preview.value);

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
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

watch([folder, type], () => loadFiles(1));
onMounted(() => loadFiles());

/**
 * A file clip changed elsewhere. `clips.changed` carries no kind, so a bulk
 * change is taken at face value rather than missing an upload or a delete.
 */
$events.on("realtime:clips", (change: RealtimeChange) => {
  if (!change.isFile && !change.bulk) return;
  if (folder.value && change.folders.length && !change.folders.includes(folder.value)) return;
  loadFiles(files.value.page);
});

$events.on("realtime:resync", () => loadFiles(files.value.page));

/** The browser deleted it; the list is this page's, so the counts are too. */
function onDeleted(file: StoredFile) {
  files.value.data = files.value.data.filter((f) => f.publicId !== file.publicId);
  files.value.total = Math.max(0, files.value.total - 1);

  const folderRow = foldersAsObject.value[file.folder];
  if (folderRow) folderRow.contents = Math.max(0, folderRow.contents - 1);

  // The last file on a page leaves nothing to look at, so step back a page.
  if (!files.value.data.length && files.value.page > 1) loadFiles(files.value.page - 1);
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
      Reconnect your file storage in Settings to open or preview these files.
    </div>

    <FileBrowser
      v-model:folder="folder"
      v-model:type="type"
      :files="files"
      :loading="loading"
      :folders="folders"
      :preview="preview"
      @page="loadFiles"
      @refresh="loadFiles(files.page)"
      @deleted="onDeleted"
    >
      <template #notice>
        <p v-if="previewsOff" class="mb-4 text-xs text-faint">
          Previews need your file storage connected, so files open in a new tab instead.
        </p>
      </template>
    </FileBrowser>
  </div>
</template>
