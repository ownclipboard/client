<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { $http, alertRequestError } from "../http";
import type { OwnClip, OwnFolder } from "../types/models.types";
import Intro from "../components/Intro.vue";
import { $localStorage } from "../stores/native";
import Paginator, { Pagination } from "../components/paginator/Paginator.vue";
import Clip from "../components/clips/Clip.vue";
import { useTitle } from "@vueuse/core";

const [$route, $router] = [useRoute(), useRouter()];
const folder = ref<OwnFolder>();
const clips = ref(Pagination<OwnClip>());
const isPasting = ref(false);
const pasteId = computed<string>(() => $route.params.pasteId as string);

type thisDeviceClips = Record<string, string[]>;
const thisDeviceClips = $localStorage.persistedReactive<thisDeviceClips>(
  "public-clips",
  {}
);

// Add clip uuid to this device's clips if not exists
function addToThisDeviceClips(clipUuid: string) {
  if (!thisDeviceClips[pasteId.value]) thisDeviceClips[pasteId.value] = [];

  if (!thisDeviceClips[pasteId.value].includes(clipUuid)) {
    thisDeviceClips[pasteId.value].push(clipUuid);
  }
}

// get folder details on mount
onMounted(getFolderByPasteId);

// Get folder details
async function getFolderByPasteId() {
  if (!pasteId.value) return;

  try {
    const { folder: $folder } = await $http.get<any, { folder: OwnFolder }>(
      `/folders/public/${pasteId.value}`
    );

    folder.value = $folder;

    useTitle(`${folder.value.name} - Public Paste`);

    // load this device's clips
    await loadThisDeviceClips();
  } catch (e) {
    alertRequestError(e);
  }
}

// Get clips from this device
async function loadThisDeviceClips() {
  const ids = thisDeviceClips[pasteId.value];

  if (!ids || (ids && ids.length < 1)) return;

  try {
    const data = await $http.post<any, { clips: Pagination<OwnClip> }>(
      `/clips/find`,
      { ids },
      { params: $route.query }
    );

    clips.value = data.clips;
  } catch (e) {
    alertRequestError(e);
  }
}

// Paste to server.
async function paste() {
  isPasting.value = true;

  // get content from clipboard
  const content = await navigator.clipboard.readText();

  try {
    const { clip } = await $http.post<any, { clip: OwnClip }>(
      `/clips/paste/${pasteId.value}`,
      {
        content: content
      }
    );

    addToThisDeviceClips(clip.uuid);
    await loadThisDeviceClips();
  } catch (e) {
    alertRequestError(e);
  } finally {
    isPasting.value = false;
  }
}
</script>

<template>
  <Intro />
  <template v-if="folder">
    <section class="flex mt-5">
      <div
        @click.prevent="paste"
        class="p-28 bg-gray-900 hover:bg-gray-700 w-full max-w-4xl mx-auto rounded cursor-pointer"
      >
        <div v-if="isPasting" class="text-center">
          <i class="fa fa-spin fa-spinner fa-2x text-green-300"></i>
          <br />
          <h6 class="text-center text-gray-500 mt-2">Pasting...</h6>
        </div>
        <template v-else>
          <h1 class="text-3xl text-center text-gray-800">
            <span class="text-gray-500 font-light">"{{ folder.name }}"</span>
            <br />PUBLIC PASTE
          </h1>
          <h6 class="text-center text-gray-400 font-light mt-2 blink-slow">
            Click to paste TEXT or IMAGE
          </h6>
        </template>
      </div>
    </section>

    <section class="mt-10">
      <h2 class="text-center font-light text-xl opacity-80 text-gray-400">
        Clips
        <strong class="text-yellow-300">Pasted</strong> on this
        <strong class="text-yellow-300">Browser</strong>
      </h2>

      <div class="flex mt-5">
        <div class="w-full max-w-4xl mx-auto space-y-3">
          <template v-for="(clip, index) in clips.data" :key="clip.uuid">
            <Clip :clip="clip" :index="index" />
          </template>

          <Paginator :data="clips" @onPageChange="loadThisDeviceClips" />

          <div class="text-center" v-if="!clips.data.length">No clips yet!</div>
        </div>
      </div>
    </section>
  </template>
</template>