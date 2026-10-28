<script setup lang="ts">
/** One shared space: its toolbar, folders and clips. */
import { onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { alertRequestError } from "../http";
import { clearCurrentSpace, currentSpace, openSpace } from "../stores/spaces.store";
import { getSpaceLock, type SpaceLockState } from "../services/spaces.service";
import SpaceLockGate from "../components/spaces/SpaceLockGate.vue";
import SpaceToolbar from "../components/spaces/SpaceToolbar.vue";
import SpaceClipList from "../components/spaces/SpaceClipList.vue";
import SpaceSettingsDialog from "../components/spaces/SpaceSettingsDialog.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import EmptyState from "../components/ui/EmptyState.vue";
import Button from "../components/ui/Button.vue";

const $route = useRoute();
const $router = useRouter();

const spaceId = ref(String($route.params.spaceId || ""));
const loading = ref(true);
const gone = ref(false);
const query = ref("");
const settingsOpen = ref(false);
// Set when the space refuses until this session passes its factors.
const lock = ref<SpaceLockState | null>(null);

async function load(id: string) {
  loading.value = true;
  gone.value = false;
  lock.value = null;
  query.value = "";
  try {
    await openSpace(id);
  } catch (e: any) {
    const status = e?.response?.status;

    // 423 is a shut door rather than a missing space: the lock endpoint is the
    // one route that still answers, and it says what has to be passed.
    if (status === 423) {
      lock.value = await getSpaceLock(id).catch(() => null);
      if (!lock.value) gone.value = true;
    } else if (status === 404) {
      // Removed from the space, or the owner deleted it.
      gone.value = true;
    } else {
      alertRequestError(e);
    }
  } finally {
    loading.value = false;
  }
}

/** Opened for this session: load the space properly now. */
function onUnlocked() {
  lock.value = null;
  load(spaceId.value);
}

watch(
  () => $route.params.spaceId,
  (id) => {
    if (!id) return;
    spaceId.value = String(id);
    load(spaceId.value);
  },
  { immediate: true }
);

onBeforeUnmount(clearCurrentSpace);
</script>

<template>
  <div class="space-y-5">
    <template v-if="loading">
      <Skeleton class="h-10 w-64" />
      <Skeleton class="h-8 w-full" />
      <Skeleton v-for="i in 3" :key="i" class="h-20 w-full" />
    </template>

    <SpaceLockGate
      v-else-if="lock"
      :space-id="spaceId"
      :space-name="currentSpace?.name"
      :lock="lock"
      @unlocked="onUnlocked"
    />

    <EmptyState
      v-else-if="gone"
      title="This space is not available"
      description="It may have been deleted, or you may no longer be a member."
    >
      <Button size="sm" variant="primary" @click="$router.push({ name: 'spaces' })">Back to spaces</Button>
    </EmptyState>

    <template v-else-if="currentSpace">
      <SpaceToolbar :space-id="spaceId" @settings="settingsOpen = true" @update:query="query = $event" />
      <SpaceClipList :space-id="spaceId" :query="query" />
      <SpaceSettingsDialog :open="settingsOpen" :space-id="spaceId" @close="settingsOpen = false" />
    </template>
  </div>
</template>
