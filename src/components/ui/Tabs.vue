<script setup lang="ts">
/**
 * Underlined tab bar. A tab with `to` is a link, for sections that are pages of
 * their own; without one it is a button and the caller tracks `modelValue`.
 */
import type { PropType } from "vue";
import { RouterLink, type RouteLocationRaw } from "vue-router";

export type TabItem = {
  key: string;
  label: string;
  icon?: any;
  to?: RouteLocationRaw;
};

defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array as PropType<TabItem[]>, required: true },
  /** Describes the group for screen readers, e.g. "Settings sections". */
  label: { type: String, default: "Sections" }
});

const emit = defineEmits<{ (e: "update:modelValue", key: string): void }>();

/** Links are navigation, so they say `aria-current` rather than play at tabs. */
function attrsFor(tab: TabItem, active: boolean) {
  return tab.to
    ? { to: tab.to, "aria-current": active ? "page" : undefined }
    : { type: "button", role: "tab", "aria-selected": active };
}
</script>

<template>
  <div class="border-b border-line">
    <nav class="scroll-thin -mb-px flex gap-1 overflow-x-auto" :aria-label="label">
      <component
        :is="tab.to ? RouterLink : 'button'"
        v-for="tab in tabs"
        :key="tab.key"
        v-bind="attrsFor(tab, modelValue === tab.key)"
        :class="[
          'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
          modelValue === tab.key
            ? 'border-accent text-fg'
            : 'border-transparent text-muted hover:border-line-strong hover:text-fg'
        ]"
        @click="!tab.to && emit('update:modelValue', tab.key)"
      >
        <component
          :is="tab.icon"
          v-if="tab.icon"
          :class="['h-4 w-4', modelValue === tab.key ? 'text-accent' : 'text-faint']"
        />
        {{ tab.label }}
      </component>
    </nav>
  </div>
</template>
