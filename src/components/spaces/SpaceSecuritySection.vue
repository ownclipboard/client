<script setup lang="ts">
/**
 * The security half of a space's settings: what the owner demands of everyone,
 * and what this account chose for itself on top.
 *
 * The owner never holds a shared secret. Demanding a password means every
 * member sets one of their own, which is why raising the bar can only tell
 * people to go and do that.
 */
import { computed, ref, watch } from "vue";
import { KeyIcon, ShieldCheckIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $alert } from "../ws-alert/ws-alert";
import { askToConfirm } from "../ConfirmHandler";
import { md5 } from "../../functions/crypto";
import {
  getSpaceLock,
  removeSpaceLock,
  setSpaceLockPassword,
  setSpaceSecurity,
  setSpaceTotp,
  type SpaceLockState,
  type SpaceRequirement
} from "../../services/spaces.service";
import { isSpaceOwner } from "../../stores/spaces.store";
import { useAuthUser } from "../../stores/auth.store";
import Button from "../ui/Button.vue";
import Input from "../ui/Input.vue";
import Badge from "../ui/Badge.vue";
import Select from "../ui/Select.vue";
import Skeleton from "../ui/Skeleton.vue";

const props = defineProps<{ open: boolean; spaceId: string }>();

const authUser = useAuthUser();

const state = ref<SpaceLockState | null>(null);
const loading = ref(true);

const demand = ref<SpaceRequirement>("none");
const unlockMinutes = ref(15);

const hasPassword = computed(() => !!state.value?.mine.includes("password"));
const hasTotpHere = computed(() => !!state.value?.mine.includes("totp"));

const REQUIREMENTS: { value: SpaceRequirement; label: string }[] = [
  { value: "none", label: "Nothing extra" },
  { value: "password", label: "A password" },
  { value: "totp", label: "An authenticator code" },
  { value: "both", label: "Both" }
];

watch(
  () => props.open,
  (open) => open && load(),
  { immediate: true }
);

async function load() {
  loading.value = true;
  try {
    const res = await getSpaceLock(props.spaceId);
    state.value = res;
    unlockMinutes.value = res.unlockMinutes;
    demand.value =
      res.demanded.length === 2 ? "both" : res.demanded.length === 1 ? res.demanded[0] : "none";
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

/* ---------------- What the owner demands ---------------- */

async function saveDemand(btn: ILoadingButton) {
  const raising = demand.value !== "none";
  const ok = await askToConfirm({
    title: raising ? "Require this from everyone?" : "Stop requiring anything?",
    message: raising
      ? "Everyone, you included, has to set it up before the space opens again."
      : "The space opens with no extra step. Locks members set for themselves stay.",
    confirmLabel: "Save",
    danger: raising
  });
  if (!ok) return btn.stopLoading();

  return setSpaceSecurity(props.spaceId, demand.value, unlockMinutes.value)
    .then(load)
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/* ---------------- This account's own lock ---------------- */

const password = ref({ next: "", confirm: "", current: "" });

function savePassword(btn: ILoadingButton) {
  const { next, confirm, current } = password.value;
  if (next.length < 6) {
    $alert.warning("Use at least 6 characters.");
    return btn.stopLoading();
  }
  if (next !== confirm) {
    $alert.warning("The two passwords don't match.");
    return btn.stopLoading();
  }

  return setSpaceLockPassword(props.spaceId, md5(next), hasPassword.value && current ? md5(current) : undefined)
    .then(async () => {
      password.value = { next: "", confirm: "", current: "" };
      await load();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

const totpCode = ref("");

function toggleTotp(btn: ILoadingButton) {
  if (totpCode.value.trim().length !== 6) {
    $alert.warning("Enter a code from your authenticator.");
    return btn.stopLoading();
  }

  return setSpaceTotp(props.spaceId, !hasTotpHere.value, totpCode.value.trim())
    .then(async () => {
      totpCode.value = "";
      await load();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

const removePassword = ref("");

async function dropMyLock(btn: ILoadingButton) {
  const ok = await askToConfirm({
    title: "Remove your lock?",
    message: "Your password and code for this space are removed. Anything the owner requires stays.",
    confirmLabel: "Remove",
    danger: true
  });
  if (!ok) return btn.stopLoading();

  return removeSpaceLock(props.spaceId, {
    password: hasPassword.value && removePassword.value ? md5(removePassword.value) : undefined,
    code: hasTotpHere.value && totpCode.value.trim() ? totpCode.value.trim() : undefined
  })
    .then(async (next) => {
      state.value = next;
      removePassword.value = "";
      totpCode.value = "";
      await load();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

/** Nothing of your own can be dropped while the owner demands all of it. */
const canDropMine = computed(
  () => !!state.value && state.value.mine.some((f) => !state.value!.demanded.includes(f))
);
</script>

<template>
  <section class="space-y-4">
    <h3 class="text-sm font-medium text-fg">Security</h3>

    <div v-if="loading" class="space-y-2">
      <Skeleton class="h-9" />
      <Skeleton class="h-9" />
    </div>

    <template v-else-if="state">
      <!-- Owner: what everyone must pass -->
      <div v-if="isSpaceOwner" class="space-y-3 rounded-md border border-line p-3">
        <p class="text-[13px] font-medium text-fg">Require from everyone</p>

        <!-- A hint under any field here would drop the button below the inputs,
             since the row bottom-aligns, so the note sits under the whole row. -->
        <div class="space-y-1.5">
          <div class="flex flex-wrap items-end gap-2">
            <Select v-model="demand" label="Requirement" class="flex-1">
              <option v-for="r in REQUIREMENTS" :key="r.value" :value="r.value">{{ r.label }}</option>
            </Select>
            <Input
              v-model.number="unlockMinutes"
              type="number"
              min="1"
              max="1440"
              label="Stay unlocked (minutes)"
              class="w-44"
            />
            <Button variant="primary" :click="saveDemand" message="Saving">Save</Button>
          </div>
          <p class="text-xs text-muted">Each member sets their own.</p>
        </div>
      </div>

      <!-- Everyone: my own factors -->
      <div class="space-y-4 rounded-md border border-line p-3">
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-[13px] font-medium text-fg">Your lock on this space</p>
          <Badge v-if="hasPassword" variant="neutral"><KeyIcon class="h-3 w-3" />Password</Badge>
          <Badge v-if="hasTotpHere" variant="neutral"><ShieldCheckIcon class="h-3 w-3" />Authenticator</Badge>
          <Badge v-if="!state.mine.length" variant="outline">None</Badge>
        </div>

        <!-- Password -->
        <form class="space-y-3" @submit.prevent>
          <!-- The current one is only asked for when the space is actually shut. -->
          <Input
            v-if="hasPassword && state.locked"
            v-model="password.current"
            type="password"
            label="Current password"
            autocomplete="current-password"
          />
          <Input
            v-model="password.next"
            type="password"
            :label="hasPassword ? 'New password' : 'Space password'"
            autocomplete="new-password"
            hint="At least 6 characters."
          />
          <Input v-model="password.confirm" type="password" label="Confirm" autocomplete="new-password" />
          <Button size="sm" variant="primary" type="submit" :click="savePassword" message="Saving">
            {{ hasPassword ? "Change password" : "Require a password" }}
          </Button>
        </form>

        <!-- Authenticator -->
        <form class="space-y-3 border-t border-line pt-4" @submit.prevent>
          <template v-if="!authUser.hasAuthenticator">
            <Button size="sm" :to="{ name: 'settings', query: { tab: 'account' } }">
              <ShieldCheckIcon class="h-4 w-4" />Set up an authenticator
            </Button>
          </template>

          <template v-else>
            <Input
              v-model="totpCode"
              label="Authenticator code"
              placeholder="123456"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              mono
              class="w-40"
            />
            <Button size="sm" :variant="hasTotpHere ? 'danger' : 'primary'" type="submit" :click="toggleTotp" message="Saving">
              {{ hasTotpHere ? "Stop requiring a code" : "Require a code" }}
            </Button>
          </template>
        </form>

        <!-- Dropping what is mine. Only offered for factors the owner leaves optional. -->
        <div v-if="canDropMine" class="space-y-3 border-t border-line pt-4">
          <Input
            v-if="hasPassword"
            v-model="removePassword"
            type="password"
            label="Space password"
            autocomplete="current-password"
          />
          <Button size="sm" variant="danger" :click="dropMyLock" message="Removing">Remove my lock</Button>
        </div>
      </div>
    </template>
  </section>
</template>
