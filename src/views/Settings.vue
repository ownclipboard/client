<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../http";
import { $alert } from "../components/ws-alert/ws-alert";
import { connectOwns3, disconnectOwns3, getOwns3Status, type Owns3Status } from "../services/files.service";
import { setTheme, themePreference, type ThemePreference } from "../stores/theme.store";
import { useAuthUser } from "../stores/auth.store";
import { askToConfirm } from "../components/ConfirmHandler";
import PageHeader from "../components/ui/PageHeader.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Input from "../components/ui/Input.vue";
import Badge from "../components/ui/Badge.vue";
import Skeleton from "../components/ui/Skeleton.vue";

const authUser = useAuthUser();

/* ---------------- Appearance ---------------- */

const themes: { value: ThemePreference; label: string; icon: any; hint: string }[] = [
  { value: "light", label: "Light", icon: SunIcon, hint: "Always light" },
  { value: "dark", label: "Dark", icon: MoonIcon, hint: "Always dark" },
  { value: "system", label: "System", icon: ComputerDesktopIcon, hint: "Follows your device" }
];

/* ---------------- Storage (owns3) ---------------- */

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

async function disconnect(btn: ILoadingButton) {
  const ok = await askToConfirm({
    title: "Disconnect storage?",
    message: "Uploaded files stay on your owns3 server but become unavailable here until you reconnect.",
    confirmLabel: "Disconnect",
    danger: true
  });
  if (!ok) return btn.stopLoading();

  return disconnectOwns3()
    .then(() => {
      status.value = { connected: false };
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}
</script>

<template>
  <div class="max-w-3xl space-y-5">
    <PageHeader title="Settings" />

    <Card title="Appearance" description="Choose how the app looks on this device.">
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="t in themes"
          :key="t.value"
          type="button"
          :class="[
            'flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors',
            themePreference === t.value ? 'border-accent bg-accent-soft/60' : 'border-line hover:border-line-strong'
          ]"
          :aria-pressed="themePreference === t.value"
          @click="setTheme(t.value)"
        >
          <component :is="t.icon" :class="['h-4 w-4', themePreference === t.value ? 'text-accent' : 'text-faint']" />
          <span class="text-sm font-medium text-fg">{{ t.label }}</span>
          <span class="text-xs text-muted">{{ t.hint }}</span>
        </button>
      </div>
    </Card>

    <Card title="File storage" description="Files you upload go to your own owns3 server. Connect it with an application api key that can read, write and delete.">
      <template #header>
        <Badge v-if="status?.connected" variant="accent">Connected</Badge>
        <Badge v-else-if="!loading" variant="warn">Not connected</Badge>
      </template>

      <div v-if="loading" class="space-y-2">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-4 w-64" />
      </div>

      <template v-else-if="status?.connected && !showForm">
        <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt class="text-muted">Server</dt>
          <dd class="font-mono text-fg">{{ status.endpoint }}</dd>
          <template v-if="status.app">
            <dt class="text-muted">App</dt>
            <dd class="text-fg">{{ status.app.name }}</dd>
          </template>
          <template v-if="status.permissions">
            <dt class="text-muted">Permissions</dt>
            <dd class="text-fg">{{ status.permissions.join(", ") }}</dd>
          </template>
          <template v-if="status.connectedAt">
            <dt class="text-muted">Connected</dt>
            <dd class="text-fg"><TimeAgo :date="status.connectedAt" /></dd>
          </template>
        </dl>
        <div class="mt-4 flex gap-2">
          <Button size="sm" @click="showForm = true">Replace connection</Button>
          <Button size="sm" variant="danger" :click="disconnect" message="Disconnecting">Disconnect</Button>
        </div>
      </template>

      <form v-else class="space-y-4" @submit.prevent>
        <p v-if="!status?.connected" class="text-sm text-warn">No owns3 server connected. File uploads are disabled until you connect one.</p>
        <Input
          v-model="form.endpoint"
          type="url"
          label="Server url"
          :placeholder="DEFAULT_OWNS3_ENDPOINT"
          autocomplete="off"
          mono
          hint="Leave as is to use the hosted server, or enter the url of your own owns3 instance."
        />
        <Input
          v-model="form.apiKey"
          type="password"
          label="Application api key"
          placeholder="owns3_…"
          autocomplete="off"
          mono
          hint="Stored encrypted. Never shown again after connecting."
        />
        <div class="flex gap-2">
          <Button variant="primary" type="submit" :click="connect" message="Connecting">Connect</Button>
          <Button v-if="status?.connected" variant="ghost" @click="showForm = false">Cancel</Button>
        </div>
      </form>
      <p class="mt-4 text-xs text-faint">
        owns3 is open source:
        <a href="https://github.com/ownclipboard/owns3" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">github.com/ownclipboard/owns3</a>
      </p>
    </Card>

    <Card title="Account">
      <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt class="text-muted">Username</dt>
        <dd class="text-fg">{{ authUser.data?.username }}</dd>
        <template v-if="authUser.data?.email">
          <dt class="text-muted">Email</dt>
          <dd class="text-fg">{{ authUser.data.email }}</dd>
        </template>
        <dt class="text-muted">Plan</dt>
        <dd class="flex items-center gap-2 text-fg">
          <Badge :variant="authUser.data?.plan === 'pro' ? 'accent' : 'neutral'" uppercase>{{ authUser.data?.plan || "none" }}</Badge>
          <RouterLink :to="{ name: 'pricing' }" class="text-xs text-accent underline underline-offset-2">Manage plan</RouterLink>
        </dd>
      </dl>
      <template #footer>
        <Button variant="danger" size="sm" :click="authUser.signOut" message="Signing out">Sign out</Button>
      </template>
    </Card>
  </div>
</template>
