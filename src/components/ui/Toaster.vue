<script setup lang="ts">
/** Renders the alerts from ws-alert.ts as stacked toasts. */
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from "@heroicons/vue/20/solid";
import { Alerts, closeAlert } from "../ws-alert/ws-alert";

const ICONS: Record<string, any> = {
  success: CheckCircleIcon,
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon
};

const COLORS: Record<string, string> = {
  success: "text-accent",
  info: "text-info",
  warning: "text-warn",
  error: "text-danger"
};
</script>

<template>
  <div class="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4" aria-live="polite">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="a in Alerts"
        :key="a.id"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-raised px-3.5 py-3 text-sm shadow-pop"
        role="status"
      >
        <component :is="ICONS[a.type] || InformationCircleIcon" :class="['mt-px h-5 w-5 shrink-0', COLORS[a.type]]" />
        <div class="min-w-0 flex-1 text-fg" v-html="a.message"></div>
        <button type="button" class="-mr-1 -mt-0.5 rounded p-1 text-faint hover:text-fg" aria-label="Dismiss" @click="closeAlert(a.id)">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
