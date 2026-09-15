<script setup lang="ts">
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: "" }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-14 text-center">
    <div v-if="$slots.icon" class="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-raised text-faint [&>svg]:h-5 [&>svg]:w-5">
      <slot name="icon" />
    </div>
    <h3 class="text-[15px] font-medium text-fg">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4 flex items-center gap-2">
      <slot />
    </div>
  </div>
</template>
