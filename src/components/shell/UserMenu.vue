<script setup lang="ts">
import { ArrowRightStartOnRectangleIcon, ChevronUpDownIcon, Cog6ToothIcon, CpuChipIcon, CreditCardIcon, MoonIcon, SunIcon } from "@heroicons/vue/20/solid";
import { useAuthUser } from "../../stores/auth.store";
import { isDark, toggleTheme } from "../../stores/theme.store";
import DropdownMenu from "../ui/DropdownMenu.vue";
import DropdownItem from "../ui/DropdownItem.vue";
import Divider from "../ui/Divider.vue";
import Badge from "../ui/Badge.vue";

const authUser = useAuthUser();
</script>

<template>
  <DropdownMenu align="left" width="w-full" placement="top" block>
    <template #trigger>
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-raised"
        aria-label="Account menu"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-info text-[11px] font-semibold uppercase text-white">
          {{ authUser.data?.username?.slice(0, 2) }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[13px] font-medium text-fg">{{ authUser.data?.username }}</span>
          <span class="block truncate text-[11px] text-faint">{{ authUser.data?.email || (authUser.data?.plan ? `${authUser.data.plan} plan` : "No plan") }}</span>
        </span>
        <Badge v-if="authUser.data?.plan === 'pro'" variant="accent" uppercase>Pro</Badge>
        <ChevronUpDownIcon class="h-4 w-4 shrink-0 text-faint" />
      </button>
    </template>

    <DropdownItem :to="{ name: 'settings' }"><template #icon><Cog6ToothIcon /></template>Settings</DropdownItem>
    <DropdownItem :to="{ name: 'devices' }"><template #icon><CpuChipIcon /></template>Devices</DropdownItem>
    <DropdownItem :to="{ name: 'pricing' }"><template #icon><CreditCardIcon /></template>Plan and billing</DropdownItem>
    <DropdownItem @click="toggleTheme">
      <template #icon><SunIcon v-if="isDark" /><MoonIcon v-else /></template>
      {{ isDark ? "Light theme" : "Dark theme" }}
    </DropdownItem>
    <Divider />
    <DropdownItem danger @click="authUser.signOut"><template #icon><ArrowRightStartOnRectangleIcon /></template>Sign out</DropdownItem>
  </DropdownMenu>
</template>
