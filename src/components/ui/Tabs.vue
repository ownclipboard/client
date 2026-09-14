<script setup lang="ts">
/**
 * Underlined tab bar. The selected tab is held by the caller, usually mirrored
 * into the route so a tab can be linked to directly.
 */
import type { PropType } from "vue";

export type TabItem = {
  key: string;
  label: string;
  icon?: any;
};

defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array as PropType<TabItem[]>, required: true },
  /** Describes the group for screen readers, e.g. "Settings sections". */
  label: { type: String, default: "Sections" }
});

const emit = defineEmits<{ (e: "update:modelValue", key: string): void }>();
</script>

<template>
  <div class="border-b border-line">
    <nav class="scroll-thin -mb-px flex gap-1 overflow-x-auto" :aria-label="label">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="modelValue === tab.key"
        :class="[
          'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
          modelValue === tab.key
            ? 'border-accent text-fg'
            : 'border-transparent text-muted hover:border-line-strong hover:text-fg'
        ]"
        @click="emit('update:modelValue', tab.key)"
      >
        <component
          :is="tab.icon"
          v-if="tab.icon"
          :class="['h-4 w-4', modelValue === tab.key ? 'text-accent' : 'text-faint']"
        />
        {{ tab.label }}
      </button>
    </nav>
  </div>
</template>
