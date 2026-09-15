<script setup lang="ts">
import { computed, ref, useAttrs } from "vue";

defineOptions({ inheritAttrs: false });

defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  mono: { type: Boolean, default: true },
  rows: { type: Number, default: 6 }
});

const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();
const attrs = useAttrs();
// `class` and `style` apply to the wrapper so callers can lay the field out; the rest goes to the field.
const wrapperAttrs = computed(() => ({ class: attrs.class, style: attrs.style }));
const fieldAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});
const el = ref<HTMLTextAreaElement>();
const id = computed(() => (attrs.id as string) || `ta-${Math.random().toString(36).slice(2, 8)}`);

defineExpose({ focus: () => el.value?.focus() });
</script>

<template>
  <div v-bind="wrapperAttrs">
    <label v-if="label" :for="id" class="mb-1.5 block text-[13px] font-medium text-fg">{{ label }}</label>
    <textarea
      ref="el"
      v-bind="fieldAttrs"
      :id="id"
      :rows="rows"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      :class="[
        'block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-fg placeholder:text-faint',
        'hover:border-line-strong focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-0',
        mono ? 'font-mono text-[13px]' : ''
      ]"
    ></textarea>
    <p v-if="hint" class="mt-1.5 text-xs text-muted">{{ hint }}</p>
  </div>
</template>
