<script setup lang="ts">
/**
 * Every file uploaded to this space, by anyone. The same listing the personal
 * files page shows, against the space instead of the account, down to the
 * preview key its urls are signed with, which is why it is the same grid.
 *
 * Reading only: what is here is opened, previewed and downloaded.
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { PhotoIcon } from "@heroicons/vue/20/solid";
import { useRoute } from "vue-router";
import { alertRequestError } from "../../http";
import { $events } from "../../events";
import { listSpaceFiles } from "../../services/spaces.service";
import { currentSpaceFolders } from "../../stores/spaces.store";
import type { FilePreview, StoredFile } from "../../services/files.service";
import { Pagination } from "../../components/paginator/Paginator.vue";
import FileBrowser from "../../components/files/FileBrowser.vue";
import EmptyState from "../../components/ui/EmptyState.vue";

const props = defineProps<{ spaceId: string }>();

const $route = useRoute();

const files = ref(Pagination<StoredFile>());
const preview = ref<FilePreview | null>(null);
const loading = ref(true);
const folder = ref("");
const type = ref("");
const failed = ref(false);

async function loadFiles(page = Number($route.query.page) || 1) {
  loading.value = true;
  try {
    const res = await listSpaceFiles(props.spaceId, {
      page,
      folder: folder.value || undefined,
      type: type.value || undefined
    });
    files.value = res.files;
    preview.value = res.preview;
    failed.value = false;
  } catch (e) {
    failed.value = true;
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

watch([folder, type], () => loadFiles(1));
onMounted(() => loadFiles());

// An upload or a delete anywhere in the space changes this list too.
function onClipsChanged() {
  loadFiles(files.value.page);
}
$events.on("space:clips-changed", onClipsChanged);
onBeforeUnmount(() => $events.off("space:clips-changed", onClipsChanged));
</script>

<template>
  <EmptyState
    v-if="failed && !files.data.length"
    title="These files could not be loaded"
    description="Try again in a moment."
  >
    <template #icon><PhotoIcon /></template>
  </EmptyState>

  <FileBrowser
    v-else
    v-model:folder="folder"
    v-model:type="type"
    :files="files"
    :loading="loading"
    :folders="currentSpaceFolders"
    :preview="preview"
    :space="props.spaceId"
    :can-delete="false"
    @page="loadFiles"
    @refresh="loadFiles(files.page)"
  />
</template>
