<script setup lang="ts">
import { currentTab } from "../stores/tabs.store";
import { $http } from "../http";
import { onMounted, ref, watch } from "vue";
import { OwnClip } from "../types/models.types";

const clips = ref<OwnClip[]>([]);

function loadClips() {
  $http
    .get<any, { clips: OwnClip[] }>(`/content/clips/${currentTab.value}`)
    .then((response) => {
      clips.value = response.clips;
    });
}

// Load clips on currentTab change.
watch(currentTab, loadClips);
// Load clips on first mount.
onMounted(loadClips);
</script>
<template>
  <h3 class="text-2xl">Folder: {{ currentTab }}</h3>

  <section class="space-y-5">
    <template v-for="clip in clips" :key="clip.uuid">
      <div>
        {{ clip }}
      </div>
    </template>
  </section>
</template>
