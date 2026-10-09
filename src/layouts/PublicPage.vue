<script setup lang="ts">
/**
 * Frame for the pages that have to work signed out: the privacy policy, the
 * terms, support and the public plan comparison. App stores check these, so
 * they stay reachable without an account.
 */
import config from "../config";
import ThemeToggle from "../components/shell/ThemeToggle.vue";

defineProps<{ title: string; description?: string; updated?: string }>();

const year = new Date().getFullYear();
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bg">
    <header class="flex h-14 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
      <RouterLink :to="{ name: 'index' }" class="flex items-center gap-2 text-fg">
        <img src="/logo.png" alt="" class="h-6 w-6 invert dark:invert-0" />
        <span class="text-[15px] font-semibold tracking-tight">{{ config.name }}</span>
      </RouterLink>
      <ThemeToggle />
    </header>

    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 class="text-2xl font-semibold tracking-tight text-fg">{{ title }}</h1>
      <p v-if="description" class="mt-2 text-sm text-muted">{{ description }}</p>
      <p v-if="updated" class="mt-1 text-xs text-faint">Last updated {{ updated }}</p>

      <div class="mt-8">
        <slot />
      </div>
    </main>

    <footer class="border-t border-line bg-surface px-4 py-6 sm:px-6">
      <div class="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span class="text-faint">© {{ year }} {{ config.name }}</span>
        <RouterLink :to="{ name: 'privacy' }" class="hover:text-fg">Privacy</RouterLink>
        <RouterLink :to="{ name: 'terms' }" class="hover:text-fg">Terms</RouterLink>
        <RouterLink :to="{ name: 'support' }" class="hover:text-fg">Support</RouterLink>
        <RouterLink :to="{ name: 'public-pricing' }" class="hover:text-fg">Plans</RouterLink>
        <RouterLink :to="{ name: 'index' }" class="ml-auto font-medium text-accent hover:underline">Sign in</RouterLink>
      </div>
    </footer>
  </div>
</template>
