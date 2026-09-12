<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $http } from "../http";
import { currentTab, foldersAsObject, getFolders } from "../stores/tabs.store";
import { $events } from "../events";
import { askForPassword } from "./PasswordPromptHandler";
import { $alert } from "./ws-alert/ws-alert";
import { checkFolderPassword } from "../services/clips.services";
import { aesEncrypt } from "../functions/crypto";
import { nanoid } from "nanoid";
import ClipsSearch from "./ClipsSearch.vue";

type Todo = "paste" | "create";
const todo = ref<Todo>("paste");

const createForm = reactive({
  title: "" as string,
  content: "" as string
});

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
  try {
    await paste();
  } catch (e) {
    // $alert.error("Error pasting content");
  } finally {
    btn.stopLoading();
  }
}

async function paste() {
  let type: "text" | "image" = "text";
  let pasteData: any;
  let title: string | undefined;

  if (todo.value === "create") {
    pasteData = createForm.content;
    title = createForm.title;
  } else {
    [type, pasteData] = await getPasteItem();
  }


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
    await pasteToServer(pasteData, title);

  } else if (type === "image") {
    // Send data to server
    const file = pasteData as File;
    console.log(file);
  }

  return;
}

async function pasteToServer(content: string, title?: string) {

  const data: Record<string, any> = {
    content,
    folder: currentTab.value
  };

  if (title) {
    data.title = title;
  }

  return $http
    .post("clips/paste", data)
    .then(() => {
      $events.emit("refreshClips");
    })
    .then(getFolders);
}

function switchTodo(val: Todo) {
  todo.value = val;
}

function resetCreateForm() {
  createForm.title = "";
  createForm.content = "";
}

async function createContent(btn: ILoadingButton) {
  if (!createForm.content) {
    $alert.warning("Content is required");
    return btn.stopLoading();
  }

  try {
    await paste();
    resetCreateForm();
  } finally {
    btn.stopLoading();
  }
}
</script>

<template>
  <keep-alive>
    <section
      v-if="todo==='paste'"
      class="flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm lg:text-base"
    >
      <ClipsSearch class="w-full sm:max-w-md" />

      <div class="flex items-center space-x-2 ml-auto">
      <LoadingButton :click="pasteFromBtn" message="Pasting" class="btn rounded shadow-md bg-gray-900 hover:bg-gray-950 border border-gray-700">
        <i class="fa fa-paste"></i>
        Paste
        <template v-if="currentTab && foldersAsObject[currentTab]">
          in <span class="text-green-300 font-medium">{{ foldersAsObject[currentTab].name }}</span>
        </template>
      </LoadingButton>
      <button class="btn rounded shadow-md bg-gray-900 hover:bg-gray-950 border border-gray-700" @click="switchTodo('create')">
        <i class="fa fa-pen"></i>
        Create
      </button>
      </div>
    </section>
    <section
      v-else-if="todo==='create'"
      class="rounded shadow-md bg-gray-900 hover:bg-gray-950 max-w-3xl ml-auto">
      <div class="flex py-2 border-gray-800">
        <div class="w-full">
          <input
            v-model="createForm.title"
            type="text"
            placeholder="Title (optional)"

            class="bg-transparent text-lg placeholder:opacity-30 hover:placeholder:opacity-100 font-medium px-3 py-2 w-full focus:outline-none"
          />
        </div>
        <button @click="switchTodo('paste')" class="text-gray-700 hover:text-green-500 px-3">
          <i class="far fa-times fa-2x"></i>
        </button>
      </div>

      <textarea
        v-model="createForm.content"
        autofocus
        placeholder="Paste content here.."
        rows="8"
        class="bg-transparent px-3 py-2 w-full focus:outline-none"></textarea>


      <div class="text-right p-3">
        <LoadingButton :click="createContent" class="btn gray rounded">
          Create
        </LoadingButton>
      </div>

    </section>
  </keep-alive>
</template>
