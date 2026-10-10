<script setup lang="ts">
/**
 * Signing another device in by QR, from the side that is already signed in.
 *
 * Three things happen here: a code is made and drawn, the scan is waited for,
 * and the user approves or refuses it. The code itself is a secret, so it is
 * drawn and never written out as text. The name the scanning device reports is
 * its own invention, shown as plain text and trusted no further.
 */
import { computed, onBeforeUnmount, ref, watch } from "vue";
import QRCode from "qrcode";
import { ArrowPathIcon, CheckIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $events } from "../../events";
import { approveQrLogin, createQrCode, denyQrLogin, getQrStatus, type QrStatus } from "../../services/sessions.service";
import { isDark } from "../../stores/theme.store";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";
import Spinner from "../ui/Spinner.vue";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void; (e: "signed-in"): void }>();

type Phase = "loading" | "waiting" | "pending" | "done" | "expired";

const phase = ref<Phase>("loading");
const qrImage = ref("");
const scanningDevice = ref("");
const secondsLeft = ref(0);

let poll: ReturnType<typeof setInterval> | undefined;
let countdown: ReturnType<typeof setInterval> | undefined;

const expiresLabel = computed(() => {
  const m = Math.floor(secondsLeft.value / 60);
  const s = secondsLeft.value % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
});

function stopTimers() {
  if (poll) clearInterval(poll);
  if (countdown) clearInterval(countdown);
  poll = undefined;
  countdown = undefined;
}

async function start() {
  stopTimers();
  phase.value = "loading";
  qrImage.value = "";
  scanningDevice.value = "";

  try {
    const { code, expiresIn } = await createQrCode();

    // Drawn, never printed: anyone who reads the code can use it once.
    qrImage.value = await QRCode.toDataURL(code, {
      margin: 1,
      width: 480,
      color: isDark.value ? { dark: "#e7eaed", light: "#00000000" } : { dark: "#15191d", light: "#00000000" }
    });

    secondsLeft.value = expiresIn;
    phase.value = "waiting";

    countdown = setInterval(() => {
      secondsLeft.value -= 1;
      if (secondsLeft.value <= 0) {
        stopTimers();
        phase.value = "expired";
      }
    }, 1000);

    // Realtime tells us the moment it is scanned; the poll is the fallback.
    poll = setInterval(check, 2500);
  } catch (e) {
    alertRequestError(e);
    phase.value = "expired";
  }
}

async function check() {
  if (phase.value !== "waiting" && phase.value !== "pending") return;
  try {
    apply(await getQrStatus());
  } catch {
    // A hiccup while polling is not worth a message; the next tick tries again.
  }
}

function apply(status: QrStatus) {
  if (status.status === "pending") {
    scanningDevice.value = status.device || "";
    phase.value = "pending";
    return;
  }
  if (status.status === "none" || status.status === "used" || status.status === "denied") {
    stopTimers();
    phase.value = "expired";
  }
}

function approve(btn: ILoadingButton) {
  return approveQrLogin()
    .then(() => {
      stopTimers();
      phase.value = "done";
      emit("signed-in");
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function deny(btn: ILoadingButton) {
  return denyQrLogin()
    .then(() => {
      stopTimers();
      phase.value = "expired";
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function onScanned() {
  check();
}
$events.on("realtime:qr-scanned", onScanned);

watch(
  () => props.open,
  (open) => (open ? start() : stopTimers()),
  { immediate: true }
);

onBeforeUnmount(() => {
  stopTimers();
  $events.off("realtime:qr-scanned", onScanned);
});
</script>

<template>
  <Dialog :open="open" size="md" title="Sign in another device" @close="emit('close')">
    <!-- Waiting to be scanned -->
    <div v-if="phase === 'loading' || phase === 'waiting'" class="flex flex-col items-center text-center">
      <div class="flex h-56 w-56 items-center justify-center rounded-lg border border-line bg-surface p-3">
        <Spinner v-if="phase === 'loading'" />
        <img v-else :src="qrImage" alt="Sign-in code" class="h-full w-full" />
      </div>
      <p class="mt-4 text-sm text-fg">Open {{ "OwnClipboard" }} on the other device and scan this.</p>
      <p class="mt-1 text-xs text-faint">
        The code lasts {{ expiresLabel }} and works once. You will be asked to approve before anything is granted.
      </p>
    </div>

    <!-- Someone scanned it -->
    <div v-else-if="phase === 'pending'" class="space-y-4">
      <div class="flex items-start gap-2.5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
        <ExclamationTriangleIcon class="mt-px h-4 w-4 shrink-0" />
        <p>
          Approve this only if you scanned the code yourself just now. Approving signs that device in to your account.
        </p>
      </div>

      <div class="rounded-md border border-line bg-sunken px-3 py-3 text-center">
        <p class="text-xs uppercase tracking-wider text-faint">Device asking to sign in</p>
        <p class="mt-1 break-words text-sm font-medium text-fg">{{ scanningDevice || "Unnamed device" }}</p>
        <p class="mt-1 text-[11px] text-faint">That name came from the device itself.</p>
      </div>
    </div>

    <!-- Approved -->
    <div v-else-if="phase === 'done'" class="flex flex-col items-center py-4 text-center">
      <span class="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <CheckIcon class="h-6 w-6" />
      </span>
      <p class="mt-3 text-sm font-medium text-fg">{{ scanningDevice || "That device" }} is signed in</p>
      <p class="mt-1 text-xs text-muted">It now shows in your list of sessions, and you can sign it out from there.</p>
    </div>

    <!-- Nothing live any more -->
    <div v-else class="flex flex-col items-center py-4 text-center">
      <p class="text-sm text-fg">This code is no longer usable.</p>
      <p class="mt-1 text-xs text-muted">Codes last two minutes and work once. Make another to try again.</p>
    </div>

    <template #footer>
      <template v-if="phase === 'pending'">
        <Button variant="ghost" :click="deny" message="Refusing">
          <XMarkIcon class="h-4 w-4" />Not me, refuse
        </Button>
        <Button variant="primary" :click="approve" message="Approving">
          <CheckIcon class="h-4 w-4" />Approve
        </Button>
      </template>
      <template v-else-if="phase === 'done'">
        <Button variant="primary" @click="emit('close')">Done</Button>
      </template>
      <template v-else>
        <Button variant="ghost" @click="emit('close')">Close</Button>
        <Button variant="primary" @click="start"><ArrowPathIcon class="h-4 w-4" />New code</Button>
      </template>
    </template>
  </Dialog>
</template>
