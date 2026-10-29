<script setup lang="ts">
/**
 * Resetting a forgotten password, in two steps: ask for a code, then use it.
 *
 * The server answers the first step the same way whatever address is given, so
 * nothing here may hint at whether an account exists. The second step is
 * reached by moving on, not by the server telling us the address was known.
 */
import { computed, nextTick, ref } from "vue";
import { useRoute } from "vue-router";
import { ArrowRightIcon, EnvelopeIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../http";
import { $alert } from "../components/ws-alert/ws-alert";
import { forgotPassword, resetPassword } from "../services/auth.service";
import AuthPanel from "../layouts/AuthPanel.vue";
import Input from "../components/ui/Input.vue";
import Button from "../components/ui/Button.vue";

const $route = useRoute();

const step = ref<"email" | "code" | "done">("email");
const form = ref({
  email: String($route.query.email || ""),
  code: "",
  password: "",
  confirm: ""
});

const codeInput = ref<InstanceType<typeof Input>>();

const canReset = computed(
  () => form.value.code.trim().length === 6 && form.value.password.length >= 6 && form.value.password === form.value.confirm
);

function requestCode(btn: ILoadingButton) {
  const email = form.value.email.trim();
  if (!email) {
    $alert.warning("Enter the email address on your account.");
    return btn.stopLoading();
  }

  return forgotPassword(email)
    .then(async () => {
      step.value = "code";
      await nextTick();
      codeInput.value?.focus();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function submitReset(btn: ILoadingButton) {
  if (form.value.password.length < 6) {
    $alert.warning("The new password needs at least 6 characters.");
    return btn.stopLoading();
  }
  if (form.value.password !== form.value.confirm) {
    $alert.warning("The two passwords don't match.");
    return btn.stopLoading();
  }

  return resetPassword(form.value.email.trim(), form.value.code.trim(), form.value.password)
    .then(() => (step.value = "done"))
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function startOver() {
  form.value.code = "";
  form.value.password = "";
  form.value.confirm = "";
  step.value = "email";
}
</script>

<template>
  <AuthPanel>
    <!-- Ask for a code -->
    <template v-if="step === 'email'">
      <h1 class="text-xl font-semibold tracking-tight text-fg">Reset your password</h1>
      <p class="mt-1 text-sm text-muted">We will email you a six digit code.</p>

      <form class="mt-6 space-y-4" @submit.prevent>
        <Input
          v-model="form.email"
          type="email"
          label="Email address"
          placeholder="you@example.com"
          autocomplete="email"
          hint="The verified address on your account."
        />
        <Button variant="primary" type="submit" block :click="requestCode" message="Sending">
          <EnvelopeIcon class="h-4 w-4" />Email me a code
        </Button>
      </form>

      <p class="mt-6 text-sm text-muted">
        <RouterLink :to="{ name: 'index' }" class="font-medium text-accent underline underline-offset-4">
          Back to sign in
        </RouterLink>
      </p>
    </template>

    <!-- Use the code -->
    <template v-else-if="step === 'code'">
      <h1 class="text-xl font-semibold tracking-tight text-fg">Check your email</h1>
      <p class="mt-1 text-sm text-muted">
        If <span class="font-medium text-fg">{{ form.email }}</span> belongs to an account with a verified address, a code
        is on its way. It lasts 15 minutes.
      </p>

      <form class="mt-6 space-y-4" @submit.prevent>
        <Input
          ref="codeInput"
          v-model="form.code"
          label="Code"
          placeholder="123456"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          mono
        />
        <Input
          v-model="form.password"
          type="password"
          label="New password"
          autocomplete="new-password"
          hint="At least 6 characters."
        />
        <Input v-model="form.confirm" type="password" label="Confirm new password" autocomplete="new-password" />
        <Button variant="primary" type="submit" block :click="submitReset" message="Resetting" :disabled="!canReset">
          Set new password
        </Button>
      </form>

      <p class="mt-6 flex items-center gap-3 text-sm text-muted">
        <button type="button" class="font-medium text-accent underline underline-offset-4" @click="startOver">
          Use a different address
        </button>
      </p>
      <p class="mt-2 text-xs text-faint">
        A code works once. After five wrong tries it is thrown away, and you can ask for another a minute later.
      </p>
    </template>

    <!-- Done -->
    <template v-else>
      <h1 class="text-xl font-semibold tracking-tight text-fg">Password changed</h1>
      <p class="mt-1 text-sm text-muted">
        You were signed out everywhere. Sign in with your new password.
      </p>
      <Button class="mt-6" variant="primary" block :to="{ name: 'index' }">
        <ArrowRightIcon class="h-4 w-4" />Go to sign in
      </Button>
    </template>
  </AuthPanel>
</template>
