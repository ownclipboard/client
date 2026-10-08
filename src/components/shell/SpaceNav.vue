<script setup lang="ts">
/** Spaces in the sidebar, with a count of invites still waiting for an answer. */
import { useRoute } from "vue-router";
import { PlusIcon, UserGroupIcon } from "@heroicons/vue/20/solid";
import { invites, spaces, spacesLoaded } from "../../stores/spaces.store";
import Skeleton from "../ui/Skeleton.vue";
import Badge from "../ui/Badge.vue";

const emit = defineEmits<{ (e: "navigate"): void }>();
const $route = useRoute();

function isOpen(publicId: string) {
  return $route.name === "space" && $route.params.spaceId === publicId;
}
</script>

<template>
  <nav aria-label="Spaces" class="flex flex-col gap-0.5">
    <div class="mb-1 flex items-center justify-between px-2">
      <RouterLink
        :to="{ name: 'spaces' }"
        class="text-[11px] font-medium uppercase tracking-wider text-faint hover:text-fg"
        @click="emit('navigate')"
      >
        Spaces
      </RouterLink>
      <RouterLink
        :to="{ name: 'spaces' }"
        class="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-raised hover:text-fg"
        title="New space"
        aria-label="New space"
        @click="emit('navigate')"
      >
        <PlusIcon class="h-4 w-4" />
      </RouterLink>
    </div>

    <Skeleton v-if="!spacesLoaded" class="mx-2 my-1 h-7" />

    <RouterLink
      v-if="invites.length"
      :to="{ name: 'spaces' }"
      class="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-warn hover:bg-raised"
      @click="emit('navigate')"
    >
      <span class="flex-1 truncate">{{ invites.length }} {{ invites.length === 1 ? "invitation" : "invitations" }}</span>
      <Badge variant="warn">New</Badge>
    </RouterLink>

    <RouterLink
      v-for="space in spaces"
      :key="space.publicId"
      :to="{ name: 'space', params: { spaceId: space.publicId } }"
      :class="[
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
        isOpen(space.publicId) ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-raised hover:text-fg'
      ]"
      @click="emit('navigate')"
    >
      <UserGroupIcon class="h-4 w-4 shrink-0 opacity-80" />
      <span :class="['flex-1 truncate', isOpen(space.publicId) ? 'font-medium text-fg' : 'text-fg/90']">{{ space.name }}</span>
      <span class="font-mono text-[11px] tabular-nums opacity-70">{{ space.members }}</span>
    </RouterLink>

    <p v-if="spacesLoaded && !spaces.length && !invites.length" class="px-2 py-1 text-[11px] text-faint">
      Share a clipboard with other people.
    </p>
  </nav>
</template>
