<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../http";
import { $alert } from "../components/ws-alert/ws-alert";
import { connectOwns3, disconnectOwns3, getOwns3Status, type Owns3Status } from "../services/files.service";

const status = ref<Owns3Status | null>(null);
const loading = ref(true);
const showForm = ref(false);

const DEFAULT_OWNS3_ENDPOINT = "https://s3.ownclipboard.com";
const form = reactive({ endpoint: DEFAULT_OWNS3_ENDPOINT, apiKey: "" });

async function loadStatus() {
  try {
    status.value = await getOwns3Status();
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadStatus);

function connect(btn: ILoadingButton) {
  const endpoint = form.endpoint.trim();
  const apiKey = form.apiKey.trim();

  if (!endpoint || !apiKey) {
    $alert.warning("Both the server url and the api key are required.");
    return btn.stopLoading();
  }

  return connectOwns3(endpoint, apiKey)
    .then((res) => {
      status.value = res;
      form.apiKey = "";
      showForm.value = false;
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function disconnect(btn: ILoadingButton) {
  if (!confirm("Disconnect your owns3 server? Uploaded files stay on it but become unavailable until you reconnect.")) {
    return btn.stopLoading();
  }

  return disconnectOwns3()
    .then(() => {
      status.value = { connected: false };
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}
</script>

<template>
  <div>
    <div class="text-4xl font-bold text-green-400 text-left mb-3">Settings</div>

    <section class="bg-gray-900 rounded p-4 max-w-3xl">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-xl font-bold text-teal-400">File storage (owns3)</div>
          <p class="text-gray-400 text-sm mt-1">
            Files you upload are stored on your own
            <a href="https://github.com/ownclipboard/owns3" target="_blank" rel="noopener" class="text-antiquewhite">owns3</a>
            server. Connect it with an application api key that has read, write and delete permissions.
          </p>
        </div>
      </div>

      <div v-if="loading" class="text-gray-500 mt-4">Loading...</div>

      <template v-else-if="status?.connected && !showForm">
        <div class="mt-4 text-sm space-y-1">
          <div><span class="text-gray-400">Status:</span> <b class="text-green-400">Connected</b></div>
          <div><span class="text-gray-400">Server:</span> <span class="font-mono">{{ status.endpoint }}</span></div>
          <div v-if="status.app"><span class="text-gray-400">App:</span> {{ status.app.name }}</div>
          <div v-if="status.permissions"><span class="text-gray-400">Permissions:</span> {{ status.permissions.join(", ") }}</div>
          <div v-if="status.connectedAt">
            <span class="text-gray-400">Connected:</span> <TimeAgo :date="status.connectedAt" />
          </div>
        </div>
        <div class="mt-4 flex space-x-3 text-sm font-medium">
          <button type="button" @click="showForm = true" class="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700">
            Replace connection
          </button>
          <LoadingButton :click="disconnect" message="Disconnecting" class="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-red-300">
            Disconnect
          </LoadingButton>
        </div>
      </template>

      <form v-else class="form mt-4 space-y-3" @submit.prevent>
        <div v-if="!status?.connected" class="text-sm text-yellow-300">
          No owns3 server connected. File uploads are disabled until you connect one.
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Server url</label>
          <input v-model="form.endpoint" type="url" :placeholder="DEFAULT_OWNS3_ENDPOINT" autocomplete="off" />
          <p class="text-xs text-gray-500 mt-1">Leave as is to use the hosted server, or enter the url of your own owns3 instance.</p>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Application api key</label>
          <input v-model="form.apiKey" type="password" placeholder="owns3_..." autocomplete="off" />
          <p class="text-xs text-gray-500 mt-1">Stored encrypted. Never shown again after connecting.</p>
        </div>
        <div class="flex space-x-3 text-sm font-medium">
          <LoadingButton
            type="submit"
            :click="connect"
            message="Connecting"
            icon="fa fa-slash fa-spin mr-1"
            class="px-3 py-2 rounded bg-green-300 hover:bg-green-400 text-gray-800">
            Connect
          </LoadingButton>
          <button v-if="status?.connected" type="button" @click="showForm = false" class="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700">
            Cancel
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
input {
  @apply w-full block px-3 py-2 rounded bg-gray-800 text-green-300 border border-gray-700;
  @apply focus:outline-none focus:border-gray-500;
}
</style>
