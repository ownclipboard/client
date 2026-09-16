<script setup lang="ts">
import { computed, watch } from "vue";
import { FolderIcon } from "@heroicons/vue/20/solid";
import { folders, foldersLoaded, getFolders } from "../stores/tabs.store";
import type { OwnFolder } from "../types/models.types";
import { FolderPickerExclude, FolderPickerLabel, FolderPickerResolveFn, ShowFolderPicker } from "./FolderPickerHandler";
import Dialog from "./ui/Dialog.vue";
import Button from "./ui/Button.vue";

// Encrypted folders can't receive moved/copied clips, and excluded slugs are hidden.
const options = computed(() =>
  folders.value.filter((f) => f.visibility !== "encrypted" && !FolderPickerExclude.value.includes(f.slug))
);

watch(ShowFolderPicker, (show) => {
  if (show && !foldersLoaded.value) getFolders();
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
  <Dialog :open="ShowFolderPicker" size="sm" :title="FolderPickerLabel" flush @close="cancel">
    <div v-if="options.length" class="p-2">
      <button
        v-for="folder in options"
        :key="folder.slug"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-fg hover:bg-accent-soft/70"
        @click="choose(folder)"
      >
        <FolderIcon class="h-4 w-4 text-faint" />
        <span class="flex-1 truncate">{{ folder.name }}</span>
        <span class="text-[11px] tabular-nums text-faint">{{ folder.contents }}</span>
      </button>
    </div>
    <p v-else class="px-5 py-6 text-center text-sm text-muted">No other folders available. Encrypted folders can't receive clips.</p>
    <template #footer>
      <Button variant="ghost" @click="cancel">Cancel</Button>
    </template>
  </Dialog>
</template>
