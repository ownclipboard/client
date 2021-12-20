<script setup lang="ts">
import { currentTab, foldersAsObject } from "../stores/tabs.store";
import { $http, alertRequestError } from "../http";
import { onMounted, ref, watch } from "vue";
import type { OwnClip } from "../types/models.types";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { aesDecrypt, aesEncrypt, md5 } from "../functions/crypto";
import { checkFolderPassword } from "../services/clips.services";
import { $alert } from "./ws-alert/ws-alert";
import { askForPassword } from "./PasswordPrompt";

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

// Load clips on currentTab change.
watch(currentTab, loadClips);
// Load clips on first mount.
onMounted(loadClips);

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
  let password = prompt("Enter password to encrypt clip");
  if (!password) return btn.stopLoading();

  // hash password with md5
  password = md5(password);

  console.log(await checkFolderPassword(clip.folder, password), "password");

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

  // hash password with md5
  password = md5(password);

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

</script>
<template>
  <section class="space-y-5">
    <template v-for="clip in clips" :key="clip.uuid">
      <div class="clip">
        <div class="meta text-xs text-gray-600">
          <div class="float-left">Length: {{ clips.length }}</div>
          <div class="float-right">
            <TimeAgo :date="clip.updatedAt" />
          </div>
          <div class="clear-both"></div>
        </div>

        <div class="block my-2 text-antiquewhite text-sm font-mono">
          <div v-if="clip.encrypted && !clip.decrypted" class="text-center">
            <LoadingButton :click="decryptClip" :data="clip">
              <span class="text-gray-500">
                <i class="fa fa-lock"></i> Encrypted
              </span>
              <br />
              <small>click to decrypt</small>
            </LoadingButton>
          </div>
          <p v-else-if="clip.type === 'text'" v-text="clip.context"></p>
          <a
            v-else-if="clip.type === 'url'"
            :href="clip.context"
            target="_blank"
            class="text-green-400 hover:text-green-500"
            v-text="clip.context"
          ></a>
        </div>

        <div class="actions">
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
        </div>
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

.actions a {
  @apply cursor-pointer;
}
</style>
