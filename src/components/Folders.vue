<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  currentTab,
  folders,
  getFolders,
  openTabs,
  foldersAsObject
} from "../stores/tabs.store";
import type { ILoadingButton } from "revue-components/vues/component-types";
import type { OwnFolder } from "../types/models.types";
import { $http, alertRequestError } from "../http";
import Modal from "./Modal.vue";
import ConfigureFolder from "./ConfigureFolder.vue";

const showAddFolderForm = ref(false);
const newFolderName = ref("");

// Configure Folder Modal Variables
const configuringFolder = ref<OwnFolder>();

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

// Get visibility icon
function visibilityIcon(visibility: OwnFolder["visibility"]) {
  switch (visibility) {
    case "private":
      return "fa-eye-slash";
    case "encrypted":
      return "fa-lock";
    default:
      return "fa-folder";
  }
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

/**
 * Configure folder
 */
function configureFolder() {
  // Open folder
  if (!currentTab.value) return;
  configuringFolder.value = foldersAsObject.value[currentTab.value!];
}

onMounted(getFolders);
</script>
<template>
  <section class="space-x-3 space-y-3 lg:px-4 my-5 lg:my-10">
    <div class="text-gray-400 text-xs font-medium uppercase">
      <span class="mr-2">Folders:</span>
      <a
        @click.prevent="configureFolder"
        href="#"
        class="text-xs text-yellow-300 opacity-50 hover:opacity-90"
      >
        <i class="fa fa-cog mr-1"></i>
        Configure ({{ currentTab }})
      </a>
    </div>
    <template v-for="folder in folders" :key="folder.slug">
      <LoadingButton
        :click="openFolder"
        :data="folder"
        icon="fa fa-slash fa-spin mr-3"
        :message="`Opening (${folder.name})`"
        class="btn -px px-3 gray border border-gray-500 rounded-md text-xs"
      >
        <i :class="visibilityIcon(folder.visibility)" class="fa text-gray-400"></i>
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
      >
        <i class="fa fa-save"></i>
      </LoadingButton>

      <button @click.prevent="showAddFolderForm = false" class="text-red-300">
        <i class="fa fa-times"></i>
      </button>
    </form>

    <button
      v-else
      @click.prevent="showAddFolderForm = true"
      class="text-sm text-green-300 hover:text-green-500"
    >
      <i class="fa fa-folder-plus mr-1"></i> Add
    </button>
  </section>

  <!--  Configure Folder Modal -->
  <Modal v-if="configuringFolder" max-size="max-w-md" @closeModal="configuringFolder = undefined">
    <ConfigureFolder :folder="configuringFolder" />
  </Modal>
</template>
