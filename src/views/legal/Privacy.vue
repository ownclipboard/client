<script setup lang="ts">
/**
 * Privacy policy. Written from what the app actually does, so it needs
 * revisiting whenever the data it handles or the services it calls change.
 */
import PublicPage from "../../layouts/PublicPage.vue";
import { GRACE_DAYS, OWNS3_URL, POLICY_UPDATED, SUPPORT_EMAIL } from "./legal";
import config from "../../config";
</script>

<template>
  <PublicPage
    title="Privacy policy"
    :description="`What ${config.name} collects, where it goes, and how to get rid of it.`"
    :updated="POLICY_UPDATED"
  >
    <div class="space-y-8 text-sm leading-relaxed text-muted [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:text-fg [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <section>
        <h2>The short version</h2>
        <p>
          We keep what we need to run the service and nothing else. There are no adverts, no analytics and no trackers of
          any kind. We do not sell your information, and we do not use what you save to train anything.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><span class="text-fg">Your account.</span> A username, and an email address only if you choose to add one.</li>
          <li><span class="text-fg">Your password.</span> Stored as a hash, never as text we can read.</li>
          <li>
            <span class="text-fg">What you save.</span> The clips you create, their titles, the folders you put them in,
            and the files you upload.
          </li>
          <li>
            <span class="text-fg">How it is organised.</span> Folder names, when things were created and changed, how many
            clips a folder holds, and the size and type of each file.
          </li>
          <li>
            <span class="text-fg">Connected apps.</span> A name you give each device, a hash of its api key, how many
            times it has been used, and the identifier the app sends when it first connects.
          </li>
          <li>
            <span class="text-fg">Spaces.</span> Who owns a space, who belongs to it, and who added each clip in it.
          </li>
          <li>
            <span class="text-fg">Payments.</span> Which plan you are on and the status of an invoice. Card and crypto
            details go to the payment provider and never reach us.
          </li>
        </ul>
        <p>
          Your browser also keeps a sign-in token, your theme choice and the folder you last had open. These stay on your
          device and are cleared when you sign out.
        </p>
      </section>

      <section>
        <h2>Encrypted folders</h2>
        <p>
          Clips in an encrypted folder are encrypted in your browser before they are sent, so we hold nothing but
          ciphertext. The password that opens them is never sent to us in readable form, only a hash we use to tell a
          right password from a wrong one. We cannot read those clips, and we cannot recover them if you forget the
          password.
        </p>
      </section>

      <section>
        <h2>Where files are stored</h2>
        <p>
          Files go to object storage, and you choose whose. If you connect your own
          <a :href="OWNS3_URL" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">owns3</a>
          server, they are stored in your own account with your provider and we never hold a copy. On Pro you can use
          storage we operate instead, where your files sit under a prefix of your own.
        </p>
        <p>
          Either way the bytes travel from your browser straight to that storage rather than through us.
        </p>
      </section>

      <section>
        <h2>Who else sees it</h2>
        <ul>
          <li>
            <span class="text-fg">Ably</span> carries live updates between your devices. Those messages contain
            identifiers and folder names only, never the contents of a clip.
          </li>
          <li>
            <span class="text-fg">NowPayments</span> handles payment for Pro. They receive what a payment needs; we
            receive back only an invoice reference and its status.
          </li>
          <li>
            <span class="text-fg">Your storage provider</span>, whichever you connected, holds your files under the terms
            you have with them.
          </li>
          <li>
            <span class="text-fg">Our hosting provider</span> runs the servers and, as with any website, sees the network
            requests that reach them.
          </li>
        </ul>
        <p>Nobody else. We do not share or sell your information for advertising or any other purpose.</p>
      </section>

      <section>
        <h2>What you share yourself</h2>
        <ul>
          <li>Everyone in a space can see every clip and folder in it, and who added each one.</li>
          <li>Turning on public paste for a folder lets anyone with the link add clips to it.</li>
          <li>An app you connect with an api key can read and write the clips in the one folder you gave it.</li>
        </ul>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Clips and files stay until you delete them. Deleting a clip removes it, and deleting a file removes it from
          storage too.
        </p>
        <p>
          Closing your account signs you out everywhere and starts a {{ GRACE_DAYS }} day pause. Sign in again during
          that time and everything comes back. After it passes, your account, clips, folders, files, devices and the
          spaces you own are deleted for good. Records of past payments are kept for accounting, holding nothing but an
          account reference.
        </p>
      </section>

      <section>
        <h2>What you can do</h2>
        <ul>
          <li>Delete any clip, file or folder at any time.</li>
          <li>Close your account from Settings, under Account.</li>
          <li>Add an email only if you want one; it is used for password resets and nothing else.</li>
          <li>Keep anything you would rather we could not read in an encrypted folder.</li>
          <li>Ask us for a copy of what we hold about you, or for it to be corrected or erased.</li>
        </ul>
      </section>

      <section>
        <h2>Children</h2>
        <p>{{ config.name }} is not intended for children under 13, and we do not knowingly collect their information.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes we will update the date at the top of this page. Carrying on using the service after a
          change means the new version applies.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about any of this, or a request about your own information, can go to
          <a :href="`mailto:${SUPPORT_EMAIL}`" class="text-accent underline underline-offset-2">{{ SUPPORT_EMAIL }}</a>.
        </p>
      </section>
    </div>
  </PublicPage>
</template>
