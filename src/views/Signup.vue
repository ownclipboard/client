<script setup lang="ts">
/**
 * Sign up: username with a live availability check, password and confirmation.
 * On success the account is logged in and sent to pick a plan.
 */
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDebounceFn } from "@vueuse/core";
import { CheckCircleIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../http";
import { login, signup, usernameExists } from "../services/auth.service";
import { redirect } from "../functions";
import AuthPanel from "../layouts/AuthPanel.vue";
import Input from "../components/ui/Input.vue";
import Button from "../components/ui/Button.vue";
import Spinner from "../components/ui/Spinner.vue";

const $router = useRouter();
const $route = useRoute();

const form = reactive({
  username: String($route.query.username || ""),
  password: "",
  confirm: ""
});

// Matches the API's rules: 3 to 250 alphanumeric characters, password 6 to 500.
const USERNAME_RE = /^[a-zA-Z0-9]{3,250}$/;

const usernameError = computed(() => {
  const u = form.username.trim();
  if (!u) return "";
  if (!USERNAME_RE.test(u)) return "3 to 250 letters or numbers, no spaces or symbols.";
  if (availability.value === "taken") return "That username is taken.";
  return "";
});

const passwordError = computed(() => {
  if (!form.password) return "";
  if (form.password.length < 6) return "At least 6 characters.";
  return "";
});

const confirmError = computed(() => {
  if (!form.confirm) return "";
  if (form.confirm !== form.password) return "Passwords don't match.";
  return "";
});

/* Live availability check */
type Availability = "idle" | "checking" | "available" | "taken";
const availability = ref<Availability>("idle");

const check = useDebounceFn(async (username: string) => {
  if (!USERNAME_RE.test(username)) return (availability.value = "idle");
  availability.value = "checking";
  try {
    const taken = await usernameExists(username);
    // Ignore stale answers if the field changed meanwhile.
    if (form.username.trim() !== username) return;
    availability.value = taken ? "taken" : "available";
  } catch {
    availability.value = "idle";
  }
}, 400);

watch(() => form.username, (u) => {
  availability.value = "idle";
  check(u.trim());
}, { immediate: true });

const canSubmit = computed(
  () =>
    USERNAME_RE.test(form.username.trim()) &&
    availability.value !== "taken" &&
    form.password.length >= 6 &&
    form.confirm === form.password
);

async function createAccount(btn: ILoadingButton) {
  if (!canSubmit.value) return btn.stopLoading();
  const username = form.username.trim();

  try {
    await signup(username, form.password);
    await login(username, form.password);
    // Full reload so the axios instance picks up the token; new accounts choose a plan first.
    redirect($router.resolve({ name: "pricing" }).href, 300);
  } catch (e) {
    alertRequestError(e);
    btn.stopLoading();
  }
}
</script>

<template>
  <AuthPanel>
    <h2 class="text-2xl font-semibold tracking-tight text-fg">Create your account</h2>
    <p class="mt-1 text-sm text-muted">A username and a password is all it takes.</p>

    <form class="mt-8 space-y-4" @submit.prevent>
      <Input
        v-model="form.username"
        label="Username"
        autocomplete="username"
        autofocus
        spellcheck="false"
        :error="usernameError"
        :hint="availability === 'available' ? '' : 'Letters and numbers only.'"
      >
        <template #trailing>
          <Spinner v-if="availability === 'checking'" size="sm" class="mr-1 text-faint" />
          <CheckCircleIcon v-else-if="availability === 'available' && !usernameError" class="mr-1 h-4 w-4 text-accent" aria-label="Available" />
        </template>
      </Input>
      <Input v-model="form.password" type="password" label="Password" autocomplete="new-password" :error="passwordError" hint="At least 6 characters." />
      <Input v-model="form.confirm" type="password" label="Confirm password" autocomplete="new-password" :error="confirmError" />

      <Button variant="primary" size="lg" type="submit" block :click="createAccount" message="Creating account" :disabled="!canSubmit">
        Create account
      </Button>
    </form>

    <p class="mt-8 text-sm text-muted">
      Already have an account?
      <RouterLink :to="{ name: 'index' }" class="font-medium text-accent underline underline-offset-4">Sign in</RouterLink>
    </p>
  </AuthPanel>
</template>
