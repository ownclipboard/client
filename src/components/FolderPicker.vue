<script setup lang="ts">
import Modal from "./Modal.vue";
import { computed, onMounted } from "vue";
import { folders, getFolders } from "../stores/tabs.store";
import type { OwnFolder } from "../types/models.types";
import {
  FolderPickerExclude,
  FolderPickerLabel,
  FolderPickerResolveFn,
  ShowFolderPicker
} from "./FolderPickerHandler";

// Encrypted folders can't receive moved/copied clips, and excluded slugs are hidden.
const options = computed(() =>
  folders.value.filter(
    (f) => f.visibility !== "encrypted" && !FolderPickerExclude.value.includes(f.slug)
  )
);

onMounted(() => {
  if (!folders.value.length) getFolders();
});

function choose(folder: OwnFolder) {
  ShowFolderPicker.value = false;
  FolderPickerResolveFn.value(folder);
}

function cancel() {
  ShowFolderPicker.value = false;
  FolderPickerResolveFn.value(undefined);
}
</script>

<template>
  <Modal v-if="ShowFolderPicker" max-size="max-w-sm" @close-modal="cancel">
    <div class="p-3" @keydown.esc="cancel">
      <div class="text-sm font-medium mb-3 pr-8" v-text="FolderPickerLabel"></div>

      <div v-if="options.length" class="max-h-72 overflow-y-auto space-y-1">
        <button
          v-for="folder in options"
          :key="folder.slug"
          type="button"
          @click="choose(folder)"
          class="w-full text-left px-3 py-2 rounded bg-gray-800 hover:bg-gray-900 flex items-center justify-between"
        >
          <span>
            <i class="far fa-folder mr-2 text-gray-400"></i>{{ folder.name }}
          </span>
          <small class="text-gray-500">{{ folder.contents }}</small>
        </button>
      </div>
      <p v-else class="text-gray-400 text-sm">No other folders available.</p>

      <div class="text-center mt-3">
        <button
          type="button"
          @click="cancel"
          class="px-3 py-1 rounded-sm font-medium bg-white hover:bg-gray-200 text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  </Modal>
</template>
