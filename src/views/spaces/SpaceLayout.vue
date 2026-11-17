<script setup lang="ts">
/**
 * One shared space, and everything under it. This layer owns the space itself:
 * loading it, the lock it may be behind, and the header its pages sit under.
 * The pages below are clips, members and the owner's reports.
 *
 * Holding the space here is the point of the layer. Moving between its pages
 * is then a change of child, not a reload, and only one page has to know what
 * to do when the space is locked or gone.
 */
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChatBubbleLeftRightIcon, FlagIcon, PhotoIcon, UsersIcon } from "@heroicons/vue/20/solid";
import { alertRequestError } from "../../http";
import {
  clearCurrentSpace,
  currentSpace,
  currentSpaceStats,
  isSpaceOwner,
  openSpace,
  openSpaceReports
} from "../../stores/spaces.store";
import { getSpaceLock, type SpaceLockState } from "../../services/spaces.service";
import { humanFileSize } from "../../services/files.service";
import SpaceLockGate from "../../components/spaces/SpaceLockGate.vue";
import Badge from "../../components/ui/Badge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import Button from "../../components/ui/Button.vue";
import Tabs, { type TabItem } from "../../components/ui/Tabs.vue";

const $route = useRoute();
const $router = useRouter();

const spaceId = ref(String($route.params.spaceId || ""));
const loading = ref(true);
const gone = ref(false);
// Set when the space refuses until this session passes its factors.
const lock = ref<SpaceLockState | null>(null);

async function load(id: string) {
  loading.value = true;
  gone.value = false;
  lock.value = null;
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

// Only the space in the path matters here. Moving between this space's pages
// keeps the same id, so it loads once.
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

/* ---------------- Header ---------------- */

const storageLabel = computed(() => {
  const storage = currentSpace.value?.limits.storage;
  if (!storage) return "";
  return `${humanFileSize(storage.used)} of ${humanFileSize(storage.max)}`;
});

/**
 * The counters are the space's stats, except the members, which the space
 * detail already carries and keeps up to date on its own. Files are the part
 * of the clips that are files, so the two figures overlap by design.
 */
const tabs = computed<TabItem[]>(() => {
  const params = { spaceId: spaceId.value };
  const stats = currentSpaceStats.value;

  const items: TabItem[] = [
    {
      key: "space",
      label: "Clips",
      icon: ChatBubbleLeftRightIcon,
      to: { name: "space", params },
      count: stats?.clips
    },
    {
      key: "space.files",
      label: "Files",
      icon: PhotoIcon,
      to: { name: "space.files", params },
      count: stats?.files
    },
    {
      key: "space.members",
      label: "Members",
      icon: UsersIcon,
      to: { name: "space.members", params },
      count: currentSpace.value?.members
    }
  ];

  // The queue is the owner's, and the count is what says it has anything in it.
  if (isSpaceOwner.value) {
    items.push({
      key: "space.reports",
      label: "Reports",
      icon: FlagIcon,
      to: { name: "space.reports", params },
      count: openSpaceReports.value,
      alert: true
    });
  }

  return items;
});

const openTab = computed(() => String($route.name ?? ""));
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
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="truncate text-lg font-semibold tracking-tight text-fg">{{ currentSpace.name }}</h1>
          <Badge variant="accent" uppercase>Space</Badge>
        </div>
        <!-- The members are counted on their own tab now; the storage is nowhere else. -->
        <p v-if="storageLabel" class="font-mono text-[11px] text-faint">{{ storageLabel }}</p>
      </div>

      <Tabs :model-value="openTab" :tabs="tabs" label="Space pages" />

      <router-view :space-id="spaceId" />
    </template>
  </div>
</template>
