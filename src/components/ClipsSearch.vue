<script lang="ts" setup>
/** Search box for the clipboard. Debounced; `/` focuses it, Esc clears it. */
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/vue/20/solid";
import { currentFolder } from "../stores/tabs.store";
import { searchQuery, searchAllFolders, clearSearch } from "../stores/search.store";
import Input from "./ui/Input.vue";
import Kbd from "./ui/Kbd.vue";

const props = defineProps({
  delay: { type: Number, default: 300 }
});

const input = ref(searchQuery.value);
const field = ref<InstanceType<typeof Input>>();

const apply = useDebounceFn((value: string) => {
  searchQuery.value = value.trim();
}, props.delay);

watch(input, (value) => {
  // Clearing applies immediately so the list resets without waiting for the debounce.
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

function placeholder() {
  if (searchAllFolders.value) return "Search all folders";
  return currentFolder.value ? `Search in ${currentFolder.value.name}` : "Search clips";
}

function isEditable(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  return !!node && (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.isContentEditable);
}

// `/` anywhere on the page focuses the search box.
function onKey(e: KeyboardEvent) {
  if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) {
    e.preventDefault();
    field.value?.focus();
  }
}

onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));

defineExpose({ focus: () => field.value?.focus() });
</script>

<template>
  <Input
    ref="field"
    v-model="input"
    type="search"
    name="clips-search"
    autocomplete="off"
    :placeholder="placeholder()"
    aria-label="Search clips"
    class="[&_input]:bg-sunken/60 [&_input::-webkit-search-cancel-button]:hidden"
    @keydown.esc.prevent="clear"
  >
    <template #leading><MagnifyingGlassIcon /></template>
    <template #trailing>
      <button
        v-if="input"
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded text-faint hover:text-fg"
        aria-label="Clear search"
        @click="clear"
      >
        <XMarkIcon class="h-4 w-4" />
      </button>
      <Kbd v-else class="hidden sm:inline-flex">/</Kbd>
    </template>
  </Input>
</template>
