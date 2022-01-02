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
import { useRoute } from "vue-router";
import Clip from "./clips/Clip.vue";

// Paginated Clips
type PaginatedClips = Pagination<OwnClip>;

// Paginated
const { copy } = useClipboard();
const copied = ref("");
const $route = useRoute();
const clips = ref(Pagination<OwnClip>());
const clipsCache: Record<string, PaginatedClips> = {};

async function loadClips() {
  const tab = currentTab.value!;

  // if we have clips cached for this tab,
  // use them while we're loading updated data from server
  if (clipsCache[tab]) {
    clips.value = clipsCache[tab];
  }

  const response = await $http.get<any, { clips: typeof clips.value }>(`/clips/${tab}`, {
    params: $route.query
  });

  clips.value = response.clips;
  clipsCache[tab] = response.clips;
}

// Register refresh clips event
$events.on("refreshClips", loadClips);

// Load clips on currentTab change.
watch(currentTab, loadClips);
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
    await $http.post(`/clip/${clip.uuid}/delete`, { password });
    clips.value.data = clips.value.data.filter((c) => c.uuid !== clip.uuid);
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
      :key="clip.uuid"
    >
      <Clip :index="index" :clip="clip" can-delete />
    </template>
    <template v-else>
      <div class="text-center my-5">
        <p class="text-gray-400">No clips yet.</p>
      </div>
    </template>
  </section>

  <Paginator @on-page-change="loadClips" class="mt-5" :data="clips" />
</template>