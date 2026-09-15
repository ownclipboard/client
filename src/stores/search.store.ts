import { ref } from "vue";

/**
 * Current clips search query.
 * Written by `ClipsSearch.vue`, read by `Clips.vue`.
 * Empty string means "not searching", show the normal folder listing.
 */
export const searchQuery = ref("");

/** When true, search ignores the current folder and looks through all folders. */
export const searchAllFolders = ref(false);

export function clearSearch() {
  searchQuery.value = "";
}
