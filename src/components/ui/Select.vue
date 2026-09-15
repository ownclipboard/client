<script setup lang="ts">
import { ChevronUpDownIcon } from "@heroicons/vue/20/solid";

defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: { type: String, default: "" }
});
const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-[13px] font-medium text-fg">{{ label }}</span>
    <span class="relative block">
      <select
        :value="modelValue"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        class="block h-9 w-full appearance-none rounded-md border border-line bg-surface pl-3 pr-8 text-sm text-fg hover:border-line-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <slot />
      </select>
      <ChevronUpDownIcon class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
    </span>
  </label>
</template>
