<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CloudIcon, ComputerDesktopIcon, MoonIcon, ServerStackIcon, SunIcon, SwatchIcon, UserCircleIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../http";
import { $alert } from "../components/ws-alert/ws-alert";
import { connectOwns3, disconnectOwns3, getOwns3Status, useDefaultOwns3, type Owns3Status } from "../services/files.service";
import { changePassword, refreshAuthData, setAccountEmail } from "../services/auth.service";
import { computed } from "vue";
import { setTheme, themePreference, type ThemePreference } from "../stores/theme.store";
import { useAuthUser } from "../stores/auth.store";
import { askToConfirm } from "../components/ConfirmHandler";
import PageHeader from "../components/ui/PageHeader.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Input from "../components/ui/Input.vue";
import Badge from "../components/ui/Badge.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import StorageSetupGuide from "../components/storage/StorageSetupGuide.vue";
import Tabs, { type TabItem } from "../components/ui/Tabs.vue";

const authUser = useAuthUser();
const $route = useRoute();
const $router = useRouter();

/* ---------------- Sections ---------------- */

const TABS: TabItem[] = [
  { key: "appearance", label: "Appearance", icon: SwatchIcon },
  { key: "storage", label: "Storage", icon: ServerStackIcon },
  { key: "account", label: "Account", icon: UserCircleIcon }
];

// The tab lives in the url, so "?tab=storage" can be linked to from elsewhere.
const tab = computed({
  get: () => (TABS.some((t) => t.key === $route.query.tab) ? String($route.query.tab) : TABS[0].key),
  set: (key: string) => $router.replace({ name: "settings", query: key === TABS[0].key ? {} : { tab: key } })
});

/* ---------------- Appearance ---------------- */

const themes: { value: ThemePreference; label: string; icon: any; hint: string }[] = [
  { value: "light", label: "Light", icon: SunIcon, hint: "Always light" },
  { value: "dark", label: "Dark", icon: MoonIcon, hint: "Always dark" },
  { value: "system", label: "System", icon: ComputerDesktopIcon, hint: "Follows your device" }
];

/* ---------------- Storage (owns3) ---------------- */

const status = ref<Owns3Status | null>(null);
const loading = ref(true);
// Which option the user is setting up: the hosted storage (Pro) or their own owns3 server.
const showForm = ref<"own" | null>(null);
const isPro = computed(() => authUser.data?.plan === "pro");

const form = reactive({ endpoint: "", apiKey: "" });
const guideOpen = ref(false);

/**
 * Keep the summary `ping` gave us in step with what this page just did, so the
 * upload button reacts without waiting for a reload.
 */
function setStatus(next: Owns3Status) {
  status.value = next;
  authUser.storage = {
    connected: next.connected,
    default: next.default,
    defaultAvailable: next.defaultAvailable,
    proRequired: next.proRequired
  };
}

async function loadStatus() {
  try {
    setStatus(await getOwns3Status());
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
      setStatus(res);
      form.apiKey = "";
      form.endpoint = "";
      showForm.value = null;
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

async function useHosted(btn: ILoadingButton) {
  try {
    setStatus(await useDefaultOwns3());
    showForm.value = null;
  } catch (e: any) {
    alertRequestError(e);
    // 403: the plan changed server side, sync it so the page reflects that.
    if (e?.response?.status === 403) await refreshAuthData(authUser);
  } finally {
    btn.stopLoading();
  }
}

/* ---------------- Account email & password ---------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailForm = reactive({ email: "", password: "" });
const passwordForm = reactive({ current: "", next: "", confirm: "" });

function saveEmail(btn: ILoadingButton) {
  const email = emailForm.email.trim();

  if (!EMAIL_RE.test(email)) {
    $alert.warning("That doesn't look like an email address.");
    return btn.stopLoading();
  }
  if (!emailForm.password) {
    $alert.warning("Enter your account password to confirm the change.");
    return btn.stopLoading();
  }

  return setAccountEmail(email, emailForm.password)
    .then((res) => {
      if (authUser.data) authUser.data.email = res.email;
      emailForm.email = "";
      emailForm.password = "";
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function savePassword(btn: ILoadingButton) {
  const { current, next, confirm } = passwordForm;

  if (!current) {
    $alert.warning("Enter your current password.");
    return btn.stopLoading();
  }
  if (next.length < 6) {
    $alert.warning("The new password needs at least 6 characters.");
    return btn.stopLoading();
  }
  if (next !== confirm) {
    $alert.warning("The new passwords don't match.");
    return btn.stopLoading();
  }

  return changePassword(current, next)
    .then(() => {
      passwordForm.current = "";
      passwordForm.next = "";
      passwordForm.confirm = "";
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
    .then(() => loadStatus())
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}
</script>

<template>
  <div class="max-w-3xl space-y-5">
    <PageHeader title="Settings" />

    <Tabs v-model="tab" :tabs="TABS" label="Settings sections" />

    <Card v-show="tab === 'appearance'" title="Appearance" description="Choose how the app looks on this device.">
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

    <Card v-show="tab === 'storage'" title="File storage" description="Where uploaded files are kept. We host them for you (Pro), or connect your own owns3 server.">
      <template #header>
        <Badge v-if="status?.connected" variant="accent">Connected</Badge>
        <Badge v-else-if="status?.proRequired" variant="warn">Pro required</Badge>
        <Badge v-else-if="!loading" variant="neutral">Not connected</Badge>
      </template>

      <div v-if="loading" class="space-y-2">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-4 w-64" />
      </div>

      <template v-else>
        <!-- Pro subscription lapsed while on the hosted storage -->
        <div v-if="status?.proRequired" class="mb-4 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
          Your files are on our storage, which needs an active Pro plan. Uploads are paused until you
          <RouterLink :to="{ name: 'pricing' }" class="font-medium underline underline-offset-2">renew Pro</RouterLink>
          or connect your own server below.
        </div>

        <!-- Current connection -->
        <template v-if="status?.connected && !showForm">
          <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt class="text-muted">Storage</dt>
            <dd class="flex items-center gap-2 text-fg">
              <template v-if="status.default"><CloudIcon class="h-4 w-4 text-accent" /> Hosted by us</template>
              <template v-else><ServerStackIcon class="h-4 w-4 text-faint" /> Your own owns3 server</template>
            </dd>
            <template v-if="!status.default && status.endpoint">
              <dt class="text-muted">Server</dt>
              <dd class="font-mono text-fg">{{ status.endpoint }}</dd>
            </template>
            <template v-if="!status.default && status.app">
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
          <div class="mt-4 flex flex-wrap gap-2">
            <Button size="sm" @click="showForm = 'own'">{{ status.default ? "Use my own server" : "Replace connection" }}</Button>
            <Button size="sm" variant="danger" :click="disconnect" message="Disconnecting">Disconnect</Button>
          </div>
        </template>

        <!-- Choose a storage -->
        <template v-else>
          <div v-if="!showForm" class="grid gap-3 sm:grid-cols-2">
            <div
              v-if="status?.defaultAvailable"
              class="flex flex-col rounded-md border border-line p-4"
            >
              <div class="flex items-center gap-2 text-sm font-medium text-fg">
                <CloudIcon class="h-4 w-4 text-accent" /> We host your files
                <Badge variant="accent" uppercase class="ml-auto">Pro</Badge>
              </div>
              <p class="mt-1 flex-1 text-sm text-muted">Nothing to set up, nothing to pay for elsewhere. Your files are kept on storage we run, under your own prefix.</p>
              <Button v-if="isPro" class="mt-4" variant="primary" size="sm" :click="useHosted" message="Connecting">Host my files</Button>
              <Button v-else class="mt-4" size="sm" :to="{ name: 'pricing' }">Upgrade to Pro</Button>
            </div>
            <div class="flex flex-col rounded-md border border-line p-4">
              <div class="flex items-center gap-2 text-sm font-medium text-fg">
                <ServerStackIcon class="h-4 w-4 text-faint" /> Your own owns3 server
              </div>
              <p class="mt-1 flex-1 text-sm text-muted">
                Run owns3 on your own infrastructure, or on ours, and connect it with an application api key.
              </p>
              <div class="mt-4 flex flex-wrap items-center gap-3">
                <Button size="sm" :variant="status?.defaultAvailable ? 'secondary' : 'primary'" @click="showForm = 'own'">Connect my server</Button>
                <button type="button" class="text-[13px] font-medium text-accent underline underline-offset-2" @click="guideOpen = true">
                  Show me how
                </button>
              </div>
            </div>
          </div>

          <form v-else class="space-y-4" @submit.prevent>
            <Input
              v-model="form.endpoint"
              type="url"
              label="Server url"
              placeholder="https://owns3.example.com"
              autocomplete="off"
              mono
              hint="The address of your owns3 instance."
            />
            <Input
              v-model="form.apiKey"
              type="password"
              label="Application api key"
              placeholder="owns3_…"
              autocomplete="off"
              mono
              hint="The key needs read, write and delete permissions. We store it encrypted and never show it again."
            />
            <div class="flex flex-wrap items-center gap-2">
              <Button variant="primary" type="submit" :click="connect" message="Connecting">Connect</Button>
              <Button variant="ghost" @click="showForm = null">Cancel</Button>
              <button type="button" class="ml-auto text-[13px] font-medium text-accent underline underline-offset-2" @click="guideOpen = true">
                Where do I get these?
              </button>
            </div>
          </form>
        </template>
      </template>

      <p class="mt-4 text-xs text-faint">
        owns3 is open source:
        <a href="https://github.com/ownclipboard/owns3" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">github.com/ownclipboard/owns3</a>.
        No server of your own? Use <a href="https://s3.ownclipboard.com" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">s3.ownclipboard.com</a>
        with your own bucket, or <button type="button" class="text-accent underline underline-offset-2" @click="guideOpen = true">read the setup guide</button>.
      </p>
    </Card>

    <StorageSetupGuide :open="guideOpen" @close="guideOpen = false" />

    <div v-show="tab === 'account'" class="space-y-5">
    <Card title="Account">
      <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt class="text-muted">Username</dt>
        <dd class="text-fg">{{ authUser.data?.username }}</dd>
        <dt class="text-muted">Email</dt>
        <dd :class="authUser.data?.email ? 'text-fg' : 'text-faint'">{{ authUser.data?.email || "Not set" }}</dd>
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

    <Card
      title="Email address"
      description="Used to reset your password if you forget it. We don't email you for anything else."
    >
      <div
        v-if="!authUser.data?.email"
        class="mb-4 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn"
      >
        Without an email address you can't reset your password if you forget it.
      </div>

      <form class="space-y-4" @submit.prevent>
        <Input
          v-model="emailForm.email"
          type="email"
          label="Email address"
          :placeholder="authUser.data?.email || 'you@example.com'"
          autocomplete="email"
        />
        <Input
          v-model="emailForm.password"
          type="password"
          label="Account password"
          placeholder="Your current password"
          autocomplete="current-password"
          hint="Confirms it's you, since this address can reset your password."
        />
        <Button variant="primary" type="submit" :click="saveEmail" message="Saving">
          {{ authUser.data?.email ? "Change email" : "Add email" }}
        </Button>
      </form>
    </Card>

    <Card title="Password" description="Changing your password signs you out everywhere else, including other tabs in this browser. This tab stays signed in.">
      <form class="space-y-4" @submit.prevent>
        <Input v-model="passwordForm.current" type="password" label="Current password" autocomplete="current-password" />
        <Input
          v-model="passwordForm.next"
          type="password"
          label="New password"
          autocomplete="new-password"
          hint="At least 6 characters."
        />
        <Input v-model="passwordForm.confirm" type="password" label="Confirm new password" autocomplete="new-password" />
        <Button variant="primary" type="submit" :click="savePassword" message="Updating">Change password</Button>
      </form>
    </Card>
    </div>
  </div>
</template>
