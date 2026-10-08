<script setup lang="ts">
/** The spaces the user is in, the invites waiting on them, and the way to start one. */
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { PlusIcon, UserGroupIcon, UsersIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../http";
import { acceptSpaceInvite, createSpace, declineSpaceInvite } from "../services/spaces.service";
import { invites, loadSpaces, spaces, spacesLoaded } from "../stores/spaces.store";
import { useAuthUser } from "../stores/auth.store";
import PageHeader from "../components/ui/PageHeader.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import Input from "../components/ui/Input.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import EmptyState from "../components/ui/EmptyState.vue";
import Dialog from "../components/ui/Dialog.vue";

const $router = useRouter();
const authUser = useAuthUser();

const loading = ref(true);
const createOpen = ref(false);
const newName = ref("");
const answering = ref("");

// A free account owns two spaces; joining more is unlimited either way.
const FREE_OWNED = 2;
const owned = computed(() => spaces.value.filter((s) => s.role === "owner").length);
const isPro = computed(() => authUser.data?.plan === "pro");
const atOwnLimit = computed(() => !isPro.value && owned.value >= FREE_OWNED);

onMounted(async () => {
  try {
    await loadSpaces();
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
});

function openCreate() {
  newName.value = "";
  createOpen.value = true;
}

function create(btn: ILoadingButton) {
  const name = newName.value.trim();
  if (!name) return btn.stopLoading();

  return createSpace(name)
    .then(async ({ space }) => {
      createOpen.value = false;
      await loadSpaces();
      $router.push({ name: "space", params: { spaceId: space.publicId } });
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

async function answer(spaceId: string, accept: boolean) {
  answering.value = spaceId;
  try {
    if (accept) {
      await acceptSpaceInvite(spaceId);
      await loadSpaces();
      $router.push({ name: "space", params: { spaceId } });
      return;
    }
    await declineSpaceInvite(spaceId);
    await loadSpaces();
  } catch (e) {
    alertRequestError(e);
  } finally {
    answering.value = "";
  }
}

function open(spaceId: string) {
  $router.push({ name: "space", params: { spaceId } });
}
</script>

<template>
  <div class="max-w-3xl space-y-5">
    <PageHeader title="Spaces" description="A shared clipboard. Everyone in a space sees every clip in it.">
      <Button v-if="spaces.length || invites.length" variant="primary" size="sm" :disabled="atOwnLimit" @click="openCreate">
        <PlusIcon class="h-4 w-4" />New space
      </Button>
    </PageHeader>

    <!-- Invites -->
    <Card v-if="invites.length" title="Invitations" :padded="false">
      <ul class="divide-y divide-line">
        <li
          v-for="invite in invites"
          :key="invite.space.publicId"
          :class="['flex flex-wrap items-center gap-3 px-5 py-3.5', answering === invite.space.publicId ? 'opacity-50' : '']"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-fg">{{ invite.space.name }}</p>
            <p class="mt-0.5 text-xs text-muted">
              <template v-if="invite.invitedBy">{{ invite.invitedBy }} invited you</template>
              <template v-else>You have been invited</template>
              <span class="text-faint"> · <TimeAgo :date="invite.createdAt" /></span>
            </p>
          </div>
          <Button size="sm" variant="ghost" @click="answer(invite.space.publicId, false)">Decline</Button>
          <Button size="sm" variant="primary" @click="answer(invite.space.publicId, true)">Accept</Button>
        </li>
      </ul>
    </Card>

    <!-- Spaces -->
    <div v-if="loading && !spacesLoaded" class="space-y-3">
      <Skeleton v-for="i in 2" :key="i" class="h-16 w-full rounded-lg" />
    </div>

    <EmptyState
      v-else-if="!spaces.length"
      title="No spaces yet"
      description="Make one to share a clipboard with other people. Everyone in it sees every clip, and only the person who added a clip can change it."
    >
      <template #icon><UserGroupIcon /></template>
      <Button variant="primary" size="sm" :disabled="atOwnLimit" @click="openCreate">
        <PlusIcon class="h-4 w-4" />New space
      </Button>
    </EmptyState>

    <Card v-else :padded="false">
      <ul class="divide-y divide-line">
        <li v-for="space in spaces" :key="space.publicId">
          <button type="button" class="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-raised" @click="open(space.publicId)">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
              <UserGroupIcon class="h-4 w-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-medium text-fg">{{ space.name }}</span>
                <Badge v-if="space.role === 'owner'" variant="accent" uppercase>Owner</Badge>
              </span>
              <span class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <span class="inline-flex items-center gap-1"><UsersIcon class="h-3 w-3 text-faint" />{{ space.members }}</span>
                <span v-if="space.owner && space.role !== 'owner'">· {{ space.owner }}</span>
                <span class="text-faint">· <TimeAgo :date="space.createdAt" /></span>
              </span>
            </span>
          </button>
        </li>
      </ul>

      <template v-if="atOwnLimit" #footer>
        <p class="mr-auto text-sm text-muted">A free account can own {{ FREE_OWNED }} spaces.</p>
        <Button size="sm" variant="primary" :to="{ name: 'pricing' }">Upgrade to Pro</Button>
      </template>
    </Card>

    <Dialog
      :open="createOpen"
      size="sm"
      title="New space"
      description="You own it, and you decide who joins."
      @close="createOpen = false"
    >
      <form @submit.prevent>
        <Input v-model="newName" label="Name" placeholder="Design team" maxlength="100" autocomplete="off" />
      </form>
      <template #footer>
        <Button variant="ghost" @click="createOpen = false">Cancel</Button>
        <Button variant="primary" type="submit" :click="create" message="Creating">Create space</Button>
      </template>
    </Dialog>
  </div>
</template>
