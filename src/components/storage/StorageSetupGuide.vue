<script setup lang="ts">
/**
 * Plain language walkthrough for putting files in storage the user rents
 * themselves. Backblaze B2 is the worked example because signing up is short
 * and needs no card. Field names match the owns3 dashboard so the steps can be
 * followed literally. Opened from the File storage card and the pricing table.
 */
import { ArrowTopRightOnSquareIcon, CloudIcon, MagnifyingGlassIcon, ServerStackIcon } from "@heroicons/vue/20/solid";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const OWNS3_REPO = "https://github.com/ownclipboard/owns3";
const OWNS3_HOSTED = "https://s3.ownclipboard.com";
const BACKBLAZE = "https://www.backblaze.com/cloud-storage";
const CLOUDFLARE_R2 = "https://www.cloudflare.com/developer-platform/products/r2/";
const MORE_PROVIDERS = "https://www.google.com/search?q=best+s3+compatible+object+storage+providers+compared";
</script>

<template>
  <Dialog :open="open" size="lg" title="Store your files yourself" @close="emit('close')">
    <div class="space-y-6 text-sm">
      <p class="text-muted">
        Files you add to a clip need somewhere to live. You can rent that space yourself, so the storage account, the files and
        the bill all stay in your name.
      </p>
      <p class="text-muted">
        Storage providers give you one master key that can do anything. You should never paste that into another app, so a free
        tool called <span class="font-medium text-fg">owns3</span> holds it for you and issues a limited key instead. The limited
        key can only upload and download your files. Step 5 is where you choose who stores the master key.
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
          <h3 class="font-medium text-fg">Create an application key</h3>
          <ol class="list-decimal space-y-1.5 pl-4 text-muted marker:text-faint">
            <li>Select <span class="text-fg">Application Keys</span> in the left menu, then <span class="text-fg">Add a New Application Key</span>.</li>
            <li>Give it a name you will recognise later.</li>
            <li>Limit it to the bucket you created and allow <span class="text-fg">Read and Write</span>.</li>
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
        <div class="min-w-0 flex-1 space-y-3">
          <h3 class="font-medium text-fg">Choose where your keys are stored</h3>
          <p class="text-muted">The remaining steps are the same either way.</p>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="flex flex-col rounded-md border border-line p-3">
              <div class="flex items-center gap-2 font-medium text-fg">
                <CloudIcon class="h-4 w-4 text-accent" />Use our owns3 server
              </div>
              <p class="mt-1 flex-1 text-[13px] text-muted">
                Nothing to install. Create an account and add your storage keys there. owns3 encrypts them before saving, but they
                sit on a server we run.
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

            <div class="flex flex-col rounded-md border border-line p-3">
              <div class="flex items-center gap-2 font-medium text-fg">
                <ServerStackIcon class="h-4 w-4 text-faint" />Run your own owns3
              </div>
              <p class="mt-1 flex-1 text-[13px] text-muted">
                Deploy owns3 to a free Cloudflare account in a few clicks. Your storage keys never reach our servers, so your
                storage stays completely private.
              </p>
              <a
                :href="OWNS3_REPO"
                target="_blank"
                rel="noopener"
                class="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent underline underline-offset-2"
              >
                Setup instructions <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- 6 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">6</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Add your storage keys to owns3</h3>
          <p class="text-muted">
            Create an account on the server you chose, open <span class="text-fg">Credentials</span> and add a new one using the
            details from steps 3 and 4.
          </p>
          <dl class="grid gap-x-4 gap-y-1.5 rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] sm:grid-cols-[10rem_1fr]">
            <dt class="text-muted">Name</dt>
            <dd class="text-fg">anything you like</dd>
            <dt class="text-muted">Endpoint URL</dt>
            <dd class="font-mono text-fg">https://s3.us-west-004.backblazeb2.com</dd>
            <dt class="text-muted">Region</dt>
            <dd class="font-mono text-fg">us-west-004</dd>
            <dt class="text-muted">Bucket</dt>
            <dd class="text-fg">your bucket name from step 3</dd>
            <dt class="text-muted">Access key ID</dt>
            <dd class="text-fg">the keyID from step 4</dd>
            <dt class="text-muted">Secret access key</dt>
            <dd class="text-fg">the applicationKey from step 4</dd>
          </dl>
          <p class="text-xs text-faint">Keep "Use path-style URLs" checked. Backblaze and Cloudflare both need it.</p>
        </div>
      </section>

      <!-- 7 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">7</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Create an app and its key</h3>
          <p class="text-muted">
            Open <span class="text-fg">Apps</span> and add one. Set its <span class="text-fg">S3 credential</span> to the one you
            just saved. Filling in <span class="text-fg">Folder</span> keeps these files together in one place inside your bucket.
          </p>
          <p class="text-muted">
            Open the app you created, add a key, and check <span class="text-fg">Read</span>, <span class="text-fg">Write</span> and
            <span class="text-fg">Delete</span>. All three are required. Copy the key. It starts with
            <span class="font-mono text-[13px] text-fg">owns3_</span> and is shown only once.
          </p>
        </div>
      </section>

      <!-- 8 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">8</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Connect it here</h3>
          <p class="text-muted">Back on the settings page, select <span class="text-fg">Connect my server</span> and enter:</p>
          <dl class="grid gap-x-4 gap-y-1.5 rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] sm:grid-cols-[10rem_1fr]">
            <dt class="text-muted">Server url</dt>
            <dd class="font-mono text-fg">{{ OWNS3_HOSTED }}</dd>
            <dt class="text-muted">Application api key</dt>
            <dd class="text-fg">the <span class="font-mono">owns3_</span> key from step 7</dd>
          </dl>
          <p class="text-xs text-faint">If you are running your own owns3, use its address as the server url.</p>
        </div>
      </section>

      <div class="rounded-md border border-info/30 bg-info-soft px-3 py-2.5 text-[13px] text-info">
        Files upload from your browser straight to your bucket, and some providers block that until you allow it. If your first
        upload fails, we show you the exact rule to add and where to put it.
      </div>
    </div>

    <template #footer>
      <Button variant="primary" @click="emit('close')">Got it</Button>
    </template>
  </Dialog>
</template>
