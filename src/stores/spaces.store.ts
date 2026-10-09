/**
 * Spaces the user belongs to, and the one currently open.
 *
 * The sidebar needs the list everywhere, so it lives here. The open space is
 * kept here too because the toolbar, the folder strip and the clip list all
 * read from it, and they are siblings rather than parent and child.
 */
import { computed, ref } from "vue";
import {
  getSpace,
  getSpaceFolders,
  getSpaces,
  type Space,
  type SpaceDetail,
  type SpaceFolder,
  type SpaceInvite
} from "../services/spaces.service";

export const spaces = ref<Space[]>([]);
export const invites = ref<SpaceInvite[]>([]);
export const spacesLoaded = ref(false);

/** The space being viewed, with its limits and storage usage. */
export const currentSpace = ref<SpaceDetail | null>(null);
export const currentSpaceFolders = ref<SpaceFolder[]>([]);
export const currentSpaceFolder = ref("clipboard");

export const isSpaceOwner = computed(() => currentSpace.value?.role === "owner");

/** Files need the owner on Pro, and the space has a storage ceiling of its own. */
export const spaceCanUpload = computed(() => !!currentSpace.value?.limits.uploads);

export const spaceStorageLeft = computed(() => {
  const storage = currentSpace.value?.limits.storage;
  return storage ? Math.max(0, storage.max - storage.used) : 0;
});

/** Why a file cannot go into this space, or "" when one can. */
export const spaceUploadIssue = computed(() => {
  if (!currentSpace.value) return "";
  if (!spaceCanUpload.value) {
    return isSpaceOwner.value
      ? "Uploading files to a space needs Pro."
      : "The owner of this space needs Pro before anyone can upload files.";
  }
  if (spaceStorageLeft.value <= 0) return "This space has used all of its storage.";
  return "";
});

export async function loadSpaces() {
  const res = await getSpaces();
  // Defaulted rather than trusted: a payload without them would otherwise put
  // undefined where every template expects a list, and the section stops rendering.
  spaces.value = res?.spaces ?? [];
  invites.value = res?.invites ?? [];
  spacesLoaded.value = true;
}

/** Load one space and its folders. Call on entering the space view. */
export async function openSpace(spaceId: string) {
  const [{ space }, folders] = await Promise.all([getSpace(spaceId), getSpaceFolders(spaceId)]);
  currentSpace.value = space;
  currentSpaceFolders.value = Array.isArray(folders) ? folders : [];

  // The folder we were on may have been deleted by its author in the meantime.
  if (!folders.some((f) => f.slug === currentSpaceFolder.value)) currentSpaceFolder.value = "clipboard";
  return space;
}

export async function refreshSpaceFolders(spaceId: string) {
  const folders = await getSpaceFolders(spaceId);
  currentSpaceFolders.value = Array.isArray(folders) ? folders : [];
}

/** Storage usage moves on every upload and delete, so the detail is refetched. */
export async function refreshSpace(spaceId: string) {
  const { space } = await getSpace(spaceId);
  currentSpace.value = space;
  return space;
}

export function clearCurrentSpace() {
  currentSpace.value = null;
  currentSpaceFolders.value = [];
  currentSpaceFolder.value = "clipboard";
}
