<script setup lang="ts">
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: "" }
});
</script>

<template>
  <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-fg">{{ title }}</h1>
      <p v-if="description" class="mt-1 max-w-2xl text-sm text-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="flex items-center gap-2">
      <slot />
    </div>
  </header>
</template>
