<script setup lang="ts">
import { onMounted, ref } from "vue";
import { currentTab, folders, getFolders, openTabs } from "../stores/tabs.store";
import type { ILoadingButton } from "revue-components/vues/component-types";
import type { OwnFolder } from "../types/models.types";
import { $http, alertRequestError } from "../http";

const showAddFolderForm = ref(false);
const newFolderName = ref("");

function createFolder(btn: ILoadingButton) {
  if (!newFolderName.value) return btn.stopLoading();

  return $http
    .post("/folders", {
      name: newFolderName.value
    })
    .then(() => {
      newFolderName.value = "";
      showAddFolderForm.value = false;
    })
    .then(getFolders)
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/**
 * Open Folder
 */
function openFolder(btn: ILoadingButton, folder: OwnFolder) {
  // Stop if already open
  if (folder.slug === currentTab.value) return btn.stopLoading();

  // Push to tabs if not already in tabs
  if (!openTabs.some((tab) => folder.slug === tab.slug)) {
    openTabs.push(folder);
  }

  // Set current tab
  currentTab.value = folder.slug;

  // stop loading
  btn.stopLoading();
}

onMounted(getFolders);
</script>
<template>
  <section class="space-x-3 space-y-3 lg:px-4 my-5 lg:my-10">
    <h3 class="text-gray-400 text-xs font-medium uppercase">Folders:</h3>
    <template v-for="folder in folders" :key="folder.slug">
      <LoadingButton
        :click="openFolder"
        :data="folder"
        icon="fa fa-slash fa-spin mr-3"
        :message="`Opening (${folder.name})`"
        class="btn -px px-3 gray border border-gray-500 rounded-md text-xs"
      >
        <i
          :class="[currentTab === folder.slug ? 'fa-folder-open' : 'fa-folder']"
          class="fa text-gray-400"
        ></i>
        <span class="mx-1 font-medium text-gray-400">{{ folder.name }}</span>
        <span class="text-yellow-300 font-medium">({{ folder.contents }})</span>
      </LoadingButton>
    </template>

    <form v-if="showAddFolderForm" class="inline-block space-x-4">
      <input
        type="text"
        v-model="newFolderName"
        placeholder="Folder Name"
        class="bg-gray-900 p-2 text-sm border rounded border-gray-700 focus:outline-none"
      />

      <LoadingButton
        type="submit"
        :click="createFolder"
        message
        class="text-green-300"
        icon="fa fa-slash fa-spin mr-3"
        ><i class="fa fa-save"></i
      ></LoadingButton>

      <button @click.prevent="showAddFolderForm = false" class="text-red-300">
        <i class="fa fa-times"></i>
      </button>
    </form>

    <a
      v-else
      @click.prevent="showAddFolderForm = true"
      class="text-sm text-green-300 hover:text-green-500"
    >
      <i class="fa fa-folder-plus mr-1"></i> Add</a
    >
  </section>
</template>
