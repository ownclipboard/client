<script setup lang="ts">
/**
 * Everything about the space itself: its name, who is in it, and the way out.
 * The owner can rename, invite, remove and delete. A member can only leave.
 * Neither can touch anyone else's clips from here.
 */
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowRightStartOnRectangleIcon, TrashIcon, UserPlusIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $alert } from "../ws-alert/ws-alert";
import { askToConfirm } from "../ConfirmHandler";
import { humanFileSize } from "../../services/files.service";
import {
  deleteSpace,
  getSpaceMembers,
  inviteToSpace,
  leaveSpace,
  removeSpaceMember,
  renameSpace,
  type SpaceMember
} from "../../services/spaces.service";
import { currentSpace, isSpaceOwner, loadSpaces, refreshSpace } from "../../stores/spaces.store";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";
import Input from "../ui/Input.vue";
import Badge from "../ui/Badge.vue";
import Divider from "../ui/Divider.vue";
import Skeleton from "../ui/Skeleton.vue";
import IconButton from "../ui/IconButton.vue";

const props = defineProps<{ open: boolean; spaceId: string }>();
const emit = defineEmits<{ (e: "close"): void }>();

const $router = useRouter();

const name = ref("");
const members = ref<SpaceMember[]>([]);
const loadingMembers = ref(true);
const inviteName = ref("");

const space = computed(() => currentSpace.value);
const limits = computed(() => space.value?.limits);
const seatsUsed = computed(() => members.value.length);
const seatsFull = computed(() => !!limits.value && seatsUsed.value >= limits.value.members);

const storagePercent = computed(() => {
  const s = limits.value?.storage;
  if (!s || !s.max) return 0;
  return Math.min(100, Math.round((s.used / s.max) * 100));
});

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    name.value = space.value?.name || "";
    inviteName.value = "";
    await loadMembers();
  },
  { immediate: true }
);

async function loadMembers() {
  loadingMembers.value = true;
  try {
    const res = await getSpaceMembers(props.spaceId);
    members.value = res.members;
  } catch (e) {
    alertRequestError(e);
  } finally {
    loadingMembers.value = false;
  }
}

const canRename = computed(() => {
  const trimmed = name.value.trim();
  return !!trimmed && trimmed !== space.value?.name;
});

function rename(btn: ILoadingButton) {
  if (!canRename.value) return btn.stopLoading();

  return renameSpace(props.spaceId, name.value.trim())
    .then(async () => {
      await refreshSpace(props.spaceId);
      loadSpaces();
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

function invite(btn: ILoadingButton) {
  const username = inviteName.value.trim();
  if (!username) return btn.stopLoading();

  return inviteToSpace(props.spaceId, username)
    .then(async () => {
      inviteName.value = "";
      await loadMembers();
      refreshSpace(props.spaceId).catch(() => {});
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

const working = ref("");

async function remove(member: SpaceMember) {
  if (!member.username) return;
  const pending = member.role === "invited";

  const ok = await askToConfirm({
    title: pending ? `Cancel the invite to ${member.username}?` : `Remove ${member.username}?`,
    message: pending
      ? "They will not be able to join unless you invite them again."
      : `${member.username} loses access to this space. Clips they added stay here.`,
    confirmLabel: pending ? "Cancel invite" : "Remove",
    danger: true
  });
  if (!ok) return;

  working.value = member.username;
  try {
    await removeSpaceMember(props.spaceId, member.username);
    await loadMembers();
    refreshSpace(props.spaceId).catch(() => {});
  } catch (e) {
    alertRequestError(e);
  } finally {
    working.value = "";
  }
}

async function leave(btn: ILoadingButton) {
  const ok = await askToConfirm({
    title: `Leave ${space.value?.name}?`,
    message: "You lose access to everything in it. Clips you added stay for the others.",
    confirmLabel: "Leave",
    danger: true
  });
  if (!ok) return btn.stopLoading();

  return leaveSpace(props.spaceId)
    .then(async () => {
      emit("close");
      await loadSpaces();
      $router.push({ name: "spaces" });
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

const deleteName = ref("");

async function destroy(btn: ILoadingButton) {
  if (deleteName.value !== space.value?.name) {
    return btn.stopLoading(() => $alert.warning("Type the space name exactly to confirm."));
  }

  return deleteSpace(props.spaceId)
    .then(async () => {
      emit("close");
      await loadSpaces();
      $router.push({ name: "spaces" });
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

const ROLE_LABEL: Record<string, string> = { owner: "Owner", member: "Member", invited: "Invited" };
</script>

<template>
  <Dialog :open="open" size="lg" :title="space?.name || 'Space'" @close="emit('close')">
    <div v-if="space" class="space-y-6">
      <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge :variant="isSpaceOwner ? 'accent' : 'neutral'" uppercase>{{ isSpaceOwner ? "Owner" : "Member" }}</Badge>
        <span v-if="space.owner && !isSpaceOwner">owned by {{ space.owner }}</span>
        <span class="font-mono">{{ seatsUsed }} of {{ limits?.members }} members</span>
      </div>

      <!-- Storage -->
      <section class="space-y-1.5">
        <div class="flex items-center justify-between text-[13px]">
          <span class="font-medium text-fg">Storage</span>
          <span class="font-mono text-xs text-muted">
            {{ humanFileSize(limits?.storage.used || 0) }} of {{ humanFileSize(limits?.storage.max || 0) }}
          </span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
          <div class="h-full rounded-full bg-accent transition-[width]" :style="{ width: storagePercent + '%' }" />
        </div>
        <p v-if="!limits?.uploads" class="text-xs text-warn">
          {{ isSpaceOwner ? "Uploading files needs Pro." : "Files can be uploaded once the owner is on Pro." }}
        </p>
      </section>

      <!-- Rename -->
      <section v-if="isSpaceOwner" class="space-y-2">
        <form class="flex items-end gap-2" @submit.prevent>
          <Input v-model="name" label="Name" placeholder="Space name" class="flex-1" maxlength="100" autocomplete="off" />
          <Button type="submit" :click="rename" message="Renaming" :disabled="!canRename">Rename</Button>
        </form>
      </section>

      <!-- Members -->
      <section class="space-y-3">
        <h3 class="text-sm font-medium text-fg">Members</h3>

        <div v-if="loadingMembers" class="space-y-2">
          <Skeleton v-for="i in 2" :key="i" class="h-9" />
        </div>

        <ul v-else class="divide-y divide-line rounded-md border border-line">
          <li
            v-for="member in members"
            :key="member.username"
            :class="['flex items-center gap-3 px-3 py-2', working === member.username ? 'opacity-50' : '']"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-semibold uppercase text-muted">
              {{ member.username?.slice(0, 2) }}
            </span>
            <span class="min-w-0 flex-1 truncate text-[13px] text-fg">{{ member.username }}</span>
            <Badge :variant="member.role === 'invited' ? 'warn' : 'neutral'">{{ ROLE_LABEL[member.role] }}</Badge>
            <IconButton
              v-if="isSpaceOwner && member.role !== 'owner'"
              size="sm"
              variant="danger"
              :label="member.role === 'invited' ? 'Cancel invite' : 'Remove member'"
              @click="remove(member)"
            >
              <TrashIcon />
            </IconButton>
          </li>
        </ul>

        <form v-if="isSpaceOwner" class="flex items-end gap-2" @submit.prevent>
          <Input
            v-model="inviteName"
            label="Invite by username"
            placeholder="username"
            class="flex-1"
            autocomplete="off"
            :hint="seatsFull ? 'This space is full.' : 'They have to accept before they can see anything.'"
          />
          <Button type="submit" variant="primary" :click="invite" message="Inviting" :disabled="seatsFull">
            <UserPlusIcon class="h-4 w-4" />Invite
          </Button>
        </form>
      </section>

      <Divider />

      <!-- Leaving -->
      <section v-if="!isSpaceOwner">
        <h3 class="text-sm font-medium text-fg">Leave this space</h3>
        <p class="mt-0.5 text-sm text-muted">Clips you added stay here for everyone else.</p>
        <Button class="mt-3" variant="danger" size="sm" :click="leave" message="Leaving">
          <ArrowRightStartOnRectangleIcon class="h-4 w-4" />Leave space
        </Button>
      </section>

      <section v-else class="space-y-3">
        <div>
          <h3 class="text-sm font-medium text-fg">Delete this space</h3>
          <p class="mt-0.5 text-sm text-muted">
            Everything in it goes: clips, folders, files and everyone's access. Type
            <span class="font-medium text-fg">{{ space.name }}</span> to confirm.
          </p>
        </div>
        <form class="flex items-end gap-2" @submit.prevent>
          <Input v-model="deleteName" placeholder="Space name" class="flex-1" autocomplete="off" />
          <Button variant="danger" type="submit" :click="destroy" message="Deleting" :disabled="deleteName !== space.name">
            Delete
          </Button>
        </form>
      </section>
    </div>
  </Dialog>
</template>
