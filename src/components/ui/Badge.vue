<script setup lang="ts">
import type { PropType } from "vue";

type Variant = "neutral" | "accent" | "warn" | "danger" | "info" | "outline";

defineProps({
  variant: { type: String as PropType<Variant>, default: "neutral" },
  uppercase: { type: Boolean, default: false }
});

const VARIANTS: Record<Variant, string> = {
  neutral: "bg-raised text-muted border-line",
  outline: "bg-transparent text-faint border-line",
  accent: "bg-accent-soft text-accent border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent"
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded border px-1.5 py-px text-[11px] font-medium leading-4 whitespace-nowrap',
      uppercase ? 'uppercase tracking-wide' : '',
      VARIANTS[variant]
    ]"
  >
    <slot />
  </span>
</template>
