<script setup lang="ts">
import Modal from "./Modal.vue";
import { ref } from "vue";
import {
  PasswordPromptLabel,
  PasswordPromptResolveFn,
  ShowPasswordPrompt
} from "./PasswordPromptHandler";
import { md5 } from "../functions/crypto";

// Password input.
const password = ref("");

/**
 * Confirm password
 * Send hashed password to resolve function.
 */
function confirmPassword() {
  let pass: string | undefined = password.value;

  if (pass && pass.length > 0) {
    // hash password with md5
    pass = md5(pass);
  } else {
    pass = undefined;
  }

  ShowPasswordPrompt.value = false;
  PasswordPromptResolveFn.value(pass || undefined);
  // clear password
  pass = password.value = "";
}

/**
 * Cancel password prompt
 * Send undefined to resolve function
 */
function cancelPassword() {
  ShowPasswordPrompt.value = false;
  PasswordPromptResolveFn.value(undefined);
  // clear password
  password.value = "";
}
</script>

<template>
  <Modal @close-modal="cancelPassword" v-if="ShowPasswordPrompt" max-size="max-w-sm">
    <div class="p-3">
      <form @submit.prevent="false">
        <div>
          <label class="text-sm font-medium" v-text="PasswordPromptLabel"></label>
          <input v-model="password" autofocus type="password" placeholder="Password" />
        </div>

        <div class="text-center space-x-3 mt-3">
          <button
            @click.prevent="confirmPassword"
            type="submit"
            class="bg-green-300 hover:bg-green-400 text-green-900"
          >
            Confirm
          </button>
          <button
            @click.prevent="cancelPassword"
            class="bg-white hover:bg-gray-200 text-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </Modal>
</template>

<style scoped>
input[type="password"] {
  @apply mt-2 w-full block px-3 py-2 rounded;
  @apply bg-gray-800 text-green-300;
  @apply focus:outline-none focus:border-2 focus:border-gray-800;
}

button {
  @apply px-3 py-1 rounded-sm font-medium;
}
</style>
