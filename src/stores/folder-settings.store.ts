import { ref } from "vue";

/** Slug of the folder whose settings dialog is open, or null. */
export const folderSettingsSlug = ref<string | null>(null);

export function openFolderSettings(slug: string) {
  folderSettingsSlug.value = slug;
}

export function closeFolderSettings() {
  folderSettingsSlug.value = null;
}
