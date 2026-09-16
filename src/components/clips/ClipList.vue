<script setup lang="ts">
/** The paginated list of clips for the current folder, or search results. */
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MagnifyingGlassIcon, ClipboardIcon, LockClosedIcon } from "@heroicons/vue/24/outline";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { currentTab, currentFolder, currentFolderNeedsPassword, foldersAsObject } from "../../stores/tabs.store";
import { searchQuery, searchAllFolders, clearSearch } from "../../stores/search.store";
import { composerOpen, openComposer } from "../../stores/composer.store";
import { openFolderSettings } from "../../stores/folder-settings.store";
import { $http, alertDeleteError, alertRequestError } from "../../http";
import { $events } from "../../events";
import { askForPassword } from "../PasswordPromptHandler";
import { askToConfirm } from "../ConfirmHandler";
import { useAuthUser } from "../../stores/auth.store";
import type { OwnClip } from "../../types/models.types";
import Paginator, { Pagination } from "../paginator/Paginator.vue";
import ClipRow from "./ClipRow.vue";
import ClipComposer from "./ClipComposer.vue";
import EmptyState from "../ui/EmptyState.vue";
import Skeleton from "../ui/Skeleton.vue";
import Button from "../ui/Button.vue";

type PaginatedClips = Pagination<OwnClip>;

const $route = useRoute();
const $router = useRouter();
const authUser = useAuthUser();
const clips = ref(Pagination<OwnClip>());
const clipsCache: Record<string, PaginatedClips> = {};
const loading = ref(true);
const isSearching = ref(false);
// Incremented per request so a slow response can't overwrite a newer one.
let requestId = 0;

async function loadClips() {
  const tab = currentTab.value;
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

    // Show cached clips for this folder while fresh data loads.
    if (clipsCache[tab]) {
      clips.value = clipsCache[tab];
      loading.value = false;
    } else {
      loading.value = true;
    }

    const response = await $http.get<any, { clips: PaginatedClips }>(`/clips/${tab}`, { params: $route.query });
    if (id !== requestId) return;
    clips.value = response.clips;
    clipsCache[tab] = response.clips;
  } catch (e) {
    alertRequestError(e);
  } finally {
    if (id === requestId) {
      isSearching.value = false;
      loading.value = false;
    }
  }
}

$events.on("refreshClips", loadClips);
watch(currentTab, loadClips);

// Reload when the search query or scope changes, starting from page 1.
watch([searchQuery, searchAllFolders], async ([query], [previousQuery]) => {
  if (!query && !previousQuery) return;
  if ($route.query.page) {
    const { page: _page, ...query } = $route.query;
    await $router.replace({ query });
  }
  await loadClips();
});

onMounted(loadClips);

async function deleteClip(btn: ILoadingButton, [clip]: [OwnClip, number]) {
  const folder = foldersAsObject.value[clip.folder];
  let password: string | undefined;

  if (folder && folder.hasPassword) {
    password = await askForPassword("Enter the folder password to delete this clip.");
    if (!password) return btn.stopLoading();
  } else {
    const ok = await askToConfirm({
      title: "Delete this clip?",
      message: clip.title ? `"${clip.title}" will be removed permanently.` : "The clip will be removed permanently.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return btn.stopLoading();
  }

  try {
    await $http.post(`/clip/${clip.publicId}/delete`, { password });
    clips.value.data = clips.value.data.filter((c) => c.publicId !== clip.publicId);
    if (folder) folder.contents = Math.max(0, folder.contents - 1);
  } catch (e) {
    // Only a file clip needs storage; a text clip failing has another cause.
    if (clip.type === "file") alertDeleteError(e, !!authUser.storage?.connected);
    else alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}

$events.on("delete-clip", ({ btn, data }: { btn: ILoadingButton; data: [OwnClip, number] }) => deleteClip(btn, data));
</script>

<template>
  <div class="space-y-2">
    <ClipComposer v-if="composerOpen && !currentFolderNeedsPassword" />

    <template v-if="loading && !clips.data.length">
      <div v-for="i in 4" :key="i" class="rounded-lg border border-line bg-surface px-4 py-3">
        <div class="space-y-2 py-0.5">
          <Skeleton class="h-3.5 w-1/3" />
          <Skeleton class="h-3 w-3/4" />
          <Skeleton class="h-2.5 w-16" />
        </div>
      </div>
    </template>

    <template v-else-if="clips.data.length">
      <ClipRow
        v-for="(clip, index) in clips.data"
        :key="clip.publicId"
        :clip="clip"
        :index="index"
        :show-folder="!!searchQuery && searchAllFolders"
        can-delete
      />
    </template>

    <EmptyState
      v-else-if="searchQuery"
      :title="isSearching ? 'Searching' : `No clips match “${searchQuery}”`"
      :description="searchAllFolders ? 'Try a different word.' : 'Try a different word, or search all folders.'"
    >
      <template #icon><MagnifyingGlassIcon /></template>
      <Button v-if="!searchAllFolders" size="sm" @click="searchAllFolders = true">Search all folders</Button>
      <Button size="sm" variant="ghost" @click="clearSearch">Clear search</Button>
    </EmptyState>

    <EmptyState
      v-else-if="currentFolderNeedsPassword"
      title="This folder needs a password first"
      description="Clips here are encrypted in your browser with a password only you know. Set one to start adding clips."
    >
      <template #icon><LockClosedIcon /></template>
      <Button size="sm" variant="primary" @click="openFolderSettings(currentTab)">Set a password</Button>
    </EmptyState>

    <EmptyState
      v-else
      :title="`Nothing in ${currentFolder?.name || 'this folder'} yet`"
      description="Paste from your clipboard, write a new clip, or upload a file."
    >
      <template #icon><ClipboardIcon /></template>
      <Button size="sm" variant="primary" @click="openComposer">New clip</Button>
    </EmptyState>

    <Paginator :data="clips" @on-page-change="loadClips" />
  </div>
</template>
