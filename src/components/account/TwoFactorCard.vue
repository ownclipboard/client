<script setup lang="ts">
/**
 * Enrolling an authenticator. One enrolment covers the account and every space
 * that asks for a code, and enrolment hands out a single recovery code, which
 * is shown once and switches two factor off when it is spent.
 */
import { computed, ref } from "vue";
import QRCode from "qrcode";
import { useClipboard } from "@vueuse/core";
import {
  CheckIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $alert } from "../ws-alert/ws-alert";
import { askToConfirm } from "../ConfirmHandler";
import {
  disableTwoFactor,
  enableTwoFactor,
  recoverTwoFactor,
  replaceRecoveryCode,
  setTwoFactorOnLogin,
  setupTwoFactor
} from "../../services/auth.service";
import { isDark } from "../../stores/theme.store";
import Card from "../ui/Card.vue";
import Button from "../ui/Button.vue";
import Input from "../ui/Input.vue";
import Badge from "../ui/Badge.vue";
import IconButton from "../ui/IconButton.vue";

import { useAuthUser } from "../../stores/auth.store";

const authUser = useAuthUser();
/** Reported by ping, and kept in step here so the card reacts without a reload. */
const enrolled = computed(() => authUser.hasAuthenticator);
const onLogin = computed(() => !!authUser.twoFactor?.onLogin);

function setEnrolled(on: boolean) {
  // The server reports onLogin false whenever no authenticator is enrolled.
  authUser.twoFactor = { enabled: on, onLogin: on ? onLogin.value : false };
}

type Step = "idle" | "enrolling" | "recovery" | "replacing" | "recovering" | "removing";

const step = ref<Step>("idle");
const qrImage = ref("");
const secret = ref("");
const code = ref("");
const password = ref("");
/** Handed out by the server, to show once. Separate from the one a user types. */
const recoveryCode = ref("");
const recoveryEntry = ref("");

const { copy, copied } = useClipboard({ copiedDuring: 2000 });

const canConfirm = computed(() => code.value.trim().length === 6);
const canRemove = computed(() => !!password.value && code.value.trim().length === 6);
const canRecover = computed(() => !!password.value && !!recoveryEntry.value.trim());

function clearInputs() {
  qrImage.value = "";
  secret.value = "";
  code.value = "";
  password.value = "";
  recoveryEntry.value = "";
}

function reset() {
  clearInputs();
  recoveryCode.value = "";
  step.value = "idle";
}

/**
 * The card parks on the new code until the user says they have it. There is no
 * second chance to read it: asking the server again issues a different one.
 */
function showRecoveryCode(issued: string) {
  clearInputs();
  recoveryCode.value = issued;
  step.value = "recovery";
}

function begin(btn: ILoadingButton) {
  return setupTwoFactor()
    .then(async (res) => {
      secret.value = res.secret;
      qrImage.value = await QRCode.toDataURL(res.uri, {
        margin: 1,
        width: 420,
        color: isDark.value ? { dark: "#e7eaed", light: "#00000000" } : { dark: "#15191d", light: "#00000000" }
      });
      code.value = "";
      step.value = "enrolling";
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function confirm(btn: ILoadingButton) {
  if (!canConfirm.value) {
    $alert.warning("Enter the six digit code from your authenticator.");
    return btn.stopLoading();
  }

  return enableTwoFactor(code.value.trim())
    .then((res) => {
      setEnrolled(true);
      showRecoveryCode(res.recoveryCode);
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function replace(btn: ILoadingButton) {
  if (!canRemove.value) {
    $alert.warning("Enter your password and a code from your authenticator.");
    return btn.stopLoading();
  }

  return replaceRecoveryCode(password.value, code.value.trim())
    .then((res) => showRecoveryCode(res.recoveryCode))
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/**
 * Spending the recovery code switches two factor off rather than unlocking
 * anything, so this leaves the account with no authenticator at all.
 */
function recover(btn: ILoadingButton) {
  if (!canRecover.value) {
    $alert.warning("Enter your password and your recovery code.");
    return btn.stopLoading();
  }

  return recoverTwoFactor(password.value, recoveryEntry.value.trim())
    .then(() => {
      reset();
      setEnrolled(false);
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/**
 * Enrolling covers spaces only. Signing in keeps working on the password alone
 * until this is switched on, and the switch needs a live code either way.
 */
const loginCode = ref("");

async function toggleOnLogin(btn: ILoadingButton) {
  const entered = loginCode.value.trim();
  if (entered.length !== 6) {
    $alert.warning("Enter the six digit code from your authenticator.");
    return btn.stopLoading();
  }

  if (!onLogin.value) {
    const ok = await askToConfirm({
      title: "Require a code to sign in?",
      message:
        "Lose your authenticator after this and your recovery code is the only way back in. Check you still have it.",
      confirmLabel: "Require a code",
      danger: true
    });
    if (!ok) return btn.stopLoading();
  }

  return setTwoFactorOnLogin(!onLogin.value, entered)
    .then((res) => {
      loginCode.value = "";
      authUser.twoFactor = { enabled: true, onLogin: res.onLogin };
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function remove(btn: ILoadingButton) {
  if (!canRemove.value) {
    $alert.warning("Enter your password and a code from your authenticator.");
    return btn.stopLoading();
  }

  return disableTwoFactor(password.value, code.value.trim())
    .then(() => {
      reset();
      setEnrolled(false);
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}
</script>

<template>
  <Card title="Authenticator" description="Unlock spaces with a code, and sign in with one if you want.">
    <template #header>
      <Badge v-if="enrolled" variant="accent">On</Badge>
      <Badge v-else variant="neutral">Off</Badge>
    </template>

    <!-- Nothing in progress -->
    <div v-if="step === 'idle'" class="space-y-4">
      <p v-if="!enrolled" class="text-sm text-muted">
        Works with Google Authenticator, 1Password, or any app that takes an
        <span class="font-mono text-[13px] text-fg">otpauth</span> link.
      </p>

      <Button v-if="!enrolled" variant="primary" :click="begin" message="Preparing">
        <ShieldCheckIcon class="h-4 w-4" />Set up an authenticator
      </Button>

      <template v-else>
        <form class="space-y-3 rounded-md border border-line p-3" @submit.prevent>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-[13px] font-medium text-fg">Ask for a code when signing in</p>
            <Badge :variant="onLogin ? 'accent' : 'neutral'">{{ onLogin ? "On" : "Off" }}</Badge>
          </div>
          <Input
            v-model="loginCode"
            label="Authenticator code"
            placeholder="123456"
            inputmode="numeric"
            maxlength="6"
            autocomplete="one-time-code"
            mono
            class="w-40"
          />
          <Button size="sm" :variant="onLogin ? 'danger' : 'primary'" type="submit" :click="toggleOnLogin" message="Saving">
            {{ onLogin ? "Stop asking at sign in" : "Require a code at sign in" }}
          </Button>
        </form>

        <div class="flex flex-wrap gap-2">
          <Button size="sm" @click="step = 'replacing'">New recovery code</Button>
          <Button variant="danger" size="sm" @click="step = 'removing'">Remove authenticator</Button>
        </div>

        <p class="text-xs text-faint">
          Lost your authenticator?
          <button type="button" class="font-medium text-accent underline underline-offset-2" @click="step = 'recovering'">
            Use your recovery code
          </button>
          to switch two-factor off.
        </p>
      </template>
    </div>

    <!-- Enrolling -->
    <div v-else-if="step === 'enrolling'" class="space-y-4">
      <div class="flex items-start gap-2.5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
        <ExclamationTriangleIcon class="mt-px h-4 w-4 shrink-0" />
        <p>
          You get one recovery code at the end. It is shown once, and it is the only way back if the authenticator is
          lost.
        </p>
      </div>

      <div class="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <img :src="qrImage" alt="Authenticator setup code" class="h-40 w-40 shrink-0 rounded-md border border-line bg-surface p-2" />
        <div class="min-w-0 flex-1 space-y-3">
          <p class="text-sm text-muted">Scan this with your authenticator app, or enter the key by hand.</p>
          <Input :model-value="secret" label="Setup key" readonly mono size="sm">
            <template #trailing>
              <IconButton
                size="sm"
                :label="copied ? 'Copied' : 'Copy key'"
                :variant="copied ? 'primary' : 'ghost'"
                @click="copy(secret)"
              >
                <CheckIcon v-if="copied" />
                <ClipboardDocumentIcon v-else />
              </IconButton>
            </template>
          </Input>
        </div>
      </div>

      <form class="flex flex-wrap items-end gap-2" @submit.prevent>
        <Input
          v-model="code"
          label="Authenticator code"
          placeholder="123456"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          mono
          class="w-40"
        />
        <Button variant="primary" type="submit" :click="confirm" message="Confirming" :disabled="!canConfirm">
          Turn it on
        </Button>
        <Button variant="ghost" @click="reset">Cancel</Button>
      </form>
    </div>

    <!-- The one recovery code, on its way past -->
    <div v-else-if="step === 'recovery'" class="space-y-4">
      <div class="flex items-start gap-2.5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
        <ExclamationTriangleIcon class="mt-px h-4 w-4 shrink-0" />
        <p>Save this somewhere safe now. It is shown once and cannot be read again.</p>
      </div>

      <Input :model-value="recoveryCode" label="Recovery code" readonly mono>
        <template #trailing>
          <IconButton
            size="sm"
            :label="copied ? 'Copied' : 'Copy recovery code'"
            :variant="copied ? 'primary' : 'ghost'"
            @click="copy(recoveryCode)"
          >
            <CheckIcon v-if="copied" />
            <ClipboardDocumentIcon v-else />
          </IconButton>
        </template>
      </Input>

      <p class="text-sm text-muted">
        Using it switches two-factor off, so it gets you back in rather than standing in for a code. Set an
        authenticator up again afterwards for a new one.
      </p>

      <Button variant="primary" @click="reset">I have saved it</Button>
    </div>

    <!-- Trading a live code for a new recovery code -->
    <form v-else-if="step === 'replacing'" class="space-y-4" @submit.prevent>
      <p class="text-sm text-muted">The recovery code you have now stops working. The new one is shown once.</p>
      <Input v-model="password" type="password" label="Account password" autocomplete="current-password" />
      <Input
        v-model="code"
        label="Authenticator code"
        placeholder="123456"
        inputmode="numeric"
        maxlength="6"
        autocomplete="one-time-code"
        mono
        class="w-40"
      />
      <div class="flex gap-2">
        <Button variant="primary" type="submit" :click="replace" message="Issuing" :disabled="!canRemove">
          Get a new recovery code
        </Button>
        <Button variant="ghost" @click="reset">Cancel</Button>
      </div>
    </form>

    <!-- Spending the recovery code -->
    <form v-else-if="step === 'recovering'" class="space-y-4" @submit.prevent>
      <div class="flex items-start gap-2.5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
        <ExclamationTriangleIcon class="mt-px h-4 w-4 shrink-0" />
        <p>
          This switches two-factor off and spends the recovery code. Spaces that asked you for a code stop asking;
          spaces whose owner requires one stay shut until you enrol again.
        </p>
      </div>
      <Input v-model="password" type="password" label="Account password" autocomplete="current-password" />
      <Input v-model="recoveryEntry" label="Recovery code" placeholder="xxxx-xxxx-xxxx" autocomplete="off" mono />
      <div class="flex gap-2">
        <Button variant="danger" type="submit" :click="recover" message="Switching off" :disabled="!canRecover">
          Switch two-factor off
        </Button>
        <Button variant="ghost" @click="reset">Cancel</Button>
      </div>
    </form>

    <!-- Removing -->
    <form v-else class="space-y-4" @submit.prevent>
      <p class="text-sm text-muted">
        Spaces that require a code stay locked to you until you set up an authenticator again.
      </p>
      <Input v-model="password" type="password" label="Account password" autocomplete="current-password" />
      <Input
        v-model="code"
        label="Authenticator code"
        placeholder="123456"
        inputmode="numeric"
        maxlength="6"
        autocomplete="one-time-code"
        mono
        class="w-40"
      />
      <div class="flex gap-2">
        <Button variant="danger" type="submit" :click="remove" message="Removing" :disabled="!canRemove">
          Remove authenticator
        </Button>
        <Button variant="ghost" @click="reset">Cancel</Button>
      </div>
    </form>
  </Card>
</template>
