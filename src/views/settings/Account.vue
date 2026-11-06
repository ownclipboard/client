<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $alert } from "../../components/ws-alert/ws-alert";
import { closeAccount, sendEmailVerification, setAccountEmail, verifyEmail } from "../../services/auth.service";
import { useAuthUser } from "../../stores/auth.store";
import { askToConfirm } from "../../components/ConfirmHandler";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";

const authUser = useAuthUser();

/* ---------------- Email address ---------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailForm = reactive({ email: "", password: "" });

function saveEmail(btn: ILoadingButton) {
  const email = emailForm.email.trim();

  if (!EMAIL_RE.test(email)) {
    $alert.warning("That doesn't look like an email address.");
    return btn.stopLoading();
  }
  if (!emailForm.password) {
    $alert.warning("Enter your account password to confirm the change.");
    return btn.stopLoading();
  }

  return setAccountEmail(email, emailForm.password)
    .then((res) => {
      if (authUser.data) {
        authUser.data.email = res.email;
        // A changed address starts unverified, whether or not the code went out.
        authUser.data.emailVerified = false;
      }
      codeSent.value = res.verificationSent;
      emailForm.email = "";
      emailForm.password = "";
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/* ---------------- Verifying the email ---------------- */

const verifyCode = ref("");
// True once a code has gone out in this visit, which changes what the card says.
const codeSent = ref(false);

const emailVerified = computed(() => !!authUser.data?.emailVerified);
const needsVerifying = computed(() => !!authUser.data?.email && !emailVerified.value);

function sendCode(btn: ILoadingButton) {
  return sendEmailVerification()
    .then(() => (codeSent.value = true))
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function confirmEmail(btn: ILoadingButton) {
  const code = verifyCode.value.trim();
  if (code.length !== 6) {
    $alert.warning("Enter the six digit code from the email.");
    return btn.stopLoading();
  }

  return verifyEmail(code)
    .then(() => {
      if (authUser.data) authUser.data.emailVerified = true;
      verifyCode.value = "";
      codeSent.value = false;
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/* ---------------- Closing the account ---------------- */

const closeForm = reactive({ password: "", confirmText: "" });
const CLOSE_PHRASE = "close my account";

// Held after closing so the deadline for changing your mind can be read before
// the session is dropped and the browser leaves for the sign-in page.
const closedUntil = ref("");

const canClose = computed(
  () => !!closeForm.password && closeForm.confirmText.trim().toLowerCase() === CLOSE_PHRASE
);

async function close(btn: ILoadingButton) {
  if (!canClose.value) {
    $alert.warning(`Enter your password and type "${CLOSE_PHRASE}" to confirm.`);
    return btn.stopLoading();
  }

  const ok = await askToConfirm({
    title: "Close your account?",
    message:
      "You are signed out everywhere. Nothing is deleted for 30 days — sign in again within that time to bring it back.",
    confirmLabel: "Close account",
    danger: true
  });
  if (!ok) return btn.stopLoading();

  return closeAccount(closeForm.password)
    .then((res) => {
      closeForm.password = "";
      closeForm.confirmText = "";
      closedUntil.value = new Date(res.purgeAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}
</script>

<template>
  <div class="space-y-5">
    <Card title="Account">
      <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt class="text-muted">Username</dt>
        <dd class="text-fg">{{ authUser.data?.username }}</dd>
        <dt class="text-muted">Email</dt>
        <dd :class="authUser.data?.email ? 'text-fg' : 'text-faint'">{{ authUser.data?.email || "Not set" }}</dd>
        <dt class="text-muted">Plan</dt>
        <dd class="flex items-center gap-2 text-fg">
          <Badge :variant="authUser.data?.plan === 'pro' ? 'accent' : 'neutral'" uppercase>{{ authUser.data?.plan || "none" }}</Badge>
          <RouterLink :to="{ name: 'pricing' }" class="text-xs text-accent underline underline-offset-2">Manage plan</RouterLink>
        </dd>
      </dl>
      <template #footer>
        <Button variant="danger" size="sm" :click="authUser.signOut" message="Signing out">Sign out</Button>
      </template>
    </Card>

    <Card
      title="Email address"
      description="Used to reset your password if you forget it. We don't email you for anything else."
    >
      <template #header>
        <Badge v-if="emailVerified" variant="accent">Verified</Badge>
        <Badge v-else-if="authUser.data?.email" variant="warn">Not verified</Badge>
      </template>

      <div
        v-if="!authUser.data?.email"
        class="mb-4 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn"
      >
        Add an email address so you can reset your password if you forget it.
      </div>

      <!-- An address only works for a reset once it has been confirmed -->
      <div v-else-if="needsVerifying" class="mb-4 space-y-3 rounded-md border border-warn/30 bg-warn-soft p-3">
        <p class="text-sm text-warn">
          <span class="font-medium">{{ authUser.data?.email }}</span> is not confirmed yet, so it cannot reset your
          password. We'll email you a six digit code.
        </p>

        <form v-if="codeSent" class="flex flex-wrap items-end gap-2" @submit.prevent>
          <Input
            v-model="verifyCode"
            label="Code from the email"
            placeholder="123456"
            inputmode="numeric"
            maxlength="6"
            autocomplete="one-time-code"
            mono
            class="w-40"
          />
          <Button variant="primary" type="submit" :click="confirmEmail" message="Checking">Confirm</Button>
          <Button variant="ghost" :click="sendCode" message="Sending">Send another</Button>
        </form>
        <Button v-else variant="primary" size="sm" :click="sendCode" message="Sending">Send me a code</Button>

        <p v-if="codeSent" class="text-xs text-warn/80">The code lasts 30 minutes. You can ask for a new one every minute.</p>
      </div>

      <form class="space-y-4" @submit.prevent>
        <Input
          v-model="emailForm.email"
          type="email"
          label="Email address"
          :placeholder="authUser.data?.email || 'you@example.com'"
          autocomplete="email"
        />
        <Input
          v-model="emailForm.password"
          type="password"
          label="Account password"
          placeholder="Your current password"
          autocomplete="current-password"
          hint="Needed to change your email address."
        />
        <Button variant="primary" type="submit" :click="saveEmail" message="Saving">
          {{ authUser.data?.email ? "Change email" : "Add email" }}
        </Button>
      </form>
    </Card>

    <Card title="About">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <RouterLink :to="{ name: 'privacy' }" class="text-accent underline underline-offset-2">Privacy policy</RouterLink>
        <RouterLink :to="{ name: 'terms' }" class="text-accent underline underline-offset-2">Terms of service</RouterLink>
        <RouterLink :to="{ name: 'support' }" class="text-accent underline underline-offset-2">Support</RouterLink>
      </div>
    </Card>

    <Card title="Close account">
      <div v-if="closedUntil" class="space-y-4">
        <div class="rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
          <p>Your account is closed. You are signed out everywhere.</p>
          <p class="mt-2">
            Sign in again before <span class="font-medium">{{ closedUntil }}</span> and everything comes back. After that
            it is deleted for good.
          </p>
        </div>
        <Button variant="primary" @click="authUser.clearSession()">Done</Button>
      </div>

      <div v-else class="space-y-4">
        <div class="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <p>Closing signs you out everywhere and stops your devices, public paste links and invitations from working.</p>
          <p class="mt-2">
            Nothing is deleted for 30 days. Sign in again within that time and your account comes back as it was.
          </p>
          <p class="mt-2">
            After 30 days it all goes: your clips, folders, files and devices, every space you own along with everything
            in it for its members, and the clips you added to other people's spaces.
          </p>
        </div>

        <form class="space-y-4" @submit.prevent>
          <Input
            v-model="closeForm.password"
            type="password"
            label="Account password"
            placeholder="Your current password"
            autocomplete="current-password"
          />
          <Input
            v-model="closeForm.confirmText"
            label="Type to confirm"
            :placeholder="CLOSE_PHRASE"
            autocomplete="off"
          />
          <Button variant="danger" type="submit" :click="close" message="Closing" :disabled="!canClose">
            Close account
          </Button>
        </form>
      </div>
    </Card>
  </div>
</template>
