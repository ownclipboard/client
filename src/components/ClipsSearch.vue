<script lang="ts" setup>
import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/solid";
import { currentTab, foldersAsObject } from "../stores/tabs.store";
import { searchQuery, searchAllFolders, clearSearch } from "../stores/search.store";

const props = defineProps({
  // Debounce delay before the query is applied
  delay: { type: Number, default: 300 },
  placeholder: { type: String, default: "" }
});

const input = ref(searchQuery.value);

const apply = useDebounceFn((value: string) => {
  searchQuery.value = value.trim();
}, props.delay);

watch(input, (value) => {
  // Apply clears immediately so the list resets without waiting for the debounce.
  if (!value.trim()) return clearSearch();
  apply(value);
});

// Keep the box in sync if the query is cleared elsewhere.
watch(searchQuery, (value) => {
  if (!value && input.value) input.value = "";
});

function clear() {
  input.value = "";
  clearSearch();
}

function computedPlaceholder() {
  if (props.placeholder) return props.placeholder;
  if (searchAllFolders.value) return "Search all folders";
  const folder = currentTab.value ? foldersAsObject.value[currentTab.value] : undefined;
  return folder ? `Search in ${folder.name}` : "Search";
}

function toggleAllFolders() {
  searchAllFolders.value = !searchAllFolders.value;
}
</script>

<template>
  <div class="flex items-center space-x-2">
    <label for="clips-search" class="sr-only">Search clips</label>
    <div class="relative flex-1">
      <div class="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
        <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>
      <input
        id="clips-search"
        v-model="input"
        name="clips-search"
        type="text"
        autocomplete="off"
        :placeholder="computedPlaceholder()"
        @keydown.esc.prevent="clear"
        class="block w-full bg-gray-700 border border-transparent rounded-md py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:border-white focus:ring-white focus:text-gray-900 focus:placeholder-gray-500"
      />
    </div>

    <button
      type="button"
      @click="toggleAllFolders"
      :title="searchAllFolders ? 'Searching all folders. Click to search the current folder only.' : 'Searching the current folder only. Click to search all folders.'"
      :aria-pressed="searchAllFolders"
      :class="searchAllFolders
        ? 'bg-green-500 text-gray-900 border-green-500'
        : 'bg-gray-700 text-gray-400 border-gray-600 hover:text-white hover:border-gray-400'"
      class="text-xs font-medium px-2 py-2 rounded-md border transition-colors whitespace-nowrap"
    >
      <i class="far fa-folder-open mr-1"></i>All folders
    </button>

    <button
      v-if="searchQuery || input"
      type="button"
      @click="clear"
      title="Clear search"
      class="text-gray-400 hover:text-white bg-gray-700 border border-gray-600 hover:border-gray-400 rounded-md px-2 py-2 text-xs transition-colors"
    >
      <span class="sr-only">Clear search</span>
      <i class="fa fa-times"></i>
    </button>
  </div>
</template>
