<script lang="ts" setup>
import { useClipboard } from "@vueuse/core";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { PropType, provide, ref, toRefs } from "vue";
import { $events } from "../../events";
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

const { clip, canDelete } = toRefs(props);
provide("clip", clip);

const { copy } = useClipboard();
const copied = ref("");

// Copy clip to clipboard
function copyClip(btn: ILoadingButton, clip: OwnClip) {
  // copy clip to clipboard
  copy(clip.context);

  // update copied message uuid
  copied.value = clip.uuid;

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
    await $http.post(`/clip/${clip.uuid}/update`, {
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
      <div v-if="clip.encrypted && !clip.decrypted" class="text-center">
        <LoadingButton message="Decrypting" :click="decryptClip" :data="clip">
          <span class="text-gray-500"> <i class="fa fa-lock"></i> Encrypted </span>
          <br />
          <small>click to decrypt</small>
        </LoadingButton>
      </div>
      <ClipContent v-else />
    </div>

    <div class="actions" v-if="!clip.encrypted || (clip.encrypted && clip.decrypted)">
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
        {{ copied === clip.uuid ? "#Copied!" : "Copy" }}
      </LoadingButton>

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
        {{ copied === clip.uuid ? "#Copied!" : "Copy Encrypted Text" }}
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
