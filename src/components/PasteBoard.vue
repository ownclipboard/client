<script setup lang="ts">
import { ref } from "vue";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $http } from "../http";
import { currentTab, foldersAsObject, getFolders } from "../stores/tabs.store";

const hasClickedPasteboard = ref(false);

function clickPasteBoard(val: boolean = true) {
  hasClickedPasteboard.value = val;
}

async function paste(btn: ILoadingButton) {
  clickPasteBoard(false);

  // Get data from clipboard
  let pasteData = (await window.navigator.clipboard.readText()) || "";
  // trim whitespace
  pasteData = pasteData.trim();

  // If there is no data, return
  if (!pasteData || (pasteData && !pasteData.length)) return btn.stopLoading();

  // Send data to server
  return pasteToServer(pasteData).finally(btn.stopLoading);
}

async function pasteToServer(data: string, title?: string) {
  return $http
    .post("content/paste", {
      title,
      content: data,
      folder: currentTab.value
    })
    .then(getFolders);
}
</script>

<template>
  <section
    @click.prevent="clickPasteBoard(true)"
    @mouseleave="clickPasteBoard(false)"
    @focusout="clickPasteBoard(false)"
    :class="[hasClickedPasteboard ? 'bg-gray-200' : 'bg-gray-900']"
    class="rounded pt-5 lg:pt-10 shadow-md"
  >
    <h6 v-if="foldersAsObject[currentTab]" class="text-center text-gray-500 mb-1">
      Paste in <span class="text-gray-300">{{ foldersAsObject[currentTab].name }}</span>
    </h6>

    <h1 class="text-4xl hidden lg:block text-center text-gray-500 font-mono">
      <template v-if="!hasClickedPasteboard">click</template>
      <small v-if="!hasClickedPasteboard" class="mx-3 font-sans text-gray-300">&</small>
      <span>ctrl+v</span>
    </h1>

    <section
      class="text-center mt-5 lg:mt-10 mb-5 space-x-2 text-xs md:text-sm lg:text-base"
    >
      <LoadingButton :click="paste" class="btn gray rounded-sm shadow-lg">
        <i class="fa fa-paste"></i>
        PASTE
      </LoadingButton>
      <button class="btn gray rounded-sm shadow-lg">
        <i class="fa fa-pen"></i>
        CREATE
      </button>
    </section>
  </section>
</template>
