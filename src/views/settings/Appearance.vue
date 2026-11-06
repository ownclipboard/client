<script setup lang="ts">
import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/vue/20/solid";
import { setTheme, themePreference, type ThemePreference } from "../../stores/theme.store";
import Card from "../../components/ui/Card.vue";

const themes: { value: ThemePreference; label: string; icon: any; hint: string }[] = [
  { value: "light", label: "Light", icon: SunIcon, hint: "Always light" },
  { value: "dark", label: "Dark", icon: MoonIcon, hint: "Always dark" },
  { value: "system", label: "System", icon: ComputerDesktopIcon, hint: "Follows your device" }
];
</script>

<template>
  <Card title="Appearance" description="Choose how the app looks on this device.">
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="t in themes"
        :key="t.value"
        type="button"
        :class="[
          'flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors',
          themePreference === t.value ? 'border-accent bg-accent-soft/60' : 'border-line hover:border-line-strong'
        ]"
        :aria-pressed="themePreference === t.value"
        @click="setTheme(t.value)"
      >
        <component :is="t.icon" :class="['h-4 w-4', themePreference === t.value ? 'text-accent' : 'text-faint']" />
        <span class="text-sm font-medium text-fg">{{ t.label }}</span>
        <span class="text-xs text-muted">{{ t.hint }}</span>
      </button>
    </div>
  </Card>
</template>
