<script setup lang="ts">
defineProps({ size: { type: String as () => "sm" | "md" | "lg", default: "md" } });
const SIZES = { sm: "h-4 w-4 border-2", md: "h-5 w-5 border-2", lg: "h-8 w-8 border-[3px]" };
</script>

<template>
  <span
    role="status"
    aria-label="Loading"
    :class="['inline-block animate-spin rounded-full border-current border-r-transparent', SIZES[size]]"
  ></span>
</template>
