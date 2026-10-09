<script setup lang="ts">
/**
 * Plans, readable without an account. App stores follow the link from inside
 * the mobile app, and a reviewer should not meet a sign-in form.
 */
import { CheckIcon } from "@heroicons/vue/20/solid";
import PublicPage from "../layouts/PublicPage.vue";
import PlanComparison from "../components/pricing/PlanComparison.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import { MONTHLY_PRICE, PLAN_FAQ, YEARLY_PRICE } from "../data/plans";

const FREE_POINTS = [
  "Unlimited clips across every device",
  "Encrypted folders only your password opens",
  "Files in storage you own",
  "Three connected devices"
];

const PRO_POINTS = [
  "Everything in Free",
  "File storage we host for you",
  "Edit clips after saving",
  "Copy between folders, and share",
  "Unlimited devices and spaces"
];
</script>

<template>
  <PublicPage title="Plans" description="One paid plan, and a free one that does most of it.">
    <div class="space-y-8">
      <div class="grid gap-4 sm:grid-cols-2">
        <section class="flex flex-col rounded-lg border border-line bg-surface p-5">
          <h2 class="text-[15px] font-semibold text-fg">Free</h2>
          <p class="mt-1 text-3xl font-semibold tracking-tight text-fg">$0</p>
          <p class="mt-1 text-sm text-muted">Everything you need for your own clipboard.</p>
          <ul class="mt-4 flex-1 space-y-2 text-[13px] text-muted">
            <li v-for="point in FREE_POINTS" :key="point" class="flex gap-2">
              <CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-accent" />{{ point }}
            </li>
          </ul>
          <Button class="mt-5" :to="{ name: 'signup' }" block>Create an account</Button>
        </section>

        <section class="flex flex-col rounded-lg border border-accent/40 bg-surface p-5 ring-4 ring-accent/10">
          <div class="flex items-center gap-2">
            <h2 class="text-[15px] font-semibold text-fg">Pro</h2>
            <Badge variant="accent" uppercase>Best value</Badge>
          </div>
          <p class="mt-1">
            <span class="text-3xl font-semibold tracking-tight text-fg">${{ YEARLY_PRICE }}</span>
            <span class="ml-1 text-sm text-muted">/ year</span>
          </p>
          <p class="mt-1 text-sm text-muted">Works out at about ${{ MONTHLY_PRICE }} a month, paid yearly.</p>
          <ul class="mt-4 flex-1 space-y-2 text-[13px] text-muted">
            <li v-for="point in PRO_POINTS" :key="point" class="flex gap-2">
              <CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-accent" />{{ point }}
            </li>
          </ul>
          <Button class="mt-5" variant="primary" :to="{ name: 'signup' }" block>Get started</Button>
          <p class="mt-2 text-center text-xs text-faint">Sign in and choose Pro from your plan page.</p>
        </section>
      </div>

      <PlanComparison />

      <section class="grid gap-6 sm:grid-cols-3">
        <div v-for="item in PLAN_FAQ" :key="item.question">
          <h3 class="text-sm font-medium text-fg">{{ item.question }}</h3>
          <p class="mt-1 text-sm text-muted">{{ item.answer }}</p>
        </div>
      </section>

      <p class="text-sm text-muted">
        Already have an account?
        <RouterLink :to="{ name: 'index' }" class="font-medium text-accent underline underline-offset-2">Sign in</RouterLink>
        to manage your plan.
      </p>
    </div>
  </PublicPage>
</template>
