<script setup lang="ts">
import { reactive } from "vue";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $alert } from "../../components/ws-alert/ws-alert";
import { changePassword } from "../../services/auth.service";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import TwoFactorCard from "../../components/account/TwoFactorCard.vue";

const passwordForm = reactive({ current: "", next: "", confirm: "" });

function savePassword(btn: ILoadingButton) {
  const { current, next, confirm } = passwordForm;

  if (!current) {
    $alert.warning("Enter your current password.");
    return btn.stopLoading();
  }
  if (next.length < 6) {
    $alert.warning("The new password needs at least 6 characters.");
    return btn.stopLoading();
  }
  if (next !== confirm) {
    $alert.warning("The new passwords don't match.");
    return btn.stopLoading();
  }

  return changePassword(current, next)
    .then(() => {
      passwordForm.current = "";
      passwordForm.next = "";
      passwordForm.confirm = "";
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}
</script>

<template>
  <div class="space-y-5">
    <Card title="Password" description="Changing it signs you out everywhere else, including other tabs. This tab stays signed in.">
      <form class="space-y-4" @submit.prevent>
        <Input v-model="passwordForm.current" type="password" label="Current password" autocomplete="current-password" />
        <Input
          v-model="passwordForm.next"
          type="password"
          label="New password"
          autocomplete="new-password"
          hint="At least 6 characters."
        />
        <Input v-model="passwordForm.confirm" type="password" label="Confirm new password" autocomplete="new-password" />
        <Button variant="primary" type="submit" :click="savePassword" message="Updating">Change password</Button>
      </form>
    </Card>

    <TwoFactorCard />

    <p class="text-xs text-faint">
      Signed in somewhere you don't recognise? Sign it out under
      <RouterLink :to="{ name: 'settings.sessions' }" class="text-accent underline underline-offset-2">Sessions</RouterLink>.
    </p>
  </div>
</template>
