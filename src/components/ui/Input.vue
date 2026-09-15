<script setup lang="ts">
import { computed, ref, useAttrs } from "vue";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  error: { type: String, default: "" },
  mono: { type: Boolean, default: false },
  size: { type: String as () => "sm" | "md" | "lg", default: "md" }
});

const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();
const attrs = useAttrs();
// `class` and `style` apply to the wrapper so callers can lay the field out; the rest goes to the field.
const wrapperAttrs = computed(() => ({ class: attrs.class, style: attrs.style }));
const fieldAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});
const input = ref<HTMLInputElement>();
const id = computed(() => (attrs.id as string) || `in-${Math.random().toString(36).slice(2, 8)}`);

const SIZES = { sm: "h-8 px-2.5 text-[13px]", md: "h-9 px-3 text-sm", lg: "h-11 px-3.5 text-[15px]" };

defineExpose({ focus: () => input.value?.focus(), select: () => input.value?.select() });
</script>

<template>
  <div v-bind="wrapperAttrs">
    <label v-if="label" :for="id" class="mb-1.5 block text-[13px] font-medium text-fg">{{ label }}</label>
    <div class="relative">
      <div v-if="$slots.leading" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-faint [&>svg]:h-4 [&>svg]:w-4">
        <slot name="leading" />
      </div>
      <input
        ref="input"
        v-bind="fieldAttrs"
        :id="id"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :class="[
          'block w-full rounded-md border bg-surface text-fg placeholder:text-faint transition-colors',
          'focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-0',
          error ? 'border-danger' : 'border-line hover:border-line-strong',
          mono ? 'font-mono' : '',
          $slots.leading ? 'pl-8' : '',
          $slots.trailing ? 'pr-9' : '',
          SIZES[size]
        ]"
      />
      <div v-if="$slots.trailing" class="absolute inset-y-0 right-0 flex items-center pr-1.5">
        <slot name="trailing" />
      </div>
    </div>
    <p v-if="error" class="mt-1.5 text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-muted">{{ hint }}</p>
  </div>
</template>
