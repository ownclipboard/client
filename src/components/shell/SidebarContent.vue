<script setup lang="ts">
import { Cog6ToothIcon, CreditCardIcon, CpuChipIcon } from "@heroicons/vue/20/solid";
import { useAuthUser } from "../../stores/auth.store";
import Brand from "./Brand.vue";
import FolderNav from "./FolderNav.vue";
import UserMenu from "./UserMenu.vue";
import Badge from "../ui/Badge.vue";

const emit = defineEmits<{ (e: "navigate"): void }>();
const authUser = useAuthUser();

const links = [
  { name: "Devices", route: { name: "devices" }, icon: CpuChipIcon },
  { name: "Settings", route: { name: "settings" }, icon: Cog6ToothIcon },
  { name: "Plan", route: { name: "pricing" }, icon: CreditCardIcon }
];
</script>

<template>
  <div class="flex h-full flex-col gap-4 p-3">
    <Brand />

    <FolderNav @navigate="emit('navigate')" />

    <nav aria-label="Account" class="flex flex-col gap-0.5">
      <span class="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-faint">Account</span>
      <RouterLink v-for="link in links" :key="link.name" :to="link.route" custom v-slot="{ isActive, href, navigate }">
        <a
          :href="href"
          :class="[
            'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
            isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-raised hover:text-fg'
          ]"
          @click="navigate($event); emit('navigate')"
        >
          <component :is="link.icon" class="h-4 w-4 opacity-80" />
          <span :class="['flex-1', isActive ? 'font-medium text-fg' : 'text-fg/90']">{{ link.name }}</span>
          <Badge v-if="link.name === 'Plan' && authUser.data?.plan" :variant="authUser.data.plan === 'pro' ? 'accent' : 'neutral'" uppercase>
            {{ authUser.data.plan }}
          </Badge>
        </a>
      </RouterLink>
    </nav>

    <div class="mt-auto border-t border-line pt-3">
      <UserMenu />
    </div>
  </div>
</template>
