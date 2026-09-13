import { $localStorage, $sessionStorage } from "./native";
import { computed, ref } from "vue";
import { OwnFolder } from "../types/models.types";
import { $http } from "../http";

// Slug of the folder currently shown in the clipboard.
export const currentTab = $sessionStorage.persistedRef("currentTab", "clipboard");

// The old "open tabs" strip is gone; drop its persisted state.
$localStorage.remove("tabs");

// Folders as an array of objects
export const folders = ref<OwnFolder[]>([]);
export const foldersLoaded = ref(false);

// Folders as a computed object using slug as keys
export const foldersAsObject = computed(() => {
  const data: Record<string, OwnFolder> = {};
  folders.value.forEach((folder) => {
    data[folder.slug] = folder;
  });
  return data;
});

export const currentFolder = computed(() => foldersAsObject.value[currentTab.value]);

/**
 * An encrypted folder holds nothing but ciphertext, and the password that makes
 * it is never stored. Until one is set there is nothing to encrypt a new clip
 * with, so the folder cannot take writes.
 */
export function folderNeedsPassword(folder?: OwnFolder) {
  return !!folder && folder.visibility === "encrypted" && !folder.hasPassword;
}

export const currentFolderNeedsPassword = computed(() => folderNeedsPassword(currentFolder.value));

// Get folders
export async function getFolders() {
  folders.value = await $http.get<any, OwnFolder[]>("/folders");
  foldersLoaded.value = true;

  // The current folder no longer exists (deleted elsewhere): fall back to the default.
  if (!foldersAsObject.value[currentTab.value]) currentTab.value = "clipboard";
}

export function openFolder(slug: string) {
  currentTab.value = slug;
}
