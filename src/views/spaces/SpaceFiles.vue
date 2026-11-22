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
import { currentSpaceFolders, isSpaceOwner, refreshSpaceStats, spaceOwnerStorageFull } from "../../stores/spaces.store";
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

// An upload or a delete anywhere in the space changes this list too, and the
// counts on the tabs with it.
function onClipsChanged() {
  loadFiles(files.value.page);
  refreshSpaceStats(props.spaceId).catch(() => {});
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

  <template v-else>
    <!--
      Said here rather than only when an upload is attempted: the space's own bar
      can read half empty while the owner's allowance, which every space of theirs
      shares, is what actually refuses the file.
    -->
    <div v-if="spaceOwnerStorageFull" class="mb-5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
      <template v-if="isSpaceOwner">
        You have used all of your file storage, which every space you own shares, so nothing more can be added here.
        <RouterLink :to="{ name: 'settings.storage' }" class="font-medium underline underline-offset-2">Free up room</RouterLink>.
      </template>
      <template v-else>The owner of this space has used all of their file storage, so nothing more can be added here.</template>
    </div>

  <FileBrowser
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
</template>
