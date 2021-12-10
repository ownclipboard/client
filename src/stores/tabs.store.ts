import { $localStorage, $sessionStorage } from "./native";
import { computed, reactive, ref, watch } from "vue";
import { OwnClip, OwnFolder } from "../types/models.types";
import { $http } from "../http";

// Holds current tab state
export const currentTab = $sessionStorage.persistedRef("currentTab", "clipboard");

// Holds open tabs
export const openTabs = reactive(
  $localStorage.getObject("tabs", [
    { name: "Clipboard", slug: "clipboard", contents: 0 },
    { name: "Encrypted", slug: "encrypted", contents: 0 }
  ])
)!;

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

// Watch for changes to the openTabs array
watch(openTabs, (n) => $localStorage.setAsType("tabs", n), { immediate: true });

// Update counter on open tabs
export function updateOpenTabStats() {
  const folders = foldersAsObject.value;
  openTabs.forEach((tab) => {
    tab.contents = folders[tab.slug].contents;
  });
}

// Get folders
export function getFolders() {
  return $http.get<any, OwnFolder[]>("/folders").then((f) => {
    folders.value = f;
    updateOpenTabStats();
  });
}