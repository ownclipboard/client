<script setup lang="ts">
/**
 * Plain language walkthrough for putting files in storage the user rents
 * themselves. Backblaze B2 is the worked example because signing up is short
 * and needs no card. Opened from the File storage card and the pricing table.
 *
 * The keys now come straight here rather than to a separate key holder, so the
 * guide says so and makes the mitigation a step of its own: limit the key to
 * one bucket, so what we hold can only ever reach that bucket.
 */
import { ArrowTopRightOnSquareIcon, MagnifyingGlassIcon } from "@heroicons/vue/20/solid";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const BACKBLAZE = "https://www.backblaze.com/cloud-storage";
const CLOUDFLARE_R2 = "https://www.cloudflare.com/developer-platform/products/r2/";
const MORE_PROVIDERS = "https://www.google.com/search?q=best+s3+compatible+object+storage+providers+compared";

/** The origin the bucket has to allow, which is wherever this page is open. */
const ORIGIN = window.location.origin;

const CORS_RULE = `[
  {
    "AllowedOrigins": ["${ORIGIN}"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]`;
</script>

<template>
  <Dialog :open="open" size="lg" title="Store your files yourself" @close="emit('close')">
    <div class="space-y-6 text-sm">
      <p class="text-muted">
        Files you add to a clip need somewhere to live. You can rent that space yourself, so the storage account, the files and
        the bill all stay in your name.
      </p>
      <p class="text-muted">
        To put files there we need a key to your bucket. We store it encrypted and never show it again, but it is still your key
        in our hands — so step 4 limits it to the one bucket you make here, and nothing else in your storage account.
      </p>

      <!-- 1 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">1</span>
        <div class="min-w-0 flex-1 space-y-3">
          <h3 class="font-medium text-fg">Pick a storage provider</h3>
          <p class="text-muted">Two popular ones, both with a free tier:</p>

          <div class="grid gap-3 sm:grid-cols-2">
            <a
              :href="BACKBLAZE"
              target="_blank"
              rel="noopener"
              class="flex flex-col rounded-md border border-line p-3 transition-colors hover:border-line-strong"
            >
              <span class="flex items-center gap-1.5 font-medium text-fg">
                Backblaze B2 <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5 text-faint" />
              </span>
              <span class="mt-1 text-[13px] text-muted">10 GB free. Takes about a minute to sign up, and no credit card.</span>
            </a>

            <a
              :href="CLOUDFLARE_R2"
              target="_blank"
              rel="noopener"
              class="flex flex-col rounded-md border border-line p-3 transition-colors hover:border-line-strong"
            >
              <span class="flex items-center gap-1.5 font-medium text-fg">
                Cloudflare R2 <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5 text-faint" />
              </span>
              <span class="mt-1 text-[13px] text-muted">10 GB free, but you need a credit card to activate it.</span>
            </a>
          </div>

          <p class="text-muted">
            Any provider that says it is <span class="text-fg">S3 compatible</span> works, and most of them are.
          </p>
          <a
            :href="MORE_PROVIDERS"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent underline underline-offset-2"
          >
            <MagnifyingGlassIcon class="h-3.5 w-3.5" />Compare storage providers
          </a>

          <div class="rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] text-muted">
            This guide uses <span class="font-medium text-fg">Backblaze B2</span> because it is the quickest to set up and does not
            ask for a card. Other providers follow the same steps, with different names on the buttons.
          </div>
        </div>
      </section>

      <!-- 2 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">2</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Create a Backblaze account</h3>
          <ol class="list-decimal space-y-1.5 pl-4 text-muted marker:text-faint">
            <li>Go to <a :href="BACKBLAZE" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">backblaze.com</a> and sign up for B2 Cloud Storage.</li>
            <li>Enter your email and a password. No payment details are needed.</li>
            <li>Confirm your email address.</li>
          </ol>
        </div>
      </section>

      <!-- 3 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">3</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Create a bucket</h3>
          <p class="text-muted">A bucket is the container your files are stored in.</p>
          <ol class="list-decimal space-y-1.5 pl-4 text-muted marker:text-faint">
            <li>Select <span class="text-fg">Buckets</span> in the left menu, then <span class="text-fg">Create a Bucket</span>.</li>
            <li>Enter a name. Bucket names are unique across all of Backblaze, so add something specific to you.</li>
            <li>Set <span class="text-fg">Files in Bucket</span> to <span class="text-fg">Private</span>, then create it.</li>
            <li>Copy the <span class="text-fg">Endpoint</span> shown on the bucket. You will need it, and the region is part of it:</li>
          </ol>
          <pre class="scroll-thin overflow-x-auto rounded-md border border-line bg-sunken px-3 py-2 font-mono text-[12px] leading-5 text-fg">s3.us-west-004.backblazeb2.com   →   region is us-west-004</pre>
        </div>
      </section>

      <!-- 4 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">4</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Create a key for that bucket only</h3>
          <ol class="list-decimal space-y-1.5 pl-4 text-muted marker:text-faint">
            <li>Select <span class="text-fg">Application Keys</span> in the left menu, then <span class="text-fg">Add a New Application Key</span>.</li>
            <li>Give it a name you will recognise later.</li>
            <li>Set <span class="text-fg">Allow access to Bucket(s)</span> to the one bucket you just made, not all buckets.</li>
            <li>Allow <span class="text-fg">Read and Write</span>, which covers deleting a file too.</li>
            <li>Create the key. You get a <span class="text-fg">keyID</span> and an <span class="text-fg">applicationKey</span>.</li>
          </ol>
          <div class="rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-[13px] text-warn">
            Copy both before you leave the page. The applicationKey is shown only once. If you lose it, create a new key.
          </div>
        </div>
      </section>

      <!-- 5 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">5</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Connect it here</h3>
          <p class="text-muted">Back on the settings page, select <span class="text-fg">Connect my bucket</span> and enter:</p>
          <dl class="grid gap-x-4 gap-y-1.5 rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] sm:grid-cols-[10rem_1fr]">
            <dt class="text-muted">Endpoint</dt>
            <dd class="break-all font-mono text-fg">https://s3.us-west-004.backblazeb2.com</dd>
            <dt class="text-muted">Bucket</dt>
            <dd class="text-fg">your bucket name from step 3</dd>
            <dt class="text-muted">Access key id</dt>
            <dd class="text-fg">the keyID from step 4</dd>
            <dt class="text-muted">Secret access key</dt>
            <dd class="text-fg">the applicationKey from step 4</dd>
            <dt class="text-muted">Region</dt>
            <dd class="font-mono text-fg">us-west-004</dd>
          </dl>
          <p class="text-muted">
            Leave <span class="text-fg">Put the bucket in the url path</span> on. Backblaze and Cloudflare both want it.
          </p>
          <div class="rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] text-muted">
            <span class="font-medium text-fg">Already uploaded files here?</span> Then the <span class="text-fg">Prefix</span> field
            has to stay set to the folder those files are already in, or they will all stop opening. We check before saving and tell
            you if it does not match, so nothing is lost by trying.
          </div>
        </div>
      </section>

      <!-- 6 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">6</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Let your browser upload to it</h3>
          <p class="text-muted">
            Files go from your browser straight to your bucket, never through us, and providers block that until the bucket says
            it is allowed. The rule to add, already filled in with this site's address:
          </p>
          <pre class="scroll-thin overflow-x-auto rounded-md border border-line bg-sunken px-3 py-2 font-mono text-[12px] leading-5 text-fg">{{ CORS_RULE }}</pre>
          <p class="text-xs text-faint">
            On Backblaze this one needs their command line tool; Cloudflare and AWS both take it in the dashboard. If your first
            upload fails we show you the exact command for your provider, so you can skip this step and come back to it.
          </p>
        </div>
      </section>
    </div>

    <template #footer>
      <Button variant="primary" @click="emit('close')">Got it</Button>
    </template>
  </Dialog>
</template>
