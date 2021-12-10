<script setup lang="ts">
import { currentTab } from "../stores/tabs.store";
import { $http } from "../http";
import { onMounted, ref, watch } from "vue";
import { OwnClip } from "../types/models.types";

const clips = ref<OwnClip[]>([]);
const clipsCache: Record<string, OwnClip[]> = {};

function loadClips() {
  const tab = currentTab.value!;

  // if we have clips cached for this tab,
  // use them while we're loading updated data from server
  if (clipsCache[tab]) {
    clips.value = clipsCache[tab];
  }

  return $http
    .get<any, { clips: OwnClip[] }>(`/content/clips/${tab}`)
    .then((response) => {
      clips.value = response.clips;
      clipsCache[tab] = response.clips;
    });
}

// Load clips on currentTab change.
watch(currentTab, loadClips);
// Load clips on first mount.
onMounted(loadClips);
</script>
<template>
  <section class="space-y-5">
    <template v-for="clip in clips" :key="clip.uuid">
      <div class="bg-gray-900 p-3 rounded hover:-mx-4 transition-all">
        <div class="meta text-xs text-gray-600">
          <div class="float-left">Length: {{ clips.length }}</div>
          <div class="float-right">
            <TimeAgo :date="clip.updatedAt" />
          </div>
          <div class="clear-both"></div>
        </div>

        <div class="block my-3 text-antiquewhite text-sm font-mono">
          <p v-if="clip.type === 'text'" v-text="clip.context"></p>
          <a
            v-else-if="clip.type === 'url'"
            :href="clip.context"
            v-text="clip.context"
            target="_blank"
            class="text-green-400 hover:text-green-500"
          ></a>
        </div>
      </div>
    </template>
  </section>
</template>
