<script setup lang="ts">
import Button from "../components/ui/Button.vue";
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
    <p class="font-mono text-sm text-faint">404</p>
    <h1 class="text-2xl font-semibold tracking-tight text-fg">Nothing here</h1>
    <p class="max-w-sm text-sm text-muted">The page you were looking for doesn't exist or has moved.</p>
    <Button :to="{ name: 'clipboard' }" variant="primary">Go to your clipboard</Button>
  </div>
</template>
