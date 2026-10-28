<script setup lang="ts">
/**
 * Enrolling an authenticator. One enrolment covers the account and every space
 * that asks for a code, and there are no recovery codes, so the warning before
 * turning it on is the honest part of this screen.
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
import { disableTwoFactor, enableTwoFactor, setupTwoFactor } from "../../services/auth.service";
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

function setEnrolled(on: boolean) {
  authUser.twoFactor = { enabled: on };
}

type Step = "idle" | "enrolling" | "removing";

const step = ref<Step>("idle");
const qrImage = ref("");
const secret = ref("");
const code = ref("");
const password = ref("");

const { copy, copied } = useClipboard({ copiedDuring: 2000 });

const canConfirm = computed(() => code.value.trim().length === 6);
const canRemove = computed(() => !!password.value && code.value.trim().length === 6);

function reset() {
  step.value = "idle";
  qrImage.value = "";
  secret.value = "";
  code.value = "";
  password.value = "";
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
    .then(() => {
      reset();
      setEnrolled(true);
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function remove(btn: ILoadingButton) {
  if (!canRemove.value) {
    $alert.warning("Your password and a live code are both needed.");
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
  <Card title="Authenticator" description="A six digit code from an app, for spaces that ask for one.">
    <template #header>
      <Badge v-if="enrolled" variant="accent">On</Badge>
      <Badge v-else variant="neutral">Off</Badge>
    </template>

    <!-- Nothing in progress -->
    <div v-if="step === 'idle'" class="space-y-4">
      <p class="text-sm text-muted">
        <template v-if="enrolled">
          Your authenticator is set up. Spaces that ask for a code will accept it, and you can require one on spaces of
          your own.
        </template>
        <template v-else>
          Set one up with Google Authenticator, 1Password, or anything that takes an <span class="font-mono text-[13px] text-fg">otpauth</span> link.
          One setup covers your whole account.
        </template>
      </p>

      <Button v-if="!enrolled" variant="primary" :click="begin" message="Preparing">
        <ShieldCheckIcon class="h-4 w-4" />Set up an authenticator
      </Button>
      <Button v-else variant="danger" size="sm" @click="step = 'removing'">Remove authenticator</Button>
    </div>

    <!-- Enrolling -->
    <div v-else-if="step === 'enrolling'" class="space-y-4">
      <div class="flex items-start gap-2.5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
        <ExclamationTriangleIcon class="mt-px h-4 w-4 shrink-0" />
        <p>
          There are no backup codes. If you lose the authenticator, any space that demands a code is shut to you until
          the owner invites you back, and a space you created needs its recovery by email.
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
          label="Code from the app"
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

    <!-- Removing -->
    <form v-else class="space-y-4" @submit.prevent>
      <p class="text-sm text-muted">
        Removing it shuts every space that demands a code until you enrol again. Spaces where only you asked for one
        stop asking.
      </p>
      <Input v-model="password" type="password" label="Account password" autocomplete="current-password" />
      <Input
        v-model="code"
        label="Code from the app"
        placeholder="123456"
        inputmode="numeric"
        maxlength="6"
        autocomplete="one-time-code"
        mono
        class="w-40"
        hint="Proves it is you, not a borrowed session."
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
