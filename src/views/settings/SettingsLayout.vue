<script setup lang="ts">
/**
 * Settings is a page per section. The tabs are links, so a section can be
 * bookmarked, linked to and opened in its own tab like any other page.
 */
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ServerStackIcon, ShieldCheckIcon, SignalIcon, SwatchIcon, UserCircleIcon } from "@heroicons/vue/20/solid";
import PageHeader from "../../components/ui/PageHeader.vue";
import Tabs, { type TabItem } from "../../components/ui/Tabs.vue";

const $route = useRoute();

// The key is the route name, which is what marks the open section.
const TABS: TabItem[] = [
  { key: "settings.appearance", label: "Appearance", icon: SwatchIcon, to: { name: "settings.appearance" } },
  { key: "settings.storage", label: "Storage", icon: ServerStackIcon, to: { name: "settings.storage" } },
  { key: "settings.account", label: "Account", icon: UserCircleIcon, to: { name: "settings.account" } },
  { key: "settings.security", label: "Security", icon: ShieldCheckIcon, to: { name: "settings.security" } },
  { key: "settings.sessions", label: "Sessions", icon: SignalIcon, to: { name: "settings.sessions" } }
];

const open = computed(() => String($route.name ?? ""));
</script>

<template>
  <div class="max-w-3xl space-y-5">
    <PageHeader title="Settings" />

    <Tabs :model-value="open" :tabs="TABS" label="Settings sections" />

    <router-view />
  </div>
</template>
