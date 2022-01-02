import { $localStorage, $sessionStorage } from "./native";
import { computed, ref } from "vue";
import { OwnFolder } from "../types/models.types";
import { $http } from "../http";

// Holds current tab state
export const currentTab = $sessionStorage.persistedRef("currentTab", "clipboard");

// Holds open tabs
export const openTabs = $localStorage.persistedReactive("tabs", [
  { name: "Clipboard", slug: "clipboard", contents: 0 },
  { name: "Encrypted", slug: "encrypted", contents: 0 }
]);

// Folders as an array of objects
export const folders = ref<OwnFolder[]>([]);
// Folders as a computed object using slug as keys
export const foldersAsObject = computed(() => {
  const data: Record<string, OwnFolder> = {};
  folders.value.forEach((folder) => {
    data[folder.slug] = folder;
  });
  return data;
});

// Update counter on open tabs
export function updateOpenTabStats() {
  const folders = foldersAsObject.value;

  openTabs.forEach((tab, i) => {
    const folder = folders[tab.slug];

    if (folder) {
      tab.contents = folders[tab.slug].contents;
    } else {
      // delete tab if folder no longer exists
      openTabs.splice(i, 1);
    }
  });
}

// Get folders
export async function getFolders() {
  folders.value = await $http.get<any, OwnFolder[]>("/folders");
  updateOpenTabStats();
}
