<script setup lang="ts">
/** The clips page of a space: the ways to add one, the folders, and the list. */
import { ref } from "vue";
import SpaceToolbar from "../../components/spaces/SpaceToolbar.vue";
import SpaceClipList from "../../components/spaces/SpaceClipList.vue";

const props = defineProps<{ spaceId: string }>();

const query = ref("");
</script>

<template>
  <div class="space-y-5">
    <SpaceToolbar :space-id="props.spaceId" @update:query="query = $event" />
    <SpaceClipList :space-id="props.spaceId" :query="query" />
  </div>
</template>
