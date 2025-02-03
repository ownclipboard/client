<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $http } from "../http";
import { currentTab, foldersAsObject, getFolders } from "../stores/tabs.store";
import { $events } from "../events";
import { askForPassword } from "./PasswordPromptHandler";
import { $alert } from "./ws-alert/ws-alert";
import { checkFolderPassword } from "../services/clips.services";
import { aesEncrypt } from "../functions/crypto";
import { nanoid } from "nanoid";

type Todo = "paste" | "create";
const todo = ref<Todo>("create");

const hasClickedPasteboard = ref(false);

function clickPasteBoard(val: boolean = true) {
  hasClickedPasteboard.value = val;
}

function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, {
    lastModified: new Date().getTime(),
    type: blob.type
  });
}

async function getPasteItem() {
  let type: "text" | "image" = "text";
  let data: any = "";

  try {
    const pasteItems = await window.navigator.clipboard.read();

    if (pasteItems && pasteItems.length) {
      const item = pasteItems[0];

      if (item.types.includes("text/plain")) {
        const blob = await item.getType("text/plain");
        data = await blob.text();
        type = "text";
      } else if (item.types.includes("image/png")) {
        const blob = await item.getType("image/png");
        data = blobToFile(blob, nanoid() + ".png");
        type = "image";
      }
    }
  } catch (e: any) {
    // console.error(e.message);
  }

  return [type, data];
}

// onMounted(getPasteItem);

async function pasteFromBtn(btn: ILoadingButton) {
  await paste();
  btn.stopLoading();
}

async function paste() {
  clickPasteBoard(false);

  let [type, pasteData] = await getPasteItem();

  if (!pasteData) return;

  if (type === "text") {
    // trim whitespace
    pasteData = pasteData.trim();

    // If there is no data, return
    if (!pasteData.length) return;

    // Get folder data from store
    const folder = foldersAsObject.value[currentTab.value!];
    if (folder && folder.hasPassword) {
      let password = await askForPassword(`Enter password for: '${folder.name}'`);

      if (!password) {
        $alert.warning(`Password required to paste in folder: '${folder.name}'`);
        return;
      }

      // check if clip belongs to an encrypted folder
      if (!(await checkFolderPassword(folder.slug, password))) {
        $alert.error(`Incorrect password for folder: '${folder.name}'`);
        return;
      }

      // Encrypt clip
      pasteData = aesEncrypt(pasteData, password);
    }

    // Send data to server
    await pasteToServer(pasteData);

  } else if (type === "image") {
    // Send data to server
    const file = pasteData as File;
    console.log(file);
  }

  return;
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

function switchTodo(val: Todo) {
  todo.value = val;
}
</script>

<template>
  <keep-alive>
    <section
      v-if="todo==='paste'"
      @click.prevent="clickPasteBoard(true)"
      @mouseleave="clickPasteBoard(false)"
      @focusout="clickPasteBoard(false)"
      class="rounded shadow-md bg-gray-900 hover:bg-gray-950"
    >
      <h6
        v-if="currentTab && foldersAsObject[currentTab]"
        class="text-center text-gray-500 mb-1"
      >
        Paste in
        <span class="text-gray-300">{{ foldersAsObject[currentTab].name }}</span>
      </h6>

      <h1 class="text-4xl hidden lg:block text-center text-gray-500 font-mono tracking-wider">
        <template v-if="!hasClickedPasteboard">click</template>
        <small v-if="!hasClickedPasteboard" class="mx-3 font-sans text-gray-300">&</small>
        <span>ctrl+v</span>
      </h1>

      <section
        class="text-center mt-5 lg:mt-10 mb-5 space-x-2 text-xs md:text-sm lg:text-base"
      >
        <LoadingButton :click="pasteFromBtn" class="btn gray  rounded">
          <i class="fa fa-paste"></i>
          PASTE
        </LoadingButton>
        <button class="btn gray rounded" @click="switchTodo('create')">
          <i class="fa fa-pen"></i>
          CREATE
        </button>
      </section>
    </section>
    <section
      v-else-if="todo==='create'"
      class="rounded shadow-md bg-gray-900 hover:bg-gray-950">
      <div class="flex justify-end px-3">
        <button>
          <i class="fas fa-times fa-2x"></i>
        </button>
      </div>
    </section>
  </keep-alive>
</template>
