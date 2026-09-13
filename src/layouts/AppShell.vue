<script setup lang="ts">
/**
 * Authenticated app frame: fixed sidebar on desktop, slide-over drawer on
 * mobile, and the page in the middle. Global dialogs are mounted once here.
 */
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from "@headlessui/vue";
import { Bars3Icon, XMarkIcon } from "@heroicons/vue/24/outline";
import SidebarContent from "../components/shell/SidebarContent.vue";
import Brand from "../components/shell/Brand.vue";
import ThemeToggle from "../components/shell/ThemeToggle.vue";

const drawerOpen = ref(false);
const $route = useRoute();
watch(() => $route.fullPath, () => (drawerOpen.value = false));
</script>

<template>
  <div class="min-h-screen bg-bg lg:pl-60">
    <!-- Desktop sidebar -->
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-surface lg:block">
      <SidebarContent />
    </aside>

    <!-- Mobile drawer -->
    <TransitionRoot :show="drawerOpen" as="template">
      <Dialog class="relative z-40 lg:hidden" @close="drawerOpen = false">
        <TransitionChild as="template" enter="duration-150 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-100 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/40" aria-hidden="true" />
        </TransitionChild>
        <TransitionChild as="template" enter="duration-200 ease-out" enter-from="-translate-x-full" enter-to="translate-x-0" leave="duration-150 ease-in" leave-from="translate-x-0" leave-to="-translate-x-full">
          <DialogPanel class="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-pop">
            <button
              type="button"
              class="absolute right-2 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-raised"
              aria-label="Close menu"
              @click="drawerOpen = false"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
            <SidebarContent @navigate="drawerOpen = false" />
          </DialogPanel>
        </TransitionChild>
      </Dialog>
    </TransitionRoot>

    <!-- Mobile top bar -->
    <header class="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur lg:hidden">
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-raised"
        aria-label="Open menu"
        @click="drawerOpen = true"
      >
        <Bars3Icon class="h-6 w-6" />
      </button>
      <Brand />
      <div class="ml-auto"><ThemeToggle /></div>
    </header>

    <slot name="banner" />

    <main class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <slot />
    </main>
  </div>
</template>
