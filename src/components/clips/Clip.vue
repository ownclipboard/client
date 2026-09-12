<script lang="ts" setup>
import { useClipboard } from "@vueuse/core";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { computed, PropType, provide, reactive, Ref, ref, toRefs } from "vue";
import { $events } from "../../events";
import { useAuthUser } from "../../stores/auth.store";
import { refreshAuthData } from "../../services/auth.service";
import { aesDecrypt, aesEncrypt } from "../../functions/crypto";
import { $http, alertRequestError } from "../../http";
import { checkFolderPassword } from "../../services/clips.services";
import { OwnClip } from "../../types/models.types";
import { askForPassword } from "../PasswordPromptHandler";
import { $alert } from "../ws-alert/ws-alert";
import ClipContent from "./ClipContent.vue";

const props = defineProps({
  clip: {
    type: Object as PropType<OwnClip>,
    required: true
  },
  index: {
    type: Number as PropType<number>,
    required: true
  },
  canDelete: {
    type: Boolean as PropType<boolean>,
    default: false
  }
});

const { clip, canDelete }: { clip: Ref<OwnClip>; canDelete: Ref<boolean> } = toRefs(props);
provide("clip", clip);

const { copy } = useClipboard();
const copied = ref("");

const authUser = useAuthUser();
const isPro = computed(() => authUser.data?.plan === "pro");

/* ---------------- Edit clip (Pro only) ---------------- */

const isEditing = ref(false);
const editForm = reactive({ title: "", content: "" });

function startEditing() {
  editForm.title = clip.value.title || "";
  editForm.content = clip.value.context;
  isEditing.value = true;
}

function cancelEditing() {
  isEditing.value = false;
}

async function saveClip(btn: ILoadingButton) {
  const content = editForm.content.trim();
  const title = editForm.title.trim();

  if (!content.length) {
    $alert.error("Content cannot be empty");
    return btn.stopLoading();
  }

  const data: { title?: string; content?: string } = {};
  if (title !== (clip.value.title || "")) data.title = title;

  let contentToSend = content;

  if (content !== clip.value.context) {
    // Encrypted clips are shown decrypted while editing, re-encrypt with the folder password.
    if (clip.value.encrypted) {
      let password = await askForPassword("Enter password to save encrypted clip:");
      if (!password) return btn.stopLoading();

      if (!(await checkFolderPassword(clip.value.folder, password))) {
        $alert.error(`Incorrect password for folder: '${clip.value.folder}'`);
        password = "";
        return btn.stopLoading();
      }

      contentToSend = aesEncrypt(content, password);
      password = "";
    }

    data.content = contentToSend;
  }

  if (!Object.keys(data).length) {
    isEditing.value = false;
    return btn.stopLoading();
  }

  try {
    await $http.post(`/clip/${clip.value.publicId}/update`, data);

    if (data.title !== undefined) clip.value.title = title;
    if (data.content !== undefined) clip.value.context = content;
    clip.value.updatedAt = new Date().toISOString();
    isEditing.value = false;
  } catch (e: any) {
    alertRequestError(e);
    // A 403 means the plan changed server side (e.g. subscription expired), sync it.
    if (e?.response?.status === 403) await refreshAuthData(authUser);
  } finally {
    btn.stopLoading();
  }
}

// Copy clip to clipboard
function copyClip(btn: ILoadingButton, clip: OwnClip) {
  // copy clip to clipboard
  copy(clip.context);

  // update copied message publicId
  copied.value = clip.publicId;

  // Stop loading button
  btn.stopLoading();

  // Set timeout to clear copied message
  setTimeout(() => {
    copied.value = "";
  }, 3000);
}

/**
 * Decrypt clip
 */
async function decryptClip(btn: ILoadingButton, clip: OwnClip) {
  let password = await askForPassword("Enter password to decrypt clip:");
  if (!password) return btn.stopLoading();

  // check if clip belongs to an encrypted folder
  if (!(await checkFolderPassword(clip.folder, password))) {
    $alert.error(`Incorrect password for folder: '${clip.folder}'`);
    return btn.stopLoading();
  }

  try {
    // Decrypt clip with password
    const decryptedData = aesDecrypt(clip.context, password);
    clip.decrypted = true;
    clip.context = decryptedData;
  } catch (e: any) {
    $alert.error(e.message);
  } finally {
    // delete password from memory
    password = "";
    btn.stopLoading();
  }
}

/**
 * Check if clip folder is encrypted and if clip is encrypted
 * @param clip - clip to check
 */
// function belongsToEncryptedFolderButNotEncrypted(clip: OwnClip) {
//     const folder = foldersAsObject.value[clip.folder];
//     return folder && folder.hasPassword && !clip.encrypted;
// }

/**
 * Encrypt clip
 */
async function encryptClip(btn: ILoadingButton, clip: OwnClip) {
  let password = await askForPassword("Enter password to encrypt clip");
  if (!password) return btn.stopLoading();

  // check if clip belongs to an encrypted folder
  if (!(await checkFolderPassword(clip.folder, password))) {
    $alert.error(`Incorrect password for folder: '${clip.folder}'`);
    return btn.stopLoading();
  }

  // Encrypt clip
  const encryptedData = aesEncrypt(clip.context, password);

  // delete password from memory
  password = "";

  try {
    await $http.post(`/clip/${clip.publicId}/update`, {
      encrypted: true,
      content: encryptedData
    });

    clip.encrypted = true;
    clip.context = encryptedData;
  } catch (error) {
    alertRequestError(error);
    return btn.stopLoading();
  }
}

function deleteClip(btn: ILoadingButton, data: any) {
  if (!canDelete.value) return;

  $events.emit("delete-clip", { btn, data });
}
</script>
<template>
  <div class="clip">
    <div class="meta text-xs text-gray-600">
      <div class="float-left">
        <small
          class="bg-gray-700 text-gray-200 p-1 rounded uppercase font-medium shadow"
          >{{ clip.type }}</small
        >
      </div>
      <div class="float-right">
        <TimeAgo :date="clip.updatedAt" />
      </div>
      <div class="clear-both"></div>
    </div>

    <div class="block my-2 text-antiquewhite text-sm font-mono">
      <div v-if="clip.title && !isEditing && (!clip.encrypted || clip.decrypted)" class="font-sans font-medium text-gray-300 mb-1">
        {{ clip.title }}
      </div>
      <div v-if="clip.encrypted && !clip.decrypted" class="text-center">
        <LoadingButton message="Decrypting" :click="decryptClip" :data="clip">
          <span class="text-gray-500">
            <i class="fa fa-lock"></i> {{ clip.title ? clip.title : "Encrypted" }}
          </span>
          <br />
          <small>click to decrypt</small>
        </LoadingButton>
      </div>
      <div v-else-if="isEditing" class="edit-clip">
        <input
          v-model="editForm.title"
          type="text"
          placeholder="Title (optional)"
          class="bg-gray-950 rounded placeholder:opacity-30 hover:placeholder:opacity-100 font-medium px-3 py-2 w-full focus:outline-none"
        />
        <textarea
          v-model="editForm.content"
          rows="6"
          placeholder="Clip content.."
          class="bg-gray-950 rounded px-3 py-2 w-full focus:outline-none mt-2"
        ></textarea>
        <div class="flex justify-end space-x-3 mt-2 text-xs font-sans">
          <button type="button" @click="cancelEditing" class="text-gray-400 hover:text-gray-200">
            <i class="fa fa-times"></i> Cancel
          </button>
          <LoadingButton
            message="Saving"
            :click="saveClip"
            icon="fa fa-slash fa-spin mr-1"
            class="text-green-300 hover:text-green-500 font-medium"
          >
            <i class="fa fa-save"></i> Save
          </LoadingButton>
        </div>
      </div>
      <ClipContent v-else />
    </div>

    <div class="actions" v-if="!isEditing && (!clip.encrypted || (clip.encrypted && clip.decrypted))">
      <!-- <template v-if="belongsToEncryptedFolderButNotEncrypted(clip)">
                <LoadingButton
                    message="Encrypting"
                    :click="encryptClip"
                    :data="clip"
                    class="text-yellow-300 hover:text-yellow-500"
                >
                    <i class="fa fa-key"></i> Encrypt
                </LoadingButton>
            </template> -->

      <LoadingButton
        message="Copying"
        :click="copyClip"
        :data="clip"
        class="text-green-300 hover:text-green-500"
      >
        <i class="fa fa-copy"></i>
        {{ copied === clip.publicId ? "#Copied!" : "Copy" }}
      </LoadingButton>

      <button
        v-if="isPro"
        type="button"
        @click="startEditing"
        class="text-yellow-300 hover:text-yellow-500 font-medium"
      >
        <i class="fa fa-pencil"></i> Edit
      </button>
      <RouterLink
        v-else
        :to="{ name: 'pricing' }"
        title="Editing clips is a Pro feature"
        class="text-gray-500 hover:text-yellow-300"
      >
        <i class="fa fa-lock"></i> Edit
      </RouterLink>

      <LoadingButton
        v-if="canDelete"
        message="Deleting"
        :click="deleteClip"
        :data="[clip, index]"
        class="text-red-300 hover:text-red-500"
      >
        <i class="fa fa-trash"></i> Delete
      </LoadingButton>
    </div>

    <div class="actions" v-if="clip.encrypted && !clip.decrypted">
      <LoadingButton
        message="Copying"
        :click="copyClip"
        :data="clip"
        class="text-green-300 hover:text-green-500"
      >
        <i class="fa fa-copy"></i>
        {{ copied === clip.publicId ? "#Copied!" : "Copy Encrypted Text" }}
      </LoadingButton>
    </div>
  </div>
</template>

<style scoped>
.clip {
  @apply bg-gray-900 p-3 rounded hover:-mx-4 transition-all;
}
.clip .actions {
  @apply text-center text-xs mt-3 hidden transition-all;
}

.clip:hover .actions {
  @apply block;
}

.actions {
  @apply space-x-3;
}
.actions a {
  @apply font-medium cursor-pointer;
}
</style>
