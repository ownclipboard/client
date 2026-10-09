<script setup lang="ts">
/** Free against Pro, feature by feature. Used signed in and signed out. */
import { CheckIcon, XMarkIcon } from "@heroicons/vue/20/solid";
import { PLAN_ROWS, planRowLines } from "../../data/plans";

defineProps<{
  /** Shows the link to the storage walkthrough, which only the signed-in page can open. */
  withGuideLink?: boolean;
}>();

const emit = defineEmits<{ (e: "guide"): void }>();
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-line bg-surface">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-[11px] uppercase tracking-wider text-faint">
          <th class="px-5 py-3 font-medium">Feature</th>
          <th class="w-28 px-3 py-3 font-medium">Free</th>
          <th class="w-28 px-3 py-3 font-medium text-accent">Pro</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line">
        <tr v-for="item in PLAN_ROWS" :key="item.feature">
          <td class="px-5 py-3">
            <div class="flex items-center gap-3">
              <component :is="item.icon" class="h-4 w-4 shrink-0 text-faint" />
              <div>
                <div class="text-fg">{{ item.feature }}</div>
                <div v-for="line in planRowLines(item)" :key="line" class="text-xs text-muted">{{ line }}</div>
                <button
                  v-if="item.guide && withGuideLink"
                  type="button"
                  class="mt-0.5 text-xs font-medium text-accent underline underline-offset-2"
                  @click="emit('guide')"
                >
                  How to connect your own storage
                </button>
              </div>
            </div>
          </td>
          <td v-for="col in (['free', 'pro'] as const)" :key="col" class="px-3 py-3">
            <span v-if="typeof item[col] === 'string'" class="text-fg">{{ item[col] }}</span>
            <CheckIcon v-else-if="item[col]" class="h-4 w-4 text-accent" aria-label="Included" />
            <XMarkIcon v-else class="h-4 w-4 text-faint" aria-label="Not included" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
