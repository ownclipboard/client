<script setup lang="ts">
/** Split layout for the sign-in and sign-up pages: brand panel left, form right. */
import { ClipboardDocumentIcon, DevicePhoneMobileIcon, LockClosedIcon, ServerStackIcon } from "@heroicons/vue/24/outline";
import config from "../config";
import ThemeToggle from "../components/shell/ThemeToggle.vue";

const points = [
  { icon: ClipboardDocumentIcon, text: "Paste on one device, copy on another." },
  { icon: LockClosedIcon, text: "Encrypted folders, locked in your browser." },
  { icon: ServerStackIcon, text: "Files go to storage you own." },
  { icon: DevicePhoneMobileIcon, text: "Web, mobile app and browser extension." }
];
</script>

<template>
  <div class="grid min-h-screen bg-bg lg:grid-cols-[1.1fr_1fr]">
    <section class="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex">
      <div class="flex items-center gap-2 text-fg">
        <img src="/logo.png" alt="" class="h-7 w-7 invert dark:invert-0" />
        <span class="text-[15px] font-semibold tracking-tight">{{ config.name }}</span>
      </div>

      <div class="max-w-md">
        <h1 class="text-4xl font-semibold leading-tight tracking-tight text-fg [text-wrap:balance]">
          Your clipboard, on every device you own.
        </h1>
        <p class="mt-4 text-[15px] leading-relaxed text-muted">
          Create, copy, paste or send text and files across devices. Keep sensitive clips in encrypted folders that only your password can open.
        </p>
        <ul class="mt-8 space-y-3">
          <li v-for="p in points" :key="p.text" class="flex items-center gap-3 text-sm text-fg/90">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
              <component :is="p.icon" class="h-4 w-4" />
            </span>
            {{ p.text }}
          </li>
        </ul>
      </div>

      <p class="font-mono text-xs text-faint">Open source · self-hostable</p>
      <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" aria-hidden="true"></div>
    </section>

    <section class="flex flex-col p-6 sm:p-10">
      <div class="flex items-center justify-between lg:justify-end">
        <div class="flex items-center gap-2 text-fg lg:hidden">
          <img src="/logo.png" alt="" class="h-6 w-6 invert dark:invert-0" />
          <span class="text-[15px] font-semibold tracking-tight">{{ config.name }}</span>
        </div>
        <ThemeToggle />
      </div>

      <div class="flex flex-1 items-center">
        <div class="mx-auto w-full max-w-sm lg:mx-0 lg:ml-12">
          <slot />
        </div>
      </div>
    </section>
  </div>
</template>
