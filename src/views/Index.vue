<script setup lang="ts">
/**
 * Sign in. Two steps against the API: check the username exists, then log in.
 */
import { nextTick, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../http";
import { login, usernameExists } from "../services/auth.service";
import { redirect } from "../functions";
import AuthPanel from "../layouts/AuthPanel.vue";
import Input from "../components/ui/Input.vue";
import Button from "../components/ui/Button.vue";

const $router = useRouter();
const step = ref<"username" | "password">("username");
const usernameInput = ref<InstanceType<typeof Input>>();
const passwordInput = ref<InstanceType<typeof Input>>();
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

async function submitLogin(btn: ILoadingButton) {
  if (!form.password) return btn.stopLoading(() => passwordInput.value?.focus());

  try {
    const plan = await login(form.username.trim(), form.password);
    const target = $router.resolve({ name: plan ? "clipboard" : "pricing" }).href;
    // Full reload so the axios instance picks up the token header.
    redirect(target, 300);
  } catch (e) {
    alertRequestError(e);
    btn.stopLoading();
  }
}

const LEGACY_URL = "https://legacy.ownclipboard.com";
</script>

<template>
  <AuthPanel>
    <h2 class="text-2xl font-semibold tracking-tight text-fg">Sign in</h2>
    <p class="mt-1 text-sm text-muted">
      <template v-if="step === 'username'">Enter your username to continue.</template>
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

    <form v-else class="mt-8 space-y-4" @submit.prevent>
      <Input ref="passwordInput" v-model="form.password" type="password" label="Password" autocomplete="current-password" />
      <Button variant="primary" size="lg" type="submit" block :click="submitLogin" message="Signing in">Sign in</Button>
      <Button variant="ghost" size="sm" @click="back"><ArrowLeftIcon class="h-4 w-4" /> Not {{ form.username }}?</Button>
    </form>

    <p class="mt-8 text-sm text-muted">
      New here?
      <RouterLink :to="{ name: 'signup' }" class="font-medium text-accent underline underline-offset-4">Create an account</RouterLink>
    </p>

    <div class="mt-6 rounded-md border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-muted">
      <p>
        If you are looking for the old version, it is now at <a
          :href="LEGACY_URL"
          target="_blank"
          rel="noopener"
          class="font-medium text-accent underline underline-offset-4"
        >legacy.ownclipboard.com</a>.
      </p>
      <p class="mt-2">
        Your clips from there have already been brought over. If you carry on using it, anything you save there will stay there
        and will not appear here, and the old version may be switched off at any time.
      </p>
    </div>
  </AuthPanel>
</template>
