<script setup lang="ts">
/** Terms of service. Short on purpose: the service sells one thing and stores what you give it. */
import PublicPage from "../../layouts/PublicPage.vue";
import { GRACE_DAYS, POLICY_UPDATED, SUPPORT_EMAIL } from "./legal";
import config from "../../config";
</script>

<template>
  <PublicPage
    title="Terms of service"
    :description="`The agreement between you and ${config.name}.`"
    :updated="POLICY_UPDATED"
  >
    <div class="space-y-8 text-sm leading-relaxed text-muted [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:text-fg [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <section>
        <h2>Using the service</h2>
        <p>
          Using {{ config.name }} means accepting these terms. You need an account, you are responsible for keeping its
          password safe, and you are responsible for what happens under it.
        </p>
      </section>

      <section>
        <h2>Your content stays yours</h2>
        <p>
          Everything you save remains yours. We store and serve it so the service can work, and for nothing else. We do
          not read it, sell it, or use it to train anything.
        </p>
        <p>
          You are responsible for having the right to store what you upload, and for keeping your own copy of anything
          you cannot afford to lose.
        </p>
      </section>

      <section>
        <h2>What not to do</h2>
        <ul>
          <li>Break the law, or store anything whose possession is illegal.</li>
          <li>Infringe somebody else's rights.</li>
          <li>Send malware, or use the service to attack anyone.</li>
          <li>Get at other people's accounts or data.</li>
          <li>Hammer the api hard enough to spoil the service for others.</li>
        </ul>
        <p>We may suspend or close an account that does these things, and remove content that has to go.</p>
      </section>

      <section>
        <h2>Plans and payment</h2>
        <p>
          The free plan costs nothing. Pro is paid up front for the period you choose, through our payment provider.
          Cancelling stops the plan from continuing; it does not refund time already paid for, and Pro features keep
          working until the period ends.
        </p>
        <p>
          Pro features include storage we operate. If a Pro plan lapses, files already uploaded stay where they are, but
          new uploads stop until it is renewed or you connect storage of your own.
        </p>
      </section>

      <section>
        <h2>Storage you connect</h2>
        <p>
          You can point {{ config.name }} at object storage of your own. What happens in that account is between you and
          your provider, including what it costs and whether it stays available. We only put files in it and take them
          out again on your behalf.
        </p>
      </section>

      <section>
        <h2>Closing your account</h2>
        <p>
          You can close your account at any time from Settings. It can be reopened by signing in within
          {{ GRACE_DAYS }} days, after which everything is deleted for good. We may close an account that breaks these
          terms, and we will tell you why where we can.
        </p>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          The service is provided as it is. We work to keep it running and your data safe, but we cannot promise it will
          never be unavailable or never lose anything. To the extent the law allows, we are not liable for indirect or
          consequential loss, and our total liability is limited to what you paid us in the twelve months before the
          claim.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          These terms may change. The date at the top says when they last did, and continuing to use the service means
          the new version applies.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Anything unclear here can go to
          <a :href="`mailto:${SUPPORT_EMAIL}`" class="text-accent underline underline-offset-2">{{ SUPPORT_EMAIL }}</a>.
        </p>
      </section>
    </div>
  </PublicPage>
</template>
