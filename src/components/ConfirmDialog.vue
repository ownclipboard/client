<script setup lang="ts">
import { ConfirmOptionsRef, ConfirmResolveFn, ShowConfirm } from "./ConfirmHandler";
import Dialog from "./ui/Dialog.vue";
import Button from "./ui/Button.vue";

function answer(ok: boolean) {
  ShowConfirm.value = false;
  ConfirmResolveFn.value(ok);
}
</script>

<template>
  <Dialog :open="ShowConfirm" size="sm" :title="ConfirmOptionsRef.title" @close="answer(false)">
    <p v-if="ConfirmOptionsRef.message" class="text-sm text-muted">{{ ConfirmOptionsRef.message }}</p>
    <template #footer>
      <Button variant="ghost" @click="answer(false)">Cancel</Button>
      <Button :variant="ConfirmOptionsRef.danger ? 'danger' : 'primary'" @click="answer(true)">
        {{ ConfirmOptionsRef.confirmLabel || "Confirm" }}
      </Button>
    </template>
  </Dialog>
</template>
