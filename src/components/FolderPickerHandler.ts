import { ref } from "vue";
import type { OwnFolder } from "../types/models.types";

export const ShowFolderPicker = ref(false);
export const FolderPickerLabel = ref("Choose a folder:");
// Folder slugs that should not be offered (e.g. the clip's current folder)
export const FolderPickerExclude = ref<string[]>([]);
export const FolderPickerResolveFn = ref<(folder?: OwnFolder) => void>(() => {});

/**
 * Ask the user to pick one of their folders.
 * Resolves with the folder, or undefined when cancelled.
 */
export function askForFolder(label: string, exclude: string[] = []): Promise<OwnFolder | undefined> {
  FolderPickerLabel.value = label;
  FolderPickerExclude.value = exclude;
  ShowFolderPicker.value = true;

  return new Promise((resolve) => {
    FolderPickerResolveFn.value = resolve;
  });
}
