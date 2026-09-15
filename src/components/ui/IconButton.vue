<script setup lang="ts">
/** Square button holding a single icon. `label` is required for screen readers and the tooltip. */
import { computed, type PropType } from "vue";
import type { RouteLocationRaw } from "vue-router";

type Variant = "ghost" | "subtle" | "primary" | "danger";
type Size = "sm" | "md";

const props = defineProps({
  label: { type: String, required: true },
  variant: { type: String as PropType<Variant>, default: "ghost" },
  size: { type: String as PropType<Size>, default: "md" },
  click: { type: Function as PropType<(...args: any[]) => any>, default: undefined },
  data: { type: null as unknown as PropType<any>, default: undefined },
  to: { type: [String, Object] as PropType<RouteLocationRaw>, default: undefined },
  href: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  active: { type: Boolean, default: false }
});

const VARIANTS: Record<Variant, string> = {
  ghost: "text-muted hover:text-fg hover:bg-raised",
  subtle: "text-muted bg-surface border border-line hover:text-fg hover:border-line-strong",
  primary: "text-accent hover:bg-accent-soft",
  danger: "text-muted hover:text-danger hover:bg-danger-soft"
};

const classes = computed(() => [
  "inline-flex items-center justify-center rounded-md transition-colors shrink-0 [&>svg]:shrink-0",
  props.size === "sm" ? "h-7 w-7 [&>svg]:h-4 [&>svg]:w-4" : "h-8 w-8 [&>svg]:h-[18px] [&>svg]:w-[18px]",
  VARIANTS[props.variant],
  props.active ? "bg-accent-soft text-accent" : ""
]);
</script>

<template>
  <LoadingButton
    v-if="click"
    :click="click"
    :data="data"
    :message="false"
    icon="spinner"
    :disabled="disabled || undefined"
    :class="classes"
    :title="label"
    :aria-label="label"
  >
    <slot />
  </LoadingButton>
  <RouterLink v-else-if="to" :to="to" :class="classes" :title="label" :aria-label="label">
    <slot />
  </RouterLink>
  <a v-else-if="href" :href="href" target="_blank" rel="noopener" :class="classes" :title="label" :aria-label="label">
    <slot />
  </a>
  <button v-else type="button" :disabled="disabled" :class="classes" :title="label" :aria-label="label">
    <slot />
  </button>
</template>
