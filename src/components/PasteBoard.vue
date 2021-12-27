<script setup lang="ts">
import { ref } from "vue";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $http } from "../http";
import { currentTab, foldersAsObject, getFolders } from "../stores/tabs.store";
import { $events } from "../events";
import { askForPassword } from "./PasswordPrompt";
import { $alert } from "./ws-alert/ws-alert";
import { checkFolderPassword } from "../services/clips.services";
import { aesEncrypt } from "../functions/crypto";

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

  // Get folder data from store
  const folder = foldersAsObject.value[currentTab.value!];
  if (folder && folder.hasPassword) {
    let password = await askForPassword(`Enter password for: '${folder.name}'`);

    if (!password) {
      $alert.warning(`Password required to paste in folder: '${folder.name}'`);
      return btn.stopLoading();
    }

    // check if clip belongs to an encrypted folder
    if (!await checkFolderPassword(folder.slug, password)) {
      $alert.error(`Incorrect password for folder: '${folder.name}'`);
      return btn.stopLoading();
    }

    // Encrypt clip
    pasteData = aesEncrypt(pasteData, password);

    // delete password from memory
    password = "";
  }

  // Send data to server
  return pasteToServer(pasteData).finally(btn.stopLoading);
}

async function pasteToServer(data: string, title?: string) {

  return $http
    .post("clips/paste", {
      title,
      content: data,
      folder: currentTab.value
    })
    .then(() => {
      $events.emit("refreshClips");
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
    class="rounded shadow-md"
  >
    <h6 v-if="currentTab && foldersAsObject[currentTab]" class="text-center text-gray-500 mb-1">
      Paste in
      <span class="text-gray-300">{{ foldersAsObject[currentTab].name }}</span>
    </h6>

    <h1 class="text-4xl hidden lg:block text-center text-gray-500 font-mono">
      <template v-if="!hasClickedPasteboard">click</template>
      <small v-if="!hasClickedPasteboard" class="mx-3 font-sans text-gray-300">&</small>
      <span>ctrl+v</span>
    </h1>

    <section class="text-center mt-5 lg:mt-10 mb-5 space-x-2 text-xs md:text-sm lg:text-base">
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
