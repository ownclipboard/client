<script setup lang="ts">
import { currentTab, foldersAsObject } from "../stores/tabs.store";
import { $http, alertRequestError } from "../http";
import { onMounted, ref, watch } from "vue";
import type { OwnClip } from "../types/models.types";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { aesDecrypt, aesEncrypt } from "../functions/crypto";
import { checkFolderPassword } from "../services/clips.services";
import { $alert } from "./ws-alert/ws-alert";
import { askForPassword } from "./PasswordPrompt";
import { $events } from "../events";
import { strLimitWordsByLength } from "@trapcode/js-toolbox/string/limit"
import { useClipboard } from '@vueuse/core'

const { copy } = useClipboard();
const copied = ref("");
const clips = ref<OwnClip[]>([]);
const clipsCache: Record<string, OwnClip[]> = {};

function loadClips() {
  const tab = currentTab.value!;

  // if we have clips cached for this tab,
  // use them while we're loading updated data from server
  if (clipsCache[tab]) {
    clips.value = clipsCache[tab];
  }

  return $http
    .get<any, { clips: OwnClip[] }>(`/clips/${tab}`)
    .then((response) => {
      clips.value = response.clips;
      clipsCache[tab] = response.clips;
    });
}

// Register refresh clips event 
$events.on("refreshClips", loadClips);

// Load clips on currentTab change.
watch(currentTab, loadClips);
// Load clips on first mount.
onMounted(loadClips);

// Copy clip to clipboard
function copyClip(btn: ILoadingButton, clip: OwnClip) {
  // copy clip to clipboard
  copy(clip.context)
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
 * Check if clip folder is encrypted and if clip is encrypted
 * @param clip - clip to check
 */
function belongsToEncryptedFolderButNotEncrypted(clip: OwnClip) {
  const folder = foldersAsObject.value[clip.folder];
  return folder && folder.hasPassword && !clip.encrypted;
}

/**
 * Encrypt clip
 */
async function encryptClip(btn: ILoadingButton, clip: OwnClip) {
  let password = await askForPassword("Enter password to encrypt clip");
  if (!password) return btn.stopLoading();

  // check if clip belongs to an encrypted folder
  if (!await checkFolderPassword(clip.folder, password)) {
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
      content: encryptedData,
    });

    clip.encrypted = true;
    clip.context = encryptedData;
  } catch (error) {

    alertRequestError(error);
    return btn.stopLoading();
  }
}

/**
 * Decrypt clip
 */
async function decryptClip(btn: ILoadingButton, clip: OwnClip) {
  let password = await askForPassword("Enter password to decrypt clip:");
  if (!password) return btn.stopLoading();

  // check if clip belongs to an encrypted folder
  if (!await checkFolderPassword(clip.folder, password)) {
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


// Delete clip from server
async function deleteClip(btn: ILoadingButton, [index, clip]: [index: number, clip: OwnClip]) {
  const folder = foldersAsObject.value[clip.folder];
  let password: string | undefined;

  if (folder && folder.hasPassword) {
    password = await askForPassword("Enter password to delete clip:");
    if (!password) return btn.stopLoading();
  } else {
    if (!confirm("Are you sure you want to delete this clip?")) {
      return btn.stopLoading();
    }
  }

  try {
    await $http.post(`/clip/${clip.uuid}/delete`, { password });
    clips.value = clips.value.filter((c) => c.uuid !== clip.uuid);
  } catch (error) {
    alertRequestError(error);
  } finally {
    btn.stopLoading();
  }
}


</script>
<template>
  <section class="space-y-5">
    <template v-if="clips.length" v-for="(clip, index) in clips" :key="clip.uuid">
      <div class="clip">
        <div class="meta text-xs text-gray-600">
          <div class="float-left">
            <small
              class="bg-gray-700 text-gray-200 p-1 rounded uppercase font-medium shadow"
            >{{ clip.type }}</small>
          </div>
          <div class="float-right">
            <TimeAgo :date="clip.updatedAt" />
          </div>
          <div class="clear-both"></div>
        </div>

        <div class="block my-2 text-antiquewhite text-sm font-mono">
          <div v-if="clip.encrypted && !clip.decrypted" class="text-center">
            <LoadingButton message="Decrypting" :click="decryptClip" :data="clip">
              <span class="text-gray-500">
                <i class="fa fa-lock"></i> Encrypted
              </span>
              <br />
              <small>click to decrypt</small>
            </LoadingButton>
          </div>
          <p
            v-else-if="clip.type === 'text'"
            v-text="strLimitWordsByLength(clip.context, 250, '...')"
          ></p>
          <a
            v-else-if="clip.type === 'url'"
            :href="clip.context"
            target="_blank"
            class="text-green-400 hover:text-green-500"
            v-text="clip.context"
          ></a>
        </div>

        <div class="actions" v-if="!clip.encrypted || (clip.encrypted && clip.decrypted)">
          <template v-if="belongsToEncryptedFolderButNotEncrypted(clip)">
            <LoadingButton
              message="Encrypting"
              :click="encryptClip"
              :data="clip"
              class="text-yellow-300 hover:text-yellow-500"
            >
              <i class="fa fa-key"></i> Encrypt
            </LoadingButton>
          </template>

          <LoadingButton
            message="Copying"
            :click="copyClip"
            :data="clip"
            class="text-green-300 hover:text-green-500"
          >
            <i class="fa fa-copy"></i>
            {{ copied === clip.uuid ? '#Copied!' : 'Copy' }}
          </LoadingButton>

          <LoadingButton
            message="Deleting"
            :click="deleteClip"
            :data="[index, clip]"
            class="text-red-300 hover:text-red-500"
          >
            <i class="fa fa-trash"></i> Delete
          </LoadingButton>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="text-center my-5">
        <p class="text-gray-400">No clips yet.</p>
      </div>
    </template>
  </section>
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
