<script setup lang="ts">
/**
 * Where the account is signed in. The device name and the browser string are
 * whatever a client called itself, so they are rendered as plain text and
 * believed no further than that.
 */
import { computed, onMounted, ref } from "vue";
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
  TrashIcon
} from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { askToConfirm } from "../ConfirmHandler";
import { getSessions, revokeOtherSessions, revokeSession, type SessionInfo } from "../../services/sessions.service";
import { useAuthUser } from "../../stores/auth.store";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import IconButton from "../ui/IconButton.vue";
import Skeleton from "../ui/Skeleton.vue";

const authUser = useAuthUser();

const sessions = ref<SessionInfo[]>([]);
// False for a token from before sessions existed: it works, but is not listed.
const currentListed = ref(true);
const loading = ref(true);
const working = ref("");

const others = computed(() => sessions.value.filter((s) => !s.current).length);

async function load() {
  loading.value = true;
  try {
    const res = await getSessions();
    sessions.value = res.sessions;
    currentListed.value = res.currentListed;
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

/** Two letter code to its flag, which is just those letters as regional indicators. */
function flagOf(code: string) {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function iconFor(session: SessionInfo) {
  const text = `${session.deviceName || ""} ${session.userAgent || ""}`;
  return /iphone|ipad|android|mobile/i.test(text) ? DevicePhoneMobileIcon : ComputerDesktopIcon;
}

async function revoke(session: SessionInfo) {
  const ok = await askToConfirm({
    title: session.current ? "Sign out this device?" : `Sign out ${session.deviceName || "this device"}?`,
    message: session.current
      ? "You will have to sign in again here."
      : "That device has to sign in again. Anything it saved stays.",
    confirmLabel: "Sign out",
    danger: true
  });
  if (!ok) return;

  working.value = session.publicId;
  try {
    const res = await revokeSession(session.publicId);
    if (res.current) return authUser.clearSession();
    await load();
  } catch (e) {
    alertRequestError(e);
  } finally {
    working.value = "";
  }
}

async function revokeOthers(btn: ILoadingButton) {
  const ok = await askToConfirm({
    title: "Sign out every other device?",
    message: "This device stays signed in. Every other one has to sign in again.",
    confirmLabel: "Sign out others",
    danger: true
  });
  if (!ok) return btn.stopLoading();

  return revokeOtherSessions()
    .then(load)
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

defineExpose({ reload: load });
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="i in 2" :key="i" class="h-14" />
    </div>

    <template v-else>
      <p v-if="!currentListed" class="rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
        This browser signed in before sessions were recorded, so it is not in the list below. It still works. To be rid
        of it, sign out everywhere.
      </p>

      <ul class="divide-y divide-line rounded-md border border-line">
        <li
          v-for="session in sessions"
          :key="session.publicId"
          :class="['flex items-start gap-3 px-3 py-3', working === session.publicId ? 'opacity-50' : '']"
        >
          <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-raised text-muted">
            <component :is="iconFor(session)" class="h-4 w-4" />
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="truncate text-sm font-medium text-fg">{{ session.deviceName || "Unnamed device" }}</span>
              <Badge v-if="session.current" variant="accent">This device</Badge>
              <Badge v-if="session.method === 'qr'" variant="neutral">
                <QrCodeIcon class="h-3 w-3" />Signed in by QR
              </Badge>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted">{{ session.userAgent || "Unknown browser" }}</p>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-faint">
              <span v-if="session.country">
                <span aria-hidden="true">{{ flagOf(session.country.code) }}</span> {{ session.country.name }} ·
              </span>
              <span>Last used <TimeAgo :date="session.lastUsedAt" /></span>
              <span>· signed in <TimeAgo :date="session.createdAt" /></span>
            </p>
          </div>

          <IconButton
            size="sm"
            variant="danger"
            :label="session.current ? 'Sign out this device' : 'Sign out this device'"
            @click="revoke(session)"
          >
            <TrashIcon />
          </IconButton>
        </li>
      </ul>

      <p class="text-xs text-faint">Last used is accurate to about five minutes.</p>

      <div class="flex flex-wrap gap-2">
        <Button size="sm" :click="revokeOthers" message="Signing out" :disabled="!others">
          Sign out other devices<span v-if="others"> ({{ others }})</span>
        </Button>
        <Button size="sm" variant="danger" :click="authUser.signOutEverywhere" message="Signing out">
          Sign out everywhere
        </Button>
      </div>
    </template>
  </div>
</template>
