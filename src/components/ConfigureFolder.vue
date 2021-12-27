<script setup lang="ts">
import { computed, onMounted, PropType, ref, toRefs } from "vue";
import { md5 } from "../functions/crypto";
import type { OwnFolder } from "../types/models.types";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $http, alertRequestError } from "../http";
import config from "../config";
import { useRouter } from "vue-router";
import { useClipboard } from "@vueuse/core";
import { currentTab, foldersAsObject, getFolders } from "../stores/tabs.store";
import { redirect } from "../functions";
import { $alert } from "./ws-alert/ws-alert";

// Define props
const props = defineProps({
  folder: {
    type: String,
    required: true
  }
});

const folder = ref<OwnFolder>(foldersAsObject.value[props.folder]);

async function resetFolder() {
  await getFolders();
  folder.value = foldersAsObject.value[props.folder];
}


const [$router] = [useRouter()]
const { copy, copied } = useClipboard();
const password = ref("");
const deleteFolderName = ref("");
const publicPasteUrl = computed(() => folder.value.publicPaste ? config.baseUrl + $router.resolve({ name: 'public-paste', params: { pasteId: folder.value.publicPaste.id } }).href : "#");

// Define data
const configureMenu = [{ name: "Settings" }, { name: "Delete" }];
const configureTab = ref<string>("Settings");

// Copy public paste url to clipboard
function copyPublicPasteUrl() {
  if (folder.value.publicPaste)
    copy(publicPasteUrl.value);
}

// Set folder password
function setFolderPassword(btn: ILoadingButton) {
  if (!password.value) return btn.stopLoading();

  return $http
    .post(`/folder/${folder.value.slug}/set-password`, {
      password: md5(password.value)
    })
    .then(() => {
      // unset password.
      password.value = "";
      // reload to get fresh state.
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    })
    .catch(e => {
      alertRequestError(e);
      btn.stopLoading();
    });
}

async function togglePublicPaste(btn: ILoadingButton) {
  try {
    if (folder.value.publicPaste) {
      await $http.post(`/folder/${folder.value.slug}/disable-public-paste`);
    } else {
      await $http.post(`/folder/${folder.value.slug}/enable-public-paste`);
    }

    await resetFolder();
    btn.stopLoading()
  } catch (e) {
    alertRequestError(e);
    btn.stopLoading();
  }
}

async function deleteFolder(btn: ILoadingButton) {
  if (!deleteFolderName.value) return btn.stopLoading(() => $alert.warning("Folder name is required!"));
  if (deleteFolderName.value !== folder.value.name) {
    return btn.stopLoading(() => $alert.warning("Folder name does not match!"))
  }

  try {
    await $http.delete(`/folder/${folder.value.slug}`);
    currentTab.value = "clipboard";
    redirect($router.resolve({ name: 'clipboard' }).href, 2000);
  } catch (e) {
    alertRequestError(e);
    btn.stopLoading();
  }
}
</script>

<template>
  <div>
    <h3 class="px-3 pt-3 pb-1 m-0">
      Configure
      <span class="text-green-300">"{{ folder.name }}"</span> Folder
    </h3>

    <hr class="opacity-20 p-0 m-0" />

    <section class="py-3 px-2">
      <!--   Group button menu     -->
      <div class="space-x-2 text-center my-3">
        <template v-for="item in configureMenu">
          <button
            v-if="item.name !== 'Delete' || (item.name === 'Delete' && folder.slug !== 'clipboard')"
            @click.prevent="configureTab = item.name"
            :class="{
              'bg-gray-800 text-green-300 font-medium rounded-md':
                configureTab === item.name
            }"
            class="px-3 py-1.5 text-sm rounded"
          >{{ item.name }}</button>
        </template>
      </div>

      <section>
        <!--   Settings tab     -->
        <template v-if="configureTab === 'Settings'">
          <!-- If folder is encrypted but not setup i.e no password set -->
          <template v-if="folder.visibility === 'encrypted' && !folder.hasPassword">
            <div class="text-sm bg-cyan-200 text-cyan-900 p-1 rounded-sm">
              <i class="fa fa-info-circle mr-1 text-xl opacity-80"></i>
              This folder is an encrypted folder but has no password set yet!
              <strong
                class="ml-1"
              >Note:</strong> All encryptions are done in your
              <strong>browser</strong> Password is required to encrypt/decrypt the folder contents.
            </div>

            <div class="my-5">
              <form @submit.prevent="false">
                <div class="text-center">
                  <input
                    type="password"
                    id="folder-password"
                    v-model="password"
                    placeholder="Encryption Password"
                    class="bg-gray-800 p-2 text-sm border rounded border-gray-700 focus:outline-none"
                  />
                  <LoadingButton
                    icon="fa fa-slash fa-spin mr-3"
                    type="submit"
                    :click="setFolderPassword"
                    class="btn text-sm font-medium bg-white hover:bg-gray-200 text-gray-700 rounded-sm ml-1"
                  >Set Password</LoadingButton>
                </div>
              </form>
            </div>
          </template>

          <!-- Enable public paste -->
          <template v-if="folder.visibility === 'public'">
            <div class="my-5">
              <div class="float-left">
                <LoadingButton
                  :click="togglePublicPaste"
                  icon="fa fa-spinner fa-spin text-yellow-400 text-lg"
                  message
                  class="opacity opacity-80 text-2xl mr-2"
                >
                  <i
                    v-if="folder.publicPaste"
                    class="fa text-green-400 fa-toggle-on"
                    title="Enabled"
                  ></i>
                  <i v-else class="fa text-gray-500 fa-toggle-off" title="Disabled"></i>
                </LoadingButton>
                <span class="text-sm font-medium">Public Paste</span>
              </div>

              <div class="float-right">
                <a
                  @click.prevent="copyPublicPasteUrl"
                  href="#"
                  v-if="folder.publicPaste"
                  class="text-xs text-green-300 ml-3 float-right"
                >{{ copied ? '#copied' : 'Copy Public Paste Url' }}</a>
              </div>
              <div class="clear-both"></div>
              <small
                class="text-gray-300 text-xs font-light"
              >With public paste enabled, anyone with your public paste url can paste into this folder.</small>
            </div>
          </template>
        </template>

        <!--   Delete tab     -->
        <template v-if="configureTab === 'Delete'">
          <div class="my-5">
            <div
              class="text-sm bg-red-200 text-red-900 p-1 rounded-sm"
            >To confirm delete, type the name of the folder in the box below.</div>

            <div class="my-5">
              <form @submit.prevent="false">
                <div class="text-center">
                  <input
                    type="text"
                    id="folder-name"
                    v-model="deleteFolderName"
                    placeholder="Folder Name"
                    class="bg-gray-800 p-2 text-sm border rounded border-gray-700 focus:outline-none"
                  />
                  <LoadingButton
                    icon="fa fa-slash fa-spin mr-3"
                    type="submit"
                    :click="deleteFolder"
                    class="btn text-sm font-medium bg-white hover:bg-gray-200 text-gray-700 rounded-sm ml-1"
                  >Delete Folder</LoadingButton>
                </div>
              </form>
            </div>
          </div>
        </template>
      </section>
    </section>
  </div>
</template>
