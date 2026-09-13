<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { LockClosedIcon } from "@heroicons/vue/20/solid";
import { PasswordPromptLabel, PasswordPromptResolveFn, ShowPasswordPrompt } from "./PasswordPromptHandler";
import { md5 } from "../functions/crypto";
import Dialog from "./ui/Dialog.vue";
import Input from "./ui/Input.vue";
import Button from "./ui/Button.vue";

const password = ref("");
const input = ref<InstanceType<typeof Input>>();

watch(ShowPasswordPrompt, async (show) => {
  if (show) {
    await nextTick();
    input.value?.focus();
  }
});

/** Resolve with the md5 of the password, or undefined when empty. */
function confirm() {
  const pass = password.value.length ? md5(password.value) : undefined;
  ShowPasswordPrompt.value = false;
  PasswordPromptResolveFn.value(pass);
  password.value = "";
}

function cancel() {
  ShowPasswordPrompt.value = false;
  PasswordPromptResolveFn.value(undefined);
  password.value = "";
}
</script>

<template>
  <Dialog :open="ShowPasswordPrompt" size="sm" title="Folder password" @close="cancel">
    <form class="space-y-4" @submit.prevent="confirm">
      <p class="flex items-start gap-2 text-sm text-muted">
        <LockClosedIcon class="mt-0.5 h-4 w-4 shrink-0 text-warn" />
        <span>{{ PasswordPromptLabel }}</span>
      </p>
      <Input ref="input" v-model="password" type="password" placeholder="Password" autocomplete="current-password" />
      <p class="text-xs text-faint">Encryption happens in your browser. The password never leaves this device unhashed.</p>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="cancel">Cancel</Button>
        <Button variant="primary" type="submit">Continue</Button>
      </div>
    </form>
  </Dialog>
</template>
