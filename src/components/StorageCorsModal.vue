<script setup lang="ts">
/** Explains a blocked browser upload (bucket CORS or mixed content) and how to fix it. */
import { computed, ref } from "vue";
import { useClipboard } from "@vueuse/core";
import { CheckIcon, ClipboardDocumentIcon, ExclamationTriangleIcon } from "@heroicons/vue/20/solid";
import { hideStorageCorsHelp, ShowStorageCorsHelp, StorageCorsDetails } from "./StorageCorsHandler";
import Dialog from "./ui/Dialog.vue";
import Button from "./ui/Button.vue";

const info = computed(() => StorageCorsDetails.value);

const providerName = computed(() => {
  switch (info.value?.provider) {
    case "backblaze": return "Backblaze B2";
    case "r2": return "Cloudflare R2";
    case "aws": return "Amazon S3";
    default: return "your S3 compatible storage";
  }
});

/** The CORS rule, in the format the provider expects, prefilled with this app's origin. */
const ruleJson = computed(() => {
  if (!info.value) return "";
  const origins = [info.value.origin];

  if (info.value.provider === "backblaze") {
    return JSON.stringify(
      [{
        corsRuleName: "ownclipboard-browser-uploads",
        allowedOrigins: origins,
        allowedOperations: ["s3_put", "s3_get", "s3_head"],
        allowedHeaders: ["*"],
        exposeHeaders: ["etag"],
        maxAgeSeconds: 3600
      }],
      null,
      2
    );
  }

  const rule = {
    AllowedOrigins: origins,
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600
  };
  return JSON.stringify({ CORSRules: [rule] }, null, 2);
});

const applyCommand = computed(() => {
  if (!info.value) return "";
  const { provider, bucket, endpoint } = info.value;
  const b = bucket || "<bucket-name>";
  if (provider === "backblaze") return `b2 bucket update --cors-rules "$(cat cors.json)" ${b}`;
  if (provider === "aws") return `aws s3api put-bucket-cors --bucket ${b} --cors-configuration file://cors.json`;
  return `aws s3api put-bucket-cors --bucket ${b} --cors-configuration file://cors.json --endpoint-url ${endpoint}`;
});

const verifyCommand = computed(() => {
  if (!info.value) return "";
  return [
    `curl -s -i -X OPTIONS "${info.value.bucketUrl}/probe" \\`,
    `  -H "Origin: ${info.value.origin}" \\`,
    `  -H "Access-Control-Request-Method: PUT" \\`,
    `  -H "Access-Control-Request-Headers: content-type" | grep -i "^HTTP\\|access-control"`
  ].join("\n");
});

const providerNote = computed(() => {
  switch (info.value?.provider) {
    case "backblaze":
      return "The Backblaze web UI can only share downloads. Upload rules (s3_put) must be set with the B2 command line tool.";
    case "r2":
      return "You can also paste the rule in the Cloudflare dashboard: R2 → your bucket → Settings → CORS policy.";
    case "aws":
      return "You can also paste the rule in the AWS console: S3 → your bucket → Permissions → Cross-origin resource sharing.";
    default:
      return "Most S3 compatible servers (MinIO, DigitalOcean Spaces, Wasabi) accept this rule through the S3 API.";
  }
});

const steps = computed(() => [
  { key: "rule", title: "Save this rule as cors.json", code: ruleJson.value, note: "" },
  { key: "apply", title: "Apply it to the bucket", code: applyCommand.value, note: providerNote.value },
  {
    key: "verify",
    title: "Check it took effect",
    code: verifyCommand.value,
    note: "A correct rule answers 200 with access-control-allow-methods containing PUT. Then retry the upload. If you open the app from another address later, add that origin to the rule too."
  }
]);

const { copy } = useClipboard();
const copied = ref("");
async function copyText(key: string, text: string) {
  await copy(text);
  copied.value = key;
  setTimeout(() => (copied.value = ""), 2000);
}
</script>

<template>
  <Dialog :open="ShowStorageCorsHelp && !!info" size="lg" @close="hideStorageCorsHelp">
    <template #header>
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-warn-soft text-warn"><ExclamationTriangleIcon class="h-5 w-5" /></span>
        <div>
          <h2 class="text-[15px] font-semibold text-fg">
            {{ info?.kind === "mixed-content" ? "Storage url must use https" : "Your storage bucket is blocking browser uploads" }}
          </h2>
          <p class="mt-0.5 text-sm text-muted">One-time setup on {{ providerName }}.</p>
        </div>
      </div>
    </template>

    <div v-if="info" class="space-y-5 text-sm text-fg/90">
      <template v-if="info.kind === 'mixed-content'">
        <p>
          This page is served over <b>https</b> but your owns3 server returned an <b>http</b> storage url
          (<code class="font-mono text-xs">{{ info.host }}</code>). Browsers refuse to send data from a secure page to an insecure address.
        </p>
        <p>Configure the storage endpoint in owns3 with an https url, then try the upload again.</p>
      </template>

      <template v-else>
        <p>
          Files upload from your browser straight to <b>{{ providerName }}</b> (<code class="font-mono text-xs">{{ info.host }}</code>), bypassing our servers.
          Before sending a file to another domain the browser asks that domain for permission, and
          <code class="font-mono text-xs">{{ info.bucket || "the bucket" }}</code> answered no.
          The bucket needs a CORS rule that allows uploads from <code class="font-mono text-xs text-accent">{{ info.origin }}</code>.
        </p>

        <ol class="space-y-4">
          <li v-for="(step, i) in steps" :key="step.key">
            <div class="mb-1.5 flex items-center justify-between">
              <span class="font-medium"><span class="mr-1.5 font-mono text-xs text-faint">{{ i + 1 }}.</span>{{ step.title }}</span>
              <Button size="xs" variant="ghost" @click="copyText(step.key, step.code)">
                <CheckIcon v-if="copied === step.key" class="h-3.5 w-3.5 text-accent" /><ClipboardDocumentIcon v-else class="h-3.5 w-3.5" />
                {{ copied === step.key ? "Copied" : "Copy" }}
              </Button>
            </div>
            <pre class="overflow-x-auto rounded-md bg-sunken p-3 font-mono text-xs leading-relaxed text-fg">{{ step.code }}</pre>
            <p v-if="step.note" class="mt-1.5 text-xs text-muted">{{ step.note }}</p>
          </li>
        </ol>
      </template>
    </div>

    <template #footer>
      <Button variant="primary" @click="hideStorageCorsHelp">Got it</Button>
    </template>
  </Dialog>
</template>
