<script setup lang="ts">
/**
 * Sign in. Two steps against the API: check the username exists, then log in.
 */
import { nextTick, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/vue/20/solid";
import { ClipboardDocumentIcon, DevicePhoneMobileIcon, LockClosedIcon, ServerStackIcon } from "@heroicons/vue/24/outline";
import type { ILoadingButton } from "revue-components/vues/component-types";
import config from "../config";
import { $http, alertRequestError } from "../http";
import { $localStorage } from "../stores/native";
import { $alert } from "../components/ws-alert/ws-alert";
import { redirect } from "../functions";
import Input from "../components/ui/Input.vue";
import Button from "../components/ui/Button.vue";
import ThemeToggle from "../components/shell/ThemeToggle.vue";

const $router = useRouter();
const step = ref<"username" | "password">("username");
const usernameInput = ref<InstanceType<typeof Input>>();
const passwordInput = ref<InstanceType<typeof Input>>();

// Dev convenience only: prefill from env, never in production builds.
const form = reactive({
  username: (import.meta.env.DEV && import.meta.env.VITE_APP_DEV_USERNAME) || "",
  password: (import.meta.env.DEV && import.meta.env.VITE_APP_DEV_PASSWORD) || ""
});

const points = [
  { icon: ClipboardDocumentIcon, text: "Paste on one device, copy on another." },
  { icon: LockClosedIcon, text: "Encrypted folders, locked in your browser." },
  { icon: ServerStackIcon, text: "Files go to storage you own." },
  { icon: DevicePhoneMobileIcon, text: "Web, mobile app and browser extension." }
];

async function checkUsername(btn: ILoadingButton) {
  const username = form.username.trim();
  if (!username) return btn.stopLoading(() => usernameInput.value?.focus());

  try {
    const res = await $http.post<any, { exists: boolean }>("/auth/check-username", { username });
    if (!res.exists) {
      $alert.warning("No account with that username.");
      return;
    }
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

async function login(btn: ILoadingButton) {
  if (!form.password) return btn.stopLoading(() => passwordInput.value?.focus());

  try {
    const res = await $http.post<any, { token: string; plan: string | null }>("/auth/login", {
      username: form.username.trim(),
      password: form.password
    });
    $localStorage.set("token", res.token);
    const target = $router.resolve({ name: res.plan ? "clipboard" : "pricing" }).href;
    // Full reload so the axios instance picks up the token header.
    redirect(target, 300);
  } catch (e) {
    alertRequestError(e);
    btn.stopLoading();
  }
}
</script>

<template>
  <div class="grid min-h-screen bg-bg lg:grid-cols-[1.1fr_1fr]">
    <!-- Brand panel -->
    <section class="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex">
      <div class="flex items-center gap-2 text-fg">
        <img src="/logo.png" alt="" class="h-7 w-7 invert dark:invert-0" />
        <span class="text-[15px] font-semibold tracking-tight">{{ config.name }}</span>
      </div>

      <div class="max-w-md">
        <h1 class="text-4xl font-semibold leading-tight tracking-tight text-fg [text-wrap:balance]">
          Your clipboard, on every device you own.
        </h1>
        <p class="mt-4 text-[15px] leading-relaxed text-muted">
          Create, copy, paste or send text and files across devices. Keep sensitive clips in encrypted folders that only your password can open.
        </p>
        <ul class="mt-8 space-y-3">
          <li v-for="p in points" :key="p.text" class="flex items-center gap-3 text-sm text-fg/90">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
              <component :is="p.icon" class="h-4 w-4" />
            </span>
            {{ p.text }}
          </li>
        </ul>
      </div>

      <p class="font-mono text-xs text-faint">Open source · self-hostable</p>

      <!-- quiet backdrop -->
      <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" aria-hidden="true"></div>
    </section>

    <!-- Form -->
    <section class="flex flex-col p-6 sm:p-10">
      <div class="flex items-center justify-between lg:justify-end">
        <div class="flex items-center gap-2 text-fg lg:hidden">
          <img src="/logo.png" alt="" class="h-6 w-6 invert dark:invert-0" />
          <span class="text-[15px] font-semibold tracking-tight">{{ config.name }}</span>
        </div>
        <ThemeToggle />
      </div>

      <div class="flex flex-1 items-center">
        <div class="w-full max-w-sm mx-auto lg:mx-0 lg:ml-12">
          <h2 class="text-2xl font-semibold tracking-tight text-fg">Sign in</h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="step === 'username'">Enter your username to continue.</template>
            <template v-else>Welcome back, <span class="font-medium text-fg">{{ form.username }}</span>.</template>
          </p>

          <form v-if="step === 'username'" class="mt-8 space-y-4" @submit.prevent>
            <Input ref="usernameInput" v-model="form.username" label="Username" autocomplete="username" autofocus spellcheck="false" />
            <Button variant="primary" size="lg" type="submit" block :click="checkUsername" message="Checking">
              Continue <ArrowRightIcon class="h-4 w-4" />
            </Button>
          </form>

          <form v-else class="mt-8 space-y-4" @submit.prevent>
            <Input ref="passwordInput" v-model="form.password" type="password" label="Password" autocomplete="current-password" />
            <Button variant="primary" size="lg" type="submit" block :click="login" message="Signing in">Sign in</Button>
            <Button variant="ghost" size="sm" @click="back"><ArrowLeftIcon class="h-4 w-4" /> Not {{ form.username }}?</Button>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>
