<script setup lang="ts">
defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  padded: { type: Boolean, default: true }
});
</script>

<template>
  <section class="rounded-lg border border-line bg-surface shadow-card">
    <header v-if="title || $slots.header" class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 class="text-[15px] font-semibold text-fg">{{ title }}</h2>
        <p v-if="description" class="mt-0.5 text-sm text-muted">{{ description }}</p>
      </div>
      <slot name="header" />
    </header>
    <div :class="padded ? 'px-5 py-4' : ''">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
      <slot name="footer" />
    </footer>
  </section>
</template>
