<script setup lang="ts">
/**
 * Shared modal. Focus trap, Esc and overlay click close it, scroll lock, and a
 * consistent header / body / footer. Sized by `size`.
 */
import {
  Dialog as HDialog,
  DialogDescription,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot
} from "@headlessui/vue";
import { XMarkIcon } from "@heroicons/vue/20/solid";
import type { PropType } from "vue";

type Size = "sm" | "md" | "lg" | "xl";

defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  size: { type: String as PropType<Size>, default: "md" },
  // Body without padding, for previews and lists that manage their own spacing.
  flush: { type: Boolean, default: false },
  // Set false while an operation is running so the dialog can't be dismissed.
  dismissable: { type: Boolean, default: true },
  initialFocus: { type: Object as PropType<HTMLElement | null>, default: null }
});

const emit = defineEmits<{ (e: "close"): void }>();

const SIZES: Record<Size, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl"
};

function onClose() {
  emit("close");
}
</script>

<template>
  <TransitionRoot :show="open" as="template" appear>
    <HDialog class="relative z-50" :initial-focus="initialFocus || undefined" @close="dismissable && onClose()">
      <TransitionChild
        as="template"
        enter="ease-out duration-150"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-100"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px] dark:bg-black/60" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
          <TransitionChild
            as="template"
            enter="ease-out duration-150"
            enter-from="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-[.98]"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-100"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-[.98]"
          >
            <DialogPanel
              :class="[
                'flex w-full max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-xl border border-line bg-surface text-left shadow-pop',
                SIZES[size]
              ]"
            >
              <header v-if="title || $slots.header" class="flex items-start gap-3 border-b border-line px-5 py-4">
                <div class="min-w-0 flex-1">
                  <slot name="header">
                    <DialogTitle class="text-[15px] font-semibold text-fg">{{ title }}</DialogTitle>
                    <DialogDescription v-if="description" class="mt-0.5 text-sm text-muted">{{ description }}</DialogDescription>
                  </slot>
                </div>
                <button
                  v-if="dismissable"
                  type="button"
                  class="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-fg"
                  aria-label="Close"
                  @click="onClose"
                >
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </header>

              <div :class="['min-h-0 flex-1 overflow-y-auto scroll-thin', flush ? '' : 'px-5 py-4']">
                <slot />
              </div>

              <footer v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-sunken/60 px-5 py-3">
                <slot name="footer" />
              </footer>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </HDialog>
  </TransitionRoot>
</template>
