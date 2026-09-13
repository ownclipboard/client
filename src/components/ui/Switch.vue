<script setup lang="ts">
import { Switch, SwitchGroup, SwitchLabel } from "@headlessui/vue";

defineProps({
  modelValue: { type: Boolean, required: true },
  label: { type: String, default: "" },
  description: { type: String, default: "" },
  disabled: { type: Boolean, default: false }
});
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();
</script>

<template>
  <SwitchGroup as="div" class="flex items-start justify-between gap-4">
    <div v-if="label">
      <SwitchLabel class="block text-sm font-medium text-fg">{{ label }}</SwitchLabel>
      <p v-if="description" class="mt-0.5 text-sm text-muted">{{ description }}</p>
    </div>
    <Switch
      :model-value="modelValue"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
      :class="[
        modelValue ? 'bg-accent' : 'bg-line-strong',
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors'
      ]"
    >
      <span
        aria-hidden="true"
        :class="[
          modelValue ? 'translate-x-5' : 'translate-x-0',
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition'
        ]"
      />
    </Switch>
  </SwitchGroup>
</template>
