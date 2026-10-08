<script setup lang="ts">
/** Clips of the open space folder, or search results across the whole space. */
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ClipboardIcon, MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { alertRequestError } from "../../http";
import { $events } from "../../events";
import { getSpaceClips, searchSpaceClips, type SpaceClip } from "../../services/spaces.service";
import { currentSpace, currentSpaceFolder, refreshSpace, refreshSpaceFolders } from "../../stores/spaces.store";
import Paginator, { Pagination } from "../paginator/Paginator.vue";
import SpaceClipRow from "./SpaceClipRow.vue";
import EmptyState from "../ui/EmptyState.vue";
import Skeleton from "../ui/Skeleton.vue";
import Button from "../ui/Button.vue";

const props = defineProps<{ spaceId: string; query: string }>();

const $route = useRoute();
const $router = useRouter();

const clips = ref(Pagination<SpaceClip>());
const loading = ref(true);
const searching = ref(false);
// Incremented per request so a slow response cannot overwrite a newer one.
let requestId = 0;

async function load() {
  const folder = currentSpaceFolder.value;
  const q = props.query;
  const id = ++requestId;

  try {
    searching.value = !!q;
    const res = q
      ? await searchSpaceClips(props.spaceId, { ...$route.query, q })
      : await getSpaceClips(props.spaceId, folder, { ...$route.query });

    if (id !== requestId) return;
    // The api counts pages, the paginator counts to a last page.
    const page = res.clips;
    clips.value = {
      page: page.page,
      perPage: page.perPage,
      total: page.total ?? page.data.length,
      lastPage: page.pages ?? 1,
      data: page.data
    };
  } catch (e) {
    if (id === requestId) alertRequestError(e);
  } finally {
    if (id === requestId) loading.value = false;
  }
}

function reload() {
  loading.value = true;
  return load();
}

onMounted(load);

watch(() => [props.spaceId, currentSpaceFolder.value, props.query], reload);

/**
 * Space changes reach members on their own realtime channel, and the payload
 * says nothing about which space, so any clip event is a reason to look again.
 */
function onRealtime() {
  load();
}
$events.on("realtime:clips", onRealtime);
$events.on("realtime:resync", onRealtime);
onBeforeUnmount(() => {
  $events.off("realtime:clips", onRealtime);
  $events.off("realtime:resync", onRealtime);
});

$events.on("space:clips-changed", onChanged);
onBeforeUnmount(() => $events.off("space:clips-changed", onChanged));

async function onChanged() {
  await load();
  // A clip arriving or leaving moves the folder counts and the storage figure,
  // both of which the toolbar shows.
  refreshSpaceFolders(props.spaceId).catch(() => {});
  refreshSpace(props.spaceId).catch(() => {});
}

function onDeleted(publicId: string) {
  clips.value.data = clips.value.data.filter((c) => c.publicId !== publicId);
  refreshSpaceFolders(props.spaceId).catch(() => {});
  refreshSpace(props.spaceId).catch(() => {});
}

function clearSearch() {
  $router.replace({ query: {} });
  $events.emit("space:clear-search");
}
</script>

<template>
  <div class="space-y-2">
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
      <SpaceClipRow
        v-for="clip in clips.data"
        :key="clip.publicId"
        :space-id="spaceId"
        :clip="clip"
        :show-folder="!!query"
        @changed="onChanged"
        @deleted="onDeleted"
      />
    </template>

    <EmptyState
      v-else-if="query"
      :title="searching ? 'Searching' : `No clips match “${query}”`"
      description="Try a different word."
    >
      <template #icon><MagnifyingGlassIcon /></template>
      <Button size="sm" variant="ghost" @click="clearSearch">Clear search</Button>
    </EmptyState>

    <EmptyState
      v-else
      :title="`Nothing in ${currentSpace?.name || 'this space'} yet`"
      description="Paste from your clipboard, write a clip, or upload a file. Everyone in the space sees it."
    >
      <template #icon><ClipboardIcon /></template>
    </EmptyState>

    <Paginator :data="clips" @on-page-change="load" />
  </div>
</template>
