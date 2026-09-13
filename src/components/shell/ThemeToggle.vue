<script setup lang="ts">
import { MoonIcon, SunIcon } from "@heroicons/vue/20/solid";
import { isDark, toggleTheme } from "../../stores/theme.store";
import IconButton from "../ui/IconButton.vue";
</script>

<template>
  <IconButton :label="isDark ? 'Switch to light theme' : 'Switch to dark theme'" size="sm" @click="toggleTheme">
    <SunIcon v-if="isDark" />
    <MoonIcon v-else />
  </IconButton>
</template>
