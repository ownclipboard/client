<script setup lang="ts">
/**
 * What stands in front of a locked space.
 *
 * Three things can be true at once: factors are required, some of them are not
 * set up yet, and a cooldown may be running. The screen asks for whichever
 * applies, in that order, because a factor cannot be passed before it exists.
 *
 * Only the creator can recover. A member who has lost their password or
 * authenticator needs a fresh invite, and the screen says so rather than
 * offering a door that is not there.
 */
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeftIcon, EnvelopeIcon, LockClosedIcon, ShieldCheckIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $alert } from "../ws-alert/ws-alert";
import { md5 } from "../../functions/crypto";
import {
  getSpaceLock,
  recoverSpace,
  requestSpaceRecoveryCode,
  setSpaceLockPassword,
  setSpaceTotp,
  unlockSpace,
  type SpaceLockState
} from "../../services/spaces.service";
import { useAuthUser } from "../../stores/auth.store";
import Button from "../ui/Button.vue";
import Input from "../ui/Input.vue";
import Badge from "../ui/Badge.vue";

const props = defineProps<{ spaceId: string; spaceName?: string; lock: SpaceLockState }>();
const emit = defineEmits<{ (e: "unlocked"): void }>();

const $router = useRouter();
const authUser = useAuthUser();

const state = ref<SpaceLockState>(props.lock);

const needsPassword = computed(() => state.value.required.includes("password"));
const needsCode = computed(() => state.value.required.includes("totp"));
const setupNeeded = computed(() => state.value.setupRequired);

/** A cooldown from wrong tries, counted down so the wait is visible. */
const now = ref(Date.now());
const tick = setInterval(() => (now.value = Date.now()), 1000);
onBeforeUnmount(() => clearInterval(tick));

const cooldownLeft = computed(() => {
  if (!state.value.retryAt) return 0;
  return Math.max(0, Math.ceil((new Date(state.value.retryAt).getTime() - now.value) / 1000));
});

const form = ref({ password: "", code: "" });
const mode = ref<"unlock" | "setup" | "recover">(setupNeeded.value.length ? "setup" : "unlock");

async function refresh() {
  state.value = await getSpaceLock(props.spaceId);
  mode.value = state.value.setupRequired.length ? "setup" : "unlock";
  form.value = { password: "", code: "" };
}

/* ---------------- Unlocking ---------------- */

function unlock(btn: ILoadingButton) {
  if (needsPassword.value && !form.value.password) {
    $alert.warning("Enter your password for this space.");
    return btn.stopLoading();
  }
  if (needsCode.value && form.value.code.trim().length !== 6) {
    $alert.warning("Enter the six digit code from your authenticator.");
    return btn.stopLoading();
  }

  return unlockSpace(props.spaceId, {
    password: needsPassword.value ? md5(form.value.password) : undefined,
    code: needsCode.value ? form.value.code.trim() : undefined
  })
    .then(() => emit("unlocked"))
    .catch(async (e) => {
      alertRequestError(e);
      // A wrong try may have started a cooldown, which only the server knows.
      await refresh().catch(() => undefined);
    })
    .finally(btn.stopLoading);
}

/* ---------------- Setting a missing factor up ---------------- */

const setupPassword = ref({ next: "", confirm: "" });
const setupCode = ref("");

const missingPassword = computed(() => setupNeeded.value.includes("password"));
const missingTotp = computed(() => setupNeeded.value.includes("totp"));

function createPassword(btn: ILoadingButton) {
  const { next, confirm } = setupPassword.value;
  if (next.length < 6) {
    $alert.warning("Use at least 6 characters.");
    return btn.stopLoading();
  }
  if (next !== confirm) {
    $alert.warning("The two passwords don't match.");
    return btn.stopLoading();
  }

  return setSpaceLockPassword(props.spaceId, md5(next))
    .then(async () => {
      setupPassword.value = { next: "", confirm: "" };
      await refresh();
      await nextTick();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function turnOnTotp(btn: ILoadingButton) {
  if (setupCode.value.trim().length !== 6) {
    $alert.warning("Enter the six digit code from your authenticator.");
    return btn.stopLoading();
  }

  return setSpaceTotp(props.spaceId, true, setupCode.value.trim())
    .then(async () => {
      setupCode.value = "";
      await refresh();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/* ---------------- Recovery, creator only ---------------- */

const recover = ref({ code: "", password: "" });
const codeSent = ref(false);

function sendRecoveryCode(btn: ILoadingButton) {
  return requestSpaceRecoveryCode(props.spaceId)
    .then(() => (codeSent.value = true))
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function submitRecovery(btn: ILoadingButton) {
  if (recover.value.code.trim().length !== 6 || !recover.value.password) {
    $alert.warning("The emailed code and your account password are both needed.");
    return btn.stopLoading();
  }

  return recoverSpace(props.spaceId, recover.value.code.trim(), recover.value.password)
    .then(() => emit("unlocked"))
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}
</script>

<template>
  <div class="mx-auto max-w-md py-10">
    <div class="rounded-lg border border-line bg-surface p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn">
          <LockClosedIcon class="h-5 w-5" />
        </span>
        <div class="min-w-0">
          <h1 class="truncate text-[15px] font-semibold text-fg">{{ spaceName || "This space" }} is locked</h1>
          <p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <Badge v-if="needsPassword" variant="neutral">Password</Badge>
            <Badge v-if="needsCode" variant="neutral">Authenticator</Badge>
            <span>· unlocks for {{ state.unlockMinutes }} minutes of use</span>
          </p>
        </div>
      </div>

      <!-- Something required is not set up yet -->
      <div v-if="mode === 'setup'" class="mt-6 space-y-5">
        <form v-if="missingPassword" class="space-y-3" @submit.prevent>
          <p class="text-[13px] font-medium text-fg">Set a password for this space</p>
          <p class="text-xs text-muted">
            This space requires one. It is yours alone, not your account password, and nobody else ever sees it.
          </p>
          <Input v-model="setupPassword.next" type="password" label="Password" autocomplete="new-password" hint="At least 6 characters." />
          <Input v-model="setupPassword.confirm" type="password" label="Confirm password" autocomplete="new-password" />
          <Button variant="primary" type="submit" :click="createPassword" message="Saving">Set password</Button>
        </form>

        <form v-else-if="missingTotp" class="space-y-3" @submit.prevent>
          <p class="text-[13px] font-medium text-fg">Turn on your authenticator</p>
          <template v-if="authUser.hasAuthenticator">
            <p class="text-xs text-muted">This space requires a code from your authenticator app.</p>
            <Input
              v-model="setupCode"
              label="Code from the app"
              placeholder="123456"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              mono
              class="w-40"
            />
            <Button variant="primary" type="submit" :click="turnOnTotp" message="Turning on">Turn it on</Button>
          </template>
          <template v-else>
            <p class="text-xs text-muted">
              This space requires a code, and you have no authenticator yet. Set one up on your account, then come
              back here.
            </p>
            <Button variant="primary" size="sm" :to="{ name: 'settings', query: { tab: 'account' } }">
              <ShieldCheckIcon class="h-4 w-4" />Set up an authenticator
            </Button>
          </template>
        </form>
      </div>

      <!-- Recovery, for the creator only -->
      <div v-else-if="mode === 'recover'" class="mt-6 space-y-4">
        <p class="text-sm text-muted">
          A code goes to the email on your account. That code with your account password clears what you set on this
          space, so you can set it up again.
        </p>

        <Button v-if="!codeSent" variant="primary" :click="sendRecoveryCode" message="Sending">
          <EnvelopeIcon class="h-4 w-4" />Email me a code
        </Button>

        <form v-else class="space-y-3" @submit.prevent>
          <Input
            v-model="recover.code"
            label="Code from the email"
            placeholder="123456"
            inputmode="numeric"
            maxlength="6"
            mono
            class="w-40"
          />
          <Input v-model="recover.password" type="password" label="Account password" autocomplete="current-password" />
          <Button variant="primary" type="submit" :click="submitRecovery" message="Recovering">Recover this space</Button>
        </form>

        <button type="button" class="text-sm text-accent underline underline-offset-4" @click="mode = 'unlock'">
          Back
        </button>
      </div>

      <!-- Ordinary unlock -->
      <form v-else class="mt-6 space-y-4" @submit.prevent>
        <Input
          v-if="needsPassword"
          v-model="form.password"
          type="password"
          label="Your password for this space"
          autocomplete="current-password"
        />
        <Input
          v-if="needsCode"
          v-model="form.code"
          label="Code from your authenticator"
          placeholder="123456"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          mono
          class="w-40"
        />

        <p v-if="cooldownLeft" class="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
          Too many wrong tries. Try again in {{ cooldownLeft }}s.
        </p>

        <Button variant="primary" block type="submit" :click="unlock" message="Unlocking" :disabled="!!cooldownLeft">
          Unlock
        </Button>
      </form>

      <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs">
        <button
          v-if="mode !== 'recover'"
          type="button"
          class="text-accent underline underline-offset-4"
          @click="mode = 'recover'"
        >
          Locked out of a space you created?
        </button>
        <button class="ml-auto inline-flex items-center gap-1 text-muted hover:text-fg" @click="$router.push({ name: 'spaces' })">
          <ArrowLeftIcon class="h-3.5 w-3.5" />All spaces
        </button>
      </div>

      <p class="mt-3 text-[11px] leading-relaxed text-faint">
        If you are a member and have lost your password or authenticator, ask the owner for a new invite. Only the
        person who created a space can recover it.
      </p>
    </div>
  </div>
</template>
