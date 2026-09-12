<script setup lang="ts">
import { currentTab, foldersAsObject } from "../stores/tabs.store";
import { $http, alertRequestError } from "../http";
import { onMounted, ref, watch } from "vue";
import type { OwnClip } from "../types/models.types";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { askForPassword } from "./PasswordPromptHandler";
import { $events } from "../events";
import { useClipboard } from "@vueuse/core";
import Paginator, { Pagination } from "./paginator/Paginator.vue";
import { useRoute, useRouter } from "vue-router";
import Clip from "./clips/Clip.vue";
import { searchQuery, searchAllFolders } from "../stores/search.store";

// Paginated Clips
type PaginatedClips = Pagination<OwnClip>;

// Paginated
const { copy } = useClipboard();
const copied = ref("");
const $route = useRoute();
const $router = useRouter();
const clips = ref(Pagination<OwnClip>());
const clipsCache: Record<string, PaginatedClips> = {};
const isSearching = ref(false);
// Incremented per request so a slow response can't overwrite a newer one.
let requestId = 0;

async function loadClips() {
  const tab = currentTab.value!;
  const q = searchQuery.value;
  const id = ++requestId;

  try {
    if (q) {
      isSearching.value = true;
      const response = await $http.get<any, { clips: PaginatedClips; query: string }>("/clips/search", {
        params: { ...$route.query, q, folder: searchAllFolders.value ? undefined : tab }
      });
      if (id !== requestId) return;
      clips.value = response.clips;
      return;
    }

    // if we have clips cached for this tab,
    // use them while we're loading updated data from server
    if (clipsCache[tab]) {
      clips.value = clipsCache[tab];
    }

    const response = await $http.get<any, { clips: PaginatedClips }>(`/clips/${tab}`, {
      params: $route.query
    });
    if (id !== requestId) return;

    clips.value = response.clips;
    clipsCache[tab] = response.clips;
  } catch (e) {
    alertRequestError(e);
  } finally {
    if (id === requestId) isSearching.value = false;
  }
}

// Register refresh clips event
$events.on("refreshClips", loadClips);

// Load clips on currentTab change.
watch(currentTab, loadClips);

// Reload when the search query or scope changes, starting from page 1.
watch([searchQuery, searchAllFolders], async ([query], [previousQuery]) => {
  // Scope toggled while not searching: nothing to reload.
  if (!query && !previousQuery) return;
  if ($route.query.page) {
    const { page: _page, ...query } = $route.query;
    await $router.replace({ query });
  }
  await loadClips();
});
// Load clips on first mount.
onMounted(loadClips);

// Delete clip from server
async function deleteClip(btn: ILoadingButton, [clip, index]: [OwnClip, number]) {
  const folder = foldersAsObject.value[clip.folder];
  let password: string | undefined;

  if (folder && folder.hasPassword) {
    password = await askForPassword("Enter password to delete clip:");
    if (!password) return btn.stopLoading();
  } else {
    if (!confirm("Are you sure you want to delete this clip?")) {
      return btn.stopLoading();
    }
  }

  try {
    await $http.post(`/clip/${clip.publicId}/delete`, { password });
    clips.value.data = clips.value.data.filter((c) => c.publicId !== clip.publicId);
  } catch (e) {
    alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}

$events.on(
  "delete-clip",
  ({ btn, data }: { btn: ILoadingButton; data: [OwnClip, number] }) => {
    deleteClip(btn, data);
  }
);
</script>
<template>
  <section class="space-y-5">
    <template
      v-if="clips.data.length"
      v-for="(clip, index) in clips.data"
      :key="clip.publicId"
    >
      <Clip :index="index" :clip="clip" :show-folder="!!searchQuery && searchAllFolders" can-delete />
    </template>
    <template v-else>
      <div class="text-center my-5">
        <p v-if="searchQuery" class="text-gray-400">
          {{ isSearching ? "Searching..." : `No clips match "${searchQuery}"` }}
        </p>
        <p v-else class="text-gray-400">No clips yet.</p>
      </div>
    </template>
  </section>

  <Paginator @on-page-change="loadClips" class="mt-5" :data="clips" />

  <debug :data="{clips}" class="mt-5" />
</template>
