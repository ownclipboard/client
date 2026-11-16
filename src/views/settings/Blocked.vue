<script setup lang="ts">
/**
 * Accounts this one has blocked. Only this side's blocks are here: the api
 * will not say who has blocked you, because being told is an invitation to go
 * round it.
 */
import { onMounted, ref } from "vue";
import { NoSymbolIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { askToConfirm } from "../../components/ConfirmHandler";
import { blockAccount, getBlocks, unblockAccount, type BlockedAccount } from "../../services/moderation.service";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import EmptyState from "../../components/ui/EmptyState.vue";

const blocks = ref<BlockedAccount[]>([]);
const loading = ref(true);
const working = ref("");
const username = ref("");

async function load() {
  loading.value = true;
  try {
    blocks.value = (await getBlocks()).blocks;
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

/**
 * By name, because the clip that prompted it may be gone by the time anyone
 * gets here: a member can delete their own clip, and that takes the row its
 * menu was on with it.
 */
function block(btn: ILoadingButton) {
  const name = username.value.trim();
  if (!name) return btn.stopLoading();

  return blockAccount(name)
    .then(() => {
      username.value = "";
      return load();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

async function unblock(account: BlockedAccount) {
  const ok = await askToConfirm({
    title: `Unblock ${account.username}?`,
    message:
      "You see each other's clips in shared spaces again, and either of you can invite the other. If they blocked you as well, that one stands and nothing changes.",
    confirmLabel: "Unblock"
  });
  if (!ok) return;

  working.value = account.username;
  try {
    await unblockAccount(account.username);
    await load();
  } catch (e) {
    alertRequestError(e);
  } finally {
    working.value = "";
  }
}
</script>

<template>
  <Card
    title="Blocked accounts"
    description="A block works both ways. Neither of you can invite the other to a space, and in a space you already share, neither sees the other's clips."
  >
    <div class="space-y-4">
      <div v-if="loading" class="space-y-2">
        <Skeleton v-for="i in 2" :key="i" class="h-12" />
      </div>

      <EmptyState
        v-else-if="!blocks.length"
        title="Nobody is blocked"
        description="You can block someone from any clip of theirs in a space, or by username below."
      >
        <template #icon><NoSymbolIcon /></template>
      </EmptyState>

      <ul v-else class="divide-y divide-line rounded-md border border-line">
        <li
          v-for="account in blocks"
          :key="account.username"
          :class="['flex items-center gap-3 px-3 py-2.5', working === account.username ? 'opacity-50' : '']"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-semibold uppercase text-muted">
            {{ account.username.slice(0, 2) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-fg">{{ account.username }}</p>
            <p class="text-[11px] text-faint">Blocked <TimeAgo :date="account.createdAt" /></p>
          </div>
          <Button size="sm" @click="unblock(account)">Unblock</Button>
        </li>
      </ul>

      <form class="space-y-1.5" @submit.prevent>
        <div class="flex items-end gap-2">
          <Input v-model="username" label="Block by username" placeholder="username" class="flex-1" autocomplete="off" />
          <Button type="submit" variant="danger" :click="block" message="Blocking" :disabled="!username.trim()">
            <NoSymbolIcon class="h-4 w-4" />Block
          </Button>
        </div>
        <p class="text-xs text-muted">They are not told, and nobody leaves a space over it.</p>
      </form>
    </div>
  </Card>
</template>
