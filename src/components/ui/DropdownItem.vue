<script setup lang="ts">
import { MenuItem } from "@headlessui/vue";
import type { PropType } from "vue";
import type { RouteLocationRaw } from "vue-router";

defineProps({
  to: { type: [String, Object] as PropType<RouteLocationRaw>, default: undefined },
  danger: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  hint: { type: String, default: "" }
});
</script>

<template>
  <MenuItem v-slot="{ active }" :disabled="disabled">
    <component
      :is="to ? 'RouterLink' : 'button'"
      :to="to"
      :type="to ? undefined : 'button'"
      :class="[
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors',
        '[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0',
        danger ? 'text-danger' : 'text-fg',
        active ? (danger ? 'bg-danger-soft' : 'bg-accent-soft/70') : '',
        disabled ? 'opacity-50' : ''
      ]"
    >
      <slot name="icon" />
      <span class="flex-1 truncate"><slot /></span>
      <span v-if="hint" class="text-[11px] text-faint">{{ hint }}</span>
    </component>
  </MenuItem>
</template>
