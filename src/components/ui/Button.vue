<script setup lang="ts">
/**
 * The one button. Renders a LoadingButton when `click` is given (keeps the
 * existing `click(btn, data)` / `btn.stopLoading()` contract), a RouterLink
 * when `to` is given, an anchor when `href` is given, otherwise a plain button.
 */
import { computed, type PropType } from "vue";
import type { RouteLocationRaw } from "vue-router";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "xs" | "sm" | "md" | "lg";

const props = defineProps({
  variant: { type: String as PropType<Variant>, default: "secondary" },
  size: { type: String as PropType<Size>, default: "md" },
  type: { type: String as PropType<"button" | "submit">, default: "button" },
  // LoadingButton contract
  click: { type: Function as PropType<(...args: any[]) => any>, default: undefined },
  data: { type: null as unknown as PropType<any>, default: undefined },
  message: { type: [String, Boolean], default: false },
  // Links
  to: { type: [String, Object] as PropType<RouteLocationRaw>, default: undefined },
  href: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false }
});

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg border-transparent hover:bg-accent-hover shadow-sm",
  secondary: "bg-surface text-fg border-line hover:bg-raised hover:border-line-strong shadow-sm",
  ghost: "bg-transparent text-muted border-transparent hover:bg-raised hover:text-fg",
  danger: "bg-surface text-danger border-line hover:bg-danger-soft hover:border-danger/40",
  link: "bg-transparent text-accent border-transparent hover:underline underline-offset-4 px-0"
};

const SIZES: Record<Size, string> = {
  xs: "h-7 px-2 text-xs gap-1",
  sm: "h-8 px-2.5 text-[13px] gap-1.5",
  md: "h-9 px-3 text-sm gap-1.5",
  lg: "h-11 px-4 text-[15px] gap-2"
};

const classes = computed(() => [
  "inline-flex items-center justify-center whitespace-nowrap rounded-md border font-medium select-none transition-colors",
  VARIANTS[props.variant],
  props.variant === "link" ? "h-auto" : SIZES[props.size],
  props.block ? "w-full" : ""
]);
</script>

<template>
  <LoadingButton
    v-if="click"
    :click="click"
    :data="data"
    :message="message"
    icon="spinner"
    :type="type"
    :disabled="disabled || undefined"
    :class="classes"
  >
    <slot />
  </LoadingButton>
  <RouterLink v-else-if="to" :to="to" :class="classes" :aria-disabled="disabled || undefined">
    <slot />
  </RouterLink>
  <a v-else-if="href" :href="href" :class="classes" target="_blank" rel="noopener">
    <slot />
  </a>
  <button v-else :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
