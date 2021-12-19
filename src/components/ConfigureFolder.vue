<script setup lang="ts">
import { PropType, ref } from "vue";
import { md5 } from "../functions/crypto";
import { OwnFolder } from "../types/models.types";
import LoadingButton from "../../node_modules/revue-components/vues/LoadingButton.vue";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { $http, alertRequestError } from "../http";

// Define props
const { folder } = defineProps({
  folder: {
    type: Object as PropType<OwnFolder>,
    required: true
  }
});

const password = ref("");

// Define data
const configureMenu = [{ name: "Settings" }, { name: "Delete" }];
const configureTab = ref<string>("Settings");


function setFolderPassword(btn: ILoadingButton) {
  if (!password.value) return btn.stopLoading();

  return $http
    .post(`/folder/${folder.slug}/set-password`, {
      password: md5(password.value)
    })
    .then(() => {
      // unset password.
      password.value = "";
      // reload to get fresh state.
      window.location.reload();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
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
                    type="submit"
                    :click="setFolderPassword"
                    class="btn text-sm font-medium bg-white hover:bg-gray-200 text-gray-700 rounded-sm ml-1"
                  >Set Password</LoadingButton>
                </div>
              </form>
            </div>
          </template>
        </template>
      </section>
    </section>
  </div>
</template>
