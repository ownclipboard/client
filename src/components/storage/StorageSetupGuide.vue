<script setup lang="ts">
/**
 * Walkthrough for connecting an owns3 server, using Backblaze B2 as the example
 * provider. Field names match the owns3 dashboard so the steps can be followed
 * literally. Opened from the File storage card in Settings.
 */
import { ArrowTopRightOnSquareIcon, CloudIcon, ServerStackIcon } from "@heroicons/vue/20/solid";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const OWNS3_REPO = "https://github.com/ownclipboard/owns3";
const OWNS3_HOSTED = "https://s3.ownclipboard.com";
</script>

<template>
  <Dialog
    :open="open"
    size="lg"
    title="Use your own storage"
    description="Your files go to a bucket you own. We never see the keys to it."
    @close="emit('close')"
  >
    <div class="space-y-6 text-sm">
      <p class="text-muted">
        Between the two sits <span class="font-medium text-fg">owns3</span>, a small server that holds your S3 credentials and
        hands out scoped keys instead. You need a bucket, an owns3 server, and the key it gives you.
      </p>

      <!-- 1 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">1</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Create a bucket and an application key</h3>
          <p class="text-muted">
            Any S3 compatible provider works. Backblaze B2 as the example: sign up, open
            <span class="text-fg">B2 Cloud Storage</span> and create a <span class="text-fg">private</span> bucket. The bucket page shows an
            endpoint like the one below, and the region is the part inside it.
          </p>
          <pre class="scroll-thin overflow-x-auto rounded-md border border-line bg-sunken px-3 py-2 font-mono text-[12px] leading-5 text-fg">s3.us-west-004.backblazeb2.com   →   region us-west-004</pre>
          <p class="text-muted">
            Then under <span class="text-fg">Application Keys</span> add a new key limited to that bucket, with read and write access.
            Copy the <span class="font-mono text-[13px] text-fg">keyID</span> and <span class="font-mono text-[13px] text-fg">applicationKey</span>. The
            second one is shown only once.
          </p>
          <p class="text-xs text-faint">Cloudflare R2, Amazon S3, MinIO, Wasabi and DigitalOcean Spaces all work the same way.</p>
        </div>
      </section>

      <!-- 2 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">2</span>
        <div class="min-w-0 flex-1 space-y-3">
          <h3 class="font-medium text-fg">Get an owns3 server</h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="flex flex-col rounded-md border border-line p-3">
              <div class="flex items-center gap-2 font-medium text-fg">
                <ServerStackIcon class="h-4 w-4 text-faint" />Run your own
              </div>
              <p class="mt-1 flex-1 text-[13px] text-muted">
                One click deploys it to your own Cloudflare account. Open the worker address it gives you and pick an admin password.
              </p>
              <a
                :href="OWNS3_REPO"
                target="_blank"
                rel="noopener"
                class="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent underline underline-offset-2"
              >
                Deploy owns3 <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" />
              </a>
            </div>

            <div class="flex flex-col rounded-md border border-line p-3">
              <div class="flex items-center gap-2 font-medium text-fg">
                <CloudIcon class="h-4 w-4 text-accent" />Use ours
              </div>
              <p class="mt-1 flex-1 text-[13px] text-muted">
                Nothing to deploy. Create an account and add your credentials there. The bucket is still yours, and the files never
                leave it.
              </p>
              <a
                :href="OWNS3_HOSTED"
                target="_blank"
                rel="noopener"
                class="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent underline underline-offset-2"
              >
                s3.ownclipboard.com <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- 3 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">3</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Save the credential in owns3</h3>
          <p class="text-muted">Open <span class="text-fg">Credentials</span>, add a new one and fill it with what step 1 gave you.</p>
          <dl class="grid gap-x-4 gap-y-1.5 rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] sm:grid-cols-[9rem_1fr]">
            <dt class="text-muted">Endpoint URL</dt>
            <dd class="font-mono text-fg">https://s3.us-west-004.backblazeb2.com</dd>
            <dt class="text-muted">Region</dt>
            <dd class="font-mono text-fg">us-west-004</dd>
            <dt class="text-muted">Bucket</dt>
            <dd class="font-mono text-fg">your bucket name</dd>
            <dt class="text-muted">Access key ID</dt>
            <dd class="font-mono text-fg">the keyID</dd>
            <dt class="text-muted">Secret access key</dt>
            <dd class="font-mono text-fg">the applicationKey</dd>
          </dl>
          <p class="text-xs text-faint">Leave "Use path-style URLs" on for Backblaze, R2 and MinIO.</p>
        </div>
      </section>

      <!-- 4 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">4</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Create an app and a key</h3>
          <p class="text-muted">
            Under <span class="text-fg">Apps</span>, add an app and point its <span class="text-fg">S3 credential</span> at the one you just saved.
            Setting a <span class="text-fg">Folder</span> keeps everything under one prefix in the bucket, which is worth doing.
          </p>
          <p class="text-muted">
            On the app's page create a key with <span class="text-fg">Read</span>, <span class="text-fg">Write</span> and
            <span class="text-fg">Delete</span> ticked. All three are needed. The key starts with
            <span class="font-mono text-[13px] text-fg">owns3_</span> and is shown once.
          </p>
        </div>
      </section>

      <!-- 5 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">5</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Connect it here</h3>
          <p class="text-muted">
            Back on this page, choose <span class="text-fg">Connect my server</span>. The server url is your owns3 address, and the api
            key is the one from step 4.
          </p>
          <dl class="grid gap-x-4 gap-y-1.5 rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] sm:grid-cols-[9rem_1fr]">
            <dt class="text-muted">Server url</dt>
            <dd class="font-mono text-fg">{{ OWNS3_HOSTED }}</dd>
            <dt class="text-muted">Application api key</dt>
            <dd class="font-mono text-fg">owns3_…</dd>
          </dl>
        </div>
      </section>

      <div class="rounded-md border border-info/30 bg-info-soft px-3 py-2.5 text-[13px] text-info">
        Uploads go from your browser straight to the bucket, so the bucket has to allow this site. If the first upload is blocked,
        we show the exact rule and the command to apply it. On Backblaze that rule has to be set with the b2 command line
        tool, because the web interface only covers downloads.
      </div>
    </div>

    <template #footer>
      <Button variant="primary" @click="emit('close')">Got it</Button>
    </template>
  </Dialog>
</template>
