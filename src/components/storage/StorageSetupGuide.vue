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
  <Dialog
    :open="open"
    size="lg"
    title="Store your files yourself"
    description="Rent storage space in your own name and keep your files in it. Here is the whole thing, from nothing to done."
    @close="emit('close')"
  >
    <div class="space-y-6 text-sm">
      <p class="text-muted">
        Files you add to a clip have to live somewhere. Instead of us keeping them, you can rent space from a storage company
        directly. The account is yours, the bill is yours, and you can look at or remove the files whenever you like without
        asking us.
      </p>
      <p class="text-muted">
        Storage companies give you one all-powerful password. Handing that to anyone would be unwise, so a free tool called
        <span class="font-medium text-fg">owns3</span> holds it for you and gives out a limited pass instead. That pass only lets
        us put your files in and take them out again. You will set this up along the way, and step 5 is where you choose who
        holds the password.
      </p>

      <!-- 1 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">1</span>
        <div class="min-w-0 flex-1 space-y-3">
          <h3 class="font-medium text-fg">Pick a storage company</h3>
          <p class="text-muted">Two popular ones, both with a free allowance to start:</p>

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
              <span class="mt-1 text-[13px] text-muted">10 GB free. Signing up takes a minute and no card is asked for.</span>
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
              <span class="mt-1 text-[13px] text-muted">10 GB free, but a card is needed before you can start.</span>
            </a>
          </div>

          <p class="text-muted">
            Plenty of others work just as well. Anything described as
            <span class="text-fg">S3 compatible</span> will do, which is most of them.
          </p>
          <a
            :href="MORE_PROVIDERS"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent underline underline-offset-2"
          >
            <MagnifyingGlassIcon class="h-3.5 w-3.5" />See how the providers compare
          </a>

          <div class="rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] text-muted">
            The rest of this guide uses <span class="font-medium text-fg">Backblaze B2</span>, because it is the shortest path and
            it does not ask for a credit card. If you choose another company the steps are the same, only the buttons are named
            differently.
          </div>
        </div>
      </section>

      <!-- 2 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">2</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Open a Backblaze account</h3>
          <ol class="list-decimal space-y-1.5 pl-4 text-muted marker:text-faint">
            <li>Go to <a :href="BACKBLAZE" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">backblaze.com</a> and sign up for B2 Cloud Storage.</li>
            <li>Give an email address and a password. Nothing to pay, and no card details.</li>
            <li>Click the link in the confirmation email to finish.</li>
          </ol>
        </div>
      </section>

      <!-- 3 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">3</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Make a place for the files</h3>
          <p class="text-muted">
            Storage companies call this a <span class="text-fg">bucket</span>. It is simply the container your files sit in.
          </p>
          <ol class="list-decimal space-y-1.5 pl-4 text-muted marker:text-faint">
            <li>In the menu on the left choose <span class="text-fg">Buckets</span>, then <span class="text-fg">Create a Bucket</span>.</li>
            <li>Give it a name. It has to be unique across all of Backblaze, so put something of your own in it.</li>
            <li>Set <span class="text-fg">Files in Bucket</span> to <span class="text-fg">Private</span>, then create it.</li>
            <li>
              The bucket now shows an <span class="text-fg">Endpoint</span>. Write it down, you will need it shortly. It looks like
              this, and the middle part is called the region:
            </li>
          </ol>
          <pre class="scroll-thin overflow-x-auto rounded-md border border-line bg-sunken px-3 py-2 font-mono text-[12px] leading-5 text-fg">s3.us-west-004.backblazeb2.com   →   region is us-west-004</pre>
        </div>
      </section>

      <!-- 4 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">4</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Get the keys to it</h3>
          <ol class="list-decimal space-y-1.5 pl-4 text-muted marker:text-faint">
            <li>In the same left menu choose <span class="text-fg">Application Keys</span>, then <span class="text-fg">Add a New Application Key</span>.</li>
            <li>Name it anything you will recognise later.</li>
            <li>Point it at the bucket you just made, and allow <span class="text-fg">Read and Write</span>.</li>
            <li>Create it. Two values appear: a <span class="text-fg">keyID</span> and an <span class="text-fg">applicationKey</span>.</li>
          </ol>
          <div class="rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-[13px] text-warn">
            Copy both somewhere safe before you leave that page. The second one is shown once and never again. If you lose it you
            can always make another key.
          </div>
        </div>
      </section>

      <!-- 5 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">5</span>
        <div class="min-w-0 flex-1 space-y-3">
          <h3 class="font-medium text-fg">Decide who holds those keys</h3>
          <p class="text-muted">This is the one real choice in the whole process. Both options end up in the same place.</p>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="flex flex-col rounded-md border border-line p-3">
              <div class="flex items-center gap-2 font-medium text-fg">
                <CloudIcon class="h-4 w-4 text-accent" />Let us hold them
              </div>
              <p class="mt-1 flex-1 text-[13px] text-muted">
                Nothing to install. Sign up on our owns3 server and paste the keys there. They are scrambled before they are saved,
                so nobody can read them by looking at the database, but they do sit on a machine we run.
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
                <ServerStackIcon class="h-4 w-4 text-faint" />Hold them yourself
              </div>
              <p class="mt-1 flex-1 text-[13px] text-muted">
                Put your own copy of owns3 on a free Cloudflare account, which is a handful of clicks. Your keys never touch
                anything of ours, and your storage stays entirely private to you.
              </p>
              <a
                :href="OWNS3_REPO"
                target="_blank"
                rel="noopener"
                class="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent underline underline-offset-2"
              >
                How to set it up <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- 6 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">6</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Hand the keys to owns3</h3>
          <p class="text-muted">
            Whichever you chose, create an account there, then open <span class="text-fg">Credentials</span> and add a new one.
            Fill it in with what steps 3 and 4 gave you.
          </p>
          <dl class="grid gap-x-4 gap-y-1.5 rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] sm:grid-cols-[10rem_1fr]">
            <dt class="text-muted">Name</dt>
            <dd class="text-fg">anything you like</dd>
            <dt class="text-muted">Endpoint URL</dt>
            <dd class="font-mono text-fg">https://s3.us-west-004.backblazeb2.com</dd>
            <dt class="text-muted">Region</dt>
            <dd class="font-mono text-fg">us-west-004</dd>
            <dt class="text-muted">Bucket</dt>
            <dd class="text-fg">the bucket name from step 3</dd>
            <dt class="text-muted">Access key ID</dt>
            <dd class="text-fg">the keyID from step 4</dd>
            <dt class="text-muted">Secret access key</dt>
            <dd class="text-fg">the applicationKey from step 4</dd>
          </dl>
          <p class="text-xs text-faint">Leave the "Use path-style URLs" box ticked. Backblaze and Cloudflare both want it on.</p>
        </div>
      </section>

      <!-- 7 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">7</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Make the limited pass</h3>
          <p class="text-muted">
            Still in owns3, open <span class="text-fg">Apps</span> and add one. Point its
            <span class="text-fg">S3 credential</span> at what you just saved. Filling in <span class="text-fg">Folder</span> keeps
            these files tidily in one corner of the bucket, which is worth doing.
          </p>
          <p class="text-muted">
            Open the app you made and create a key on it, with <span class="text-fg">Read</span>,
            <span class="text-fg">Write</span> and <span class="text-fg">Delete</span> all ticked. All three are needed. Copy the
            key, which begins with <span class="font-mono text-[13px] text-fg">owns3_</span> and is only shown once.
          </p>
        </div>
      </section>

      <!-- 8 -->
      <section class="flex gap-3">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">8</span>
        <div class="min-w-0 flex-1 space-y-2">
          <h3 class="font-medium text-fg">Tell us about it</h3>
          <p class="text-muted">
            Last step. On the settings page choose <span class="text-fg">Connect my server</span> and fill in these two:
          </p>
          <dl class="grid gap-x-4 gap-y-1.5 rounded-md border border-line bg-sunken px-3 py-2.5 text-[13px] sm:grid-cols-[10rem_1fr]">
            <dt class="text-muted">Server url</dt>
            <dd class="font-mono text-fg">{{ OWNS3_HOSTED }}</dd>
            <dt class="text-muted">Application api key</dt>
            <dd class="text-fg">the <span class="font-mono">owns3_</span> key from step 7</dd>
          </dl>
          <p class="text-xs text-faint">If you set up your own owns3, the server url is its address instead of ours.</p>
        </div>
      </section>

      <div class="rounded-md border border-info/30 bg-info-soft px-3 py-2.5 text-[13px] text-info">
        Your files travel from this page to your bucket without passing through us, and some storage companies block that until you
        say it is allowed. If your first upload is refused, we show you exactly what to paste and where to put it.
      </div>
    </div>

    <template #footer>
      <Button variant="primary" @click="emit('close')">Got it</Button>
    </template>
  </Dialog>
</template>
