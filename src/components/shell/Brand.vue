<script setup lang="ts">
import config from "../../config";
defineProps({ compact: { type: Boolean, default: false } });
</script>

<template>
  <RouterLink :to="{ name: 'clipboard' }" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-fg">
    <img src="/logo.png" alt="" class="h-6 w-6 dark:invert-0 invert" />
    <span v-if="!compact" class="text-[15px] font-semibold tracking-tight">{{ config.name }}</span>
  </RouterLink>
</template>
