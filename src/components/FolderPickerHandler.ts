import { ref } from "vue";
import type { OwnFolder } from "../types/models.types";

export const ShowFolderPicker = ref(false);
export const FolderPickerLabel = ref("Choose a folder:");
// Folder slugs that should not be offered (e.g. the clip's current folder)
export const FolderPickerExclude = ref<string[]>([]);
export const FolderPickerResolveFn = ref<(folder?: OwnFolder) => void>(() => {});
// Folders to choose from. Null means the user's own, which is the usual case;
// a space supplies its own list instead.
export const FolderPickerFolders = ref<OwnFolder[] | null>(null);

/**
 * Ask the user to pick a folder. Theirs by default, or whichever list is given.
 * Resolves with the folder, or undefined when cancelled.
 */
export function askForFolder(
  label: string,
  exclude: string[] = [],
  choices?: OwnFolder[]
): Promise<OwnFolder | undefined> {
  FolderPickerLabel.value = label;
  FolderPickerExclude.value = exclude;
  FolderPickerFolders.value = choices || null;
  ShowFolderPicker.value = true;

  return new Promise((resolve) => {
    FolderPickerResolveFn.value = resolve;
  });
}
