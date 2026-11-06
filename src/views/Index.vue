<script setup lang="ts">
/**
 * Sign in. Check the username exists, then the password, and for an account
 * that asks for one, a code from its authenticator before any token exists.
 */
import { nextTick, onBeforeUnmount, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeftIcon, ArrowRightIcon, ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../http";
import { $alert } from "../components/ws-alert/ws-alert";
import { login, loginWithCode, loginWithRecoveryCode, usernameExists } from "../services/auth.service";
import { redirect } from "../functions";
import AuthPanel from "../layouts/AuthPanel.vue";
import Input from "../components/ui/Input.vue";
import Button from "../components/ui/Button.vue";

const $router = useRouter();
const step = ref<"username" | "password" | "code" | "recover" | "recovered">("username");
const usernameInput = ref<InstanceType<typeof Input>>();
const passwordInput = ref<InstanceType<typeof Input>>();
const codeInput = ref<InstanceType<typeof Input>>();
const recoveryInput = ref<InstanceType<typeof Input>>();
// Set when the username is unknown, so we can offer to create it.
const unknownUsername = ref("");

// Dev convenience only: prefill from env, never in production builds.
const form = reactive({
  username: (import.meta.env.DEV && import.meta.env.VITE_APP_DEV_USERNAME) || "",
  password: (import.meta.env.DEV && import.meta.env.VITE_APP_DEV_PASSWORD) || ""
});

async function checkUsername(btn: ILoadingButton) {
  const username = form.username.trim();
  if (!username) return btn.stopLoading(() => usernameInput.value?.focus());

  try {
    if (!(await usernameExists(username))) {
      unknownUsername.value = username;
      return;
    }
    unknownUsername.value = "";
    step.value = "password";
    await nextTick();
    passwordInput.value?.focus();
  } catch (e) {
    alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}

function back() {
  step.value = "username";
  nextTick(() => usernameInput.value?.focus());
}

/**
 * A half-done login: the password was right, but the account wants a code
 * before a token exists. The challenge is only good for five minutes, so the
 * screen gives up on its own rather than sending a code into a dead one.
 */
const code = ref("");
const recoveryCode = ref("");
let challenge = "";
let challengeTimer: ReturnType<typeof setTimeout> | undefined;
const CHALLENGE_MS = 5 * 60 * 1000;

function clearChallenge() {
  challenge = "";
  code.value = "";
  recoveryCode.value = "";
  clearTimeout(challengeTimer);
  challengeTimer = undefined;
}

onBeforeUnmount(clearChallenge);

function backToPassword() {
  clearChallenge();
  step.value = "password";
  nextTick(() => passwordInput.value?.focus());
}

// Held once a recovery login lands, for the screen that explains it before
// sending the browser anywhere.
let signedInPlan: "free" | "pro" | null = null;

function signedIn(plan: "free" | "pro" | null) {
  const target = $router.resolve({ name: plan ? "clipboard" : "pricing" }).href;
  // Full reload so the axios instance picks up the token header.
  redirect(target, 300);
}

async function submitLogin(btn: ILoadingButton) {
  if (!form.password) return btn.stopLoading(() => passwordInput.value?.focus());

  try {
    const res = await login(form.username.trim(), form.password);
    // Left loading through the redirect, so the page never looks idle on its way out.
    if (res.status === "signed-in") return signedIn(res.plan);

    challenge = res.challenge;
    challengeTimer = setTimeout(() => {
      backToPassword();
      $alert.warning("That took too long. Enter your password again.");
    }, CHALLENGE_MS);

    step.value = "code";
    await nextTick();
    codeInput.value?.focus();
  } catch (e) {
    alertRequestError(e);
  }

  btn.stopLoading();
}

function toRecovery() {
  code.value = "";
  step.value = "recover";
  nextTick(() => recoveryInput.value?.focus());
}

function backToCode() {
  recoveryCode.value = "";
  step.value = "code";
  nextTick(() => codeInput.value?.focus());
}

/**
 * The way in when the authenticator is gone. It spends the recovery code and
 * switches two factor off, so it ends on a screen that says so rather than
 * dropping the user into the app wondering what just happened.
 */
async function submitRecovery(btn: ILoadingButton) {
  const entered = recoveryCode.value.trim();
  if (!entered) {
    $alert.warning("Enter the recovery code you saved when you set the authenticator up.");
    return btn.stopLoading();
  }

  try {
    const res = await loginWithRecoveryCode(challenge, entered);
    if (res.status === "signed-in") {
      signedInPlan = res.plan;
      // Clears the five minute timer too: nothing should drag this screen back
      // to the password step now that the login is done.
      clearChallenge();
      // The form unmounts with the step, taking the loading button with it.
      return (step.value = "recovered");
    }
    btn.stopLoading();
  } catch (e) {
    alertRequestError(e);
    // Spent or wrong either way, and five wrong ones close the step for a while.
    recoveryCode.value = "";
    await nextTick();
    recoveryInput.value?.focus();
    btn.stopLoading();
  }
}

async function submitCode(btn: ILoadingButton) {
  const entered = code.value.trim();
  if (entered.length !== 6) {
    $alert.warning("Enter the six digit code from your authenticator.");
    return btn.stopLoading();
  }

  try {
    const res = await loginWithCode(challenge, entered);
    if (res.status === "signed-in") return signedIn(res.plan);
    btn.stopLoading();
  } catch (e) {
    alertRequestError(e);
    // Codes are single use, so a refused one is never worth sending again.
    code.value = "";
    await nextTick();
    codeInput.value?.focus();
    btn.stopLoading();
  }
}

/** Straight to the card that enrols one, since that is what the screen offered. */
function toSecurity() {
  redirect($router.resolve({ name: "settings.security" }).href);
}

const LEGACY_URL = "https://legacy.ownclipboard.com";
</script>

<template>
  <AuthPanel>
    <h2 class="text-2xl font-semibold tracking-tight text-fg">Sign in</h2>
    <p class="mt-1 text-sm text-muted">
      <template v-if="step === 'username'">Enter your username to continue.</template>
      <template v-else-if="step === 'code'">Enter the code from your authenticator app.</template>
      <template v-else-if="step === 'recover'">Enter the recovery code you saved when you set it up.</template>
      <template v-else-if="step === 'recovered'">You're in. Two-factor is off.</template>
      <template v-else>Welcome back, <span class="font-medium text-fg">{{ form.username }}</span>.</template>
    </p>

    <form v-if="step === 'username'" class="mt-8 space-y-4" @submit.prevent>
      <Input
        ref="usernameInput"
        v-model="form.username"
        label="Username"
        autocomplete="username"
        autofocus
        spellcheck="false"
        :error="unknownUsername && unknownUsername === form.username.trim() ? 'No account with that username.' : ''"
        @update:model-value="unknownUsername = ''"
      />
      <Button variant="primary" size="lg" type="submit" block :click="checkUsername" message="Checking">
        Continue <ArrowRightIcon class="h-4 w-4" />
      </Button>
      <p v-if="unknownUsername" class="text-sm text-muted">
        <RouterLink :to="{ name: 'signup', query: { username: unknownUsername } }" class="font-medium text-accent underline underline-offset-4">
          Create an account as {{ unknownUsername }}
        </RouterLink>
      </p>
    </form>

    <form v-else-if="step === 'code'" class="mt-8 space-y-4" @submit.prevent>
      <Input
        ref="codeInput"
        v-model="code"
        label="Authenticator code"
        placeholder="123456"
        inputmode="numeric"
        maxlength="6"
        autocomplete="one-time-code"
        mono
      />
      <Button variant="primary" size="lg" type="submit" block :click="submitCode" message="Signing in">Sign in</Button>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" @click="backToPassword"><ArrowLeftIcon class="h-4 w-4" /> Back</Button>
        <button type="button" class="text-sm text-muted underline underline-offset-4 hover:text-fg" @click="toRecovery">
          Lost your authenticator?
        </button>
      </div>
    </form>

    <form v-else-if="step === 'recover'" class="mt-8 space-y-4" @submit.prevent>
      <div class="flex items-start gap-2.5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
        <ExclamationTriangleIcon class="mt-px h-4 w-4 shrink-0" />
        <p>This spends the code and switches two-factor off, so signing in takes your password alone afterwards.</p>
      </div>
      <Input
        ref="recoveryInput"
        v-model="recoveryCode"
        label="Recovery code"
        placeholder="xxxx-xxxx-xxxx"
        autocomplete="off"
        spellcheck="false"
        mono
      />
      <Button variant="primary" size="lg" type="submit" block :click="submitRecovery" message="Signing in">
        Sign in and switch two-factor off
      </Button>
      <Button variant="ghost" size="sm" @click="backToCode"><ArrowLeftIcon class="h-4 w-4" /> I have my code after all</Button>
    </form>

    <div v-else-if="step === 'recovered'" class="mt-8 space-y-4">
      <div class="rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
        <p>Two-factor is off and that recovery code is spent. Your password alone signs you in from here.</p>
      </div>
      <p class="text-sm text-muted">
        Setting an authenticator up again turns it back on, and is what issues a new recovery code.
      </p>
      <Button variant="primary" size="lg" block @click="toSecurity">
        <ShieldCheckIcon class="h-4 w-4" />Set up an authenticator
      </Button>
      <Button variant="ghost" size="sm" block @click="signedIn(signedInPlan)">Not now, take me in</Button>
    </div>

    <form v-else class="mt-8 space-y-4" @submit.prevent>
      <Input ref="passwordInput" v-model="form.password" type="password" label="Password" autocomplete="current-password" />
      <Button variant="primary" size="lg" type="submit" block :click="submitLogin" message="Signing in">Sign in</Button>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" @click="back"><ArrowLeftIcon class="h-4 w-4" /> Not {{ form.username }}?</Button>
        <RouterLink :to="{ name: 'forgot-password' }" class="text-sm text-muted underline underline-offset-4 hover:text-fg">
          Forgot your password?
        </RouterLink>
      </div>
    </form>

    <p class="mt-8 text-sm text-muted">
      New here?
      <RouterLink :to="{ name: 'signup' }" class="font-medium text-accent underline underline-offset-4">Create an account</RouterLink>
    </p>

    <div class="mt-6 rounded-md border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-muted">
      <p>
        If you are looking for the old version, see <a
          :href="LEGACY_URL"
          target="_blank"
          rel="noopener"
          class="font-medium text-accent underline underline-offset-4"
        >legacy.ownclipboard.com</a>.
      </p>
      <p class="mt-2">
        Your clips have already been imported here. New clips saved on the old site won't sync over, and it may be shut down at
        any time.
      </p>
    </div>
  </AuthPanel>
</template>
