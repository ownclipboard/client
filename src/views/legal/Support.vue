<script setup lang="ts">
/** How to reach us, plus the answers that save most people the trouble. */
import { EnvelopeIcon, LifebuoyIcon } from "@heroicons/vue/20/solid";
import PublicPage from "../../layouts/PublicPage.vue";
import { ISSUES_URL, OWNS3_URL, SUPPORT_EMAIL } from "./legal";
import config from "../../config";

const faq = [
  {
    q: "I forgot my password",
    a: "Email us from the address on your account and we will help you back in. An account with no email address on it cannot be recovered, so add one in Settings while you still can."
  },
  {
    q: "I cannot open an encrypted folder",
    a: "Encrypted folders are locked with a password that only you hold. It never reaches our servers, so nobody here can unlock the folder or recover what is in it."
  },
  {
    q: "Uploads are refused",
    a: "Files go to storage you connect, so check Settings under Storage. On the free plan that means your own server; Pro can use storage we run instead."
  },
  {
    q: "A file will not upload from the browser",
    a: "Your storage has to allow uploads from this site. When one is blocked we show the exact rule to add and where to put it."
  },
  {
    q: "How do I delete my account?",
    a: "Settings, then Account, then Close account. You are signed out everywhere and nothing is deleted for 30 days, so signing in again within that time brings it all back."
  }
];
</script>

<template>
  <PublicPage title="Support" :description="`Help with ${config.name}, and how to reach a person.`">
    <div class="space-y-8">
      <section class="grid gap-3 sm:grid-cols-2">
        <a
          :href="`mailto:${SUPPORT_EMAIL}`"
          class="flex flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
        >
          <span class="flex items-center gap-2 text-sm font-medium text-fg">
            <EnvelopeIcon class="h-4 w-4 text-accent" />Email us
          </span>
          <span class="mt-1 text-[13px] text-muted">
            {{ SUPPORT_EMAIL }}. Tell us your username and what you were doing, and we usually reply within a couple of
            working days.
          </span>
        </a>

        <a
          :href="ISSUES_URL"
          target="_blank"
          rel="noopener"
          class="flex flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
        >
          <span class="flex items-center gap-2 text-sm font-medium text-fg">
            <LifebuoyIcon class="h-4 w-4 text-accent" />Report a bug
          </span>
          <span class="mt-1 text-[13px] text-muted">
            The client is open source. Bugs and feature requests are welcome on the issue tracker.
          </span>
        </a>
      </section>

      <section>
        <h2 class="text-[15px] font-semibold text-fg">Common questions</h2>
        <dl class="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
          <div v-for="item in faq" :key="item.q" class="px-4 py-3.5">
            <dt class="text-sm font-medium text-fg">{{ item.q }}</dt>
            <dd class="mt-1 text-[13px] leading-relaxed text-muted">{{ item.a }}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-lg border border-line bg-surface p-4 text-[13px] leading-relaxed text-muted">
        <h2 class="text-[15px] font-semibold text-fg">Running it yourself</h2>
        <p class="mt-1">
          {{ config.name }} can store files in object storage you own, through
          <a :href="OWNS3_URL" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">owns3</a>,
          which you can deploy to your own account. The setup guide lives in Settings under Storage.
        </p>
      </section>
    </div>
  </PublicPage>
</template>
