<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import AppShell from "../layouts/AppShell.vue";
import PasswordPrompt from "../components/PasswordPrompt.vue";
import FolderPicker from "../components/FolderPicker.vue";
import StorageCorsModal from "../components/StorageCorsModal.vue";
import ClipPreviewModal from "../components/ClipPreviewModal.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import FolderSettingsDialog from "../components/folders/FolderSettingsDialog.vue";
import Spinner from "../components/ui/Spinner.vue";
import Button from "../components/ui/Button.vue";
import Brand from "../components/shell/Brand.vue";
import { useAuthUser } from "../stores/auth.store";
import { refreshAuthData } from "../services/auth.service";
import { getFolders } from "../stores/tabs.store";
import { loadSpaces } from "../stores/spaces.store";
import { startRealtime, stopRealtime } from "../services/realtime.service";
import { isDev } from "../config";

const authUser = useAuthUser();

/**
 * `waiting` the ping is in flight, `slow` it has been in flight long enough to
 * need saying so, `unreachable` it failed without an answer. A dead session is
 * not a state here: that redirects to the sign-in page instead.
 */
const state = ref<"waiting" | "slow" | "unreachable">("waiting");
let slowTimer: ReturnType<typeof setTimeout> | undefined;

async function boot() {
  state.value = "waiting";
  // A request with no timeout can stay pending for minutes, so the screen stops
  // claiming to be signing anyone in long before the browser gives up.
  slowTimer = setTimeout(() => {
    if (!authUser.isLogged) state.value = "slow";
  }, 12_000);

  const result = await refreshAuthData(authUser);
  clearTimeout(slowTimer);

  // `signed-out` is already loading the sign-in page; nothing to render for it.
  if (result === "signed-out") return;
  if (result === "unreachable") return (state.value = "unreachable");

  getFolders();
  // The sidebar lists spaces and any invite waiting, so both load with the shell.
  loadSpaces().catch(() => undefined);
  // Live updates are an enhancement: a failure here leaves the app as it was.
  startRealtime(authUser.realtime).catch(() => undefined);
}

/**
 * A session can end while a tab is open: the token expires, or signing in
 * elsewhere replaces it. `ping` is the only thing that knows, so it is asked
 * every couple of minutes and `refreshAuthData` sends the browser to the
 * sign-in page the moment it answers that the session is gone. The interval is
 * kept wide because each ping costs database reads on the server.
 */
const SESSION_POLL = 120_000;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let polling = false;

async function checkSession() {
  // A hidden tab is not worth a request, and a failed one must not sign anyone
  // out: only a definite answer from the api does that, inside refreshAuthData.
  if (polling || document.hidden || !authUser.isLogged) return;
  polling = true;
  try {
    await refreshAuthData(authUser);
  } finally {
    polling = false;
  }
}

// Coming back to a tab that sat in the background is exactly when the session
// is most likely to have ended, so it is checked then rather than waiting out
// the interval.
function onVisibility() {
  if (!document.hidden) checkSession();
}

onMounted(() => {
  boot();
  pollTimer = setInterval(checkSession, SESSION_POLL);
  document.addEventListener("visibilitychange", onVisibility);
});

onBeforeUnmount(() => {
  clearTimeout(slowTimer);
  clearInterval(pollTimer);
  document.removeEventListener("visibilitychange", onVisibility);
  stopRealtime();
});
</script>

<template>
  <div v-if="!authUser.isLogged" class="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-muted">
    <Brand />

    <div v-if="state === 'waiting'" class="flex items-center gap-2 text-sm"><Spinner size="sm" /> Signing you in</div>

    <template v-else>
      <div class="max-w-sm text-center text-sm">
        <p v-if="state === 'slow'" class="flex items-center justify-center gap-2"><Spinner size="sm" /> The server is taking a while to answer.</p>
        <p v-else>Couldn't reach the server, so we can't tell whether you are still signed in.</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="primary" size="sm" @click="boot">Try again</Button>
        <Button variant="ghost" size="sm" @click="authUser.clearSession()">Sign in again</Button>
      </div>
    </template>
  </div>

  <AppShell v-else>
    <template #banner>
      <div
        v-if="!authUser.data!.plan && $route.name !== 'pricing'"
        class="flex items-center justify-center gap-3 border-b border-warn/30 bg-warn-soft px-4 py-2 text-center text-sm text-warn"
      >
        <span>You haven't chosen a plan yet.</span>
        <RouterLink :to="{ name: 'pricing' }" class="font-medium underline underline-offset-4">Choose a plan</RouterLink>
      </div>
    </template>

    <router-view />

    <PasswordPrompt />
    <FolderPicker />
    <FolderSettingsDialog />
    <StorageCorsModal />
    <ClipPreviewModal />
    <ConfirmDialog />
    <DebugDock v-if="isDev" />
  </AppShell>
</template>
