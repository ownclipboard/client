<script setup lang="ts">
import { computed, ref } from "vue";
import { useClipboard } from "@vueuse/core";
import Modal from "./Modal.vue";
import { hideStorageCorsHelp, ShowStorageCorsHelp, StorageCorsDetails } from "./StorageCorsHandler";

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
      [
        {
          corsRuleName: "ownclipboard-browser-uploads",
          allowedOrigins: origins,
          allowedOperations: ["s3_put", "s3_get", "s3_head"],
          allowedHeaders: ["*"],
          exposeHeaders: ["etag"],
          maxAgeSeconds: 3600
        }
      ],
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
  // AWS CLI expects the wrapper object; R2/MinIO accept the same via s3api.
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

const { copy } = useClipboard();
const copied = ref("");
async function copyText(key: string, text: string) {
  await copy(text);
  copied.value = key;
  setTimeout(() => (copied.value = ""), 2000);
}
</script>

<template>
  <Modal v-if="ShowStorageCorsHelp && info" max-size="max-w-3xl" @close-modal="hideStorageCorsHelp">
    <div>
      <div class="text-xl p-3 border-b border-gray-800 text-yellow-400 font-bold">
        <i class="fa fa-exclamation-triangle mr-2"></i>
        {{ info.kind === "mixed-content" ? "Storage url must use https" : "Your storage bucket is blocking browser uploads" }}
      </div>

      <div class="p-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
        <template v-if="info.kind === 'mixed-content'">
          <p>
            This page is served over <b>https</b> but your owns3 server returned an <b>http</b> storage url
            (<span class="font-mono">{{ info.host }}</span>). Browsers refuse to send data from a secure page to an insecure address.
          </p>
          <p>Configure the storage endpoint in owns3 with an https url, then try the upload again.</p>
        </template>

        <template v-else>
          <p>
            Files are uploaded from your browser directly to <b>{{ providerName }}</b>
            (<span class="font-mono">{{ info.host }}</span>), bypassing our servers.
            Before the browser sends a file to another domain it asks that domain for permission, and
            <span class="font-mono">{{ info.bucket || "the bucket" }}</span> answered <b>no</b>.
            This is a one time setup: the bucket needs a CORS rule that allows uploads from
            <span class="font-mono text-green-300">{{ info.origin }}</span>.
          </p>

          <div>
            <div class="flex items-center justify-between mb-1">
              <b>1. Save this rule as <span class="font-mono">cors.json</span></b>
              <button type="button" @click="copyText('rule', ruleJson)" class="text-xs text-gray-400 hover:text-white">
                <i class="fa fa-copy mr-1"></i>{{ copied === "rule" ? "Copied" : "Copy" }}
              </button>
            </div>
            <pre class="bg-gray-900 rounded p-3 text-xs overflow-x-auto font-mono text-green-300">{{ ruleJson }}</pre>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <b>2. Apply it to the bucket</b>
              <button type="button" @click="copyText('apply', applyCommand)" class="text-xs text-gray-400 hover:text-white">
                <i class="fa fa-copy mr-1"></i>{{ copied === "apply" ? "Copied" : "Copy" }}
              </button>
            </div>
            <pre class="bg-gray-900 rounded p-3 text-xs overflow-x-auto font-mono text-green-300">{{ applyCommand }}</pre>
            <p class="text-gray-400 mt-1">{{ providerNote }}</p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <b>3. Check it took effect</b>
              <button type="button" @click="copyText('verify', verifyCommand)" class="text-xs text-gray-400 hover:text-white">
                <i class="fa fa-copy mr-1"></i>{{ copied === "verify" ? "Copied" : "Copy" }}
              </button>
            </div>
            <pre class="bg-gray-900 rounded p-3 text-xs overflow-x-auto font-mono text-green-300">{{ verifyCommand }}</pre>
            <p class="text-gray-400 mt-1">
              A correct rule answers <span class="font-mono">200</span> with
              <span class="font-mono">access-control-allow-methods</span> containing <span class="font-mono">PUT</span>.
              Then retry the upload. If you open the app from another address later, add that origin to the rule too.
            </p>
          </div>
        </template>
      </div>

      <div class="p-3 border-t border-gray-800 text-right">
        <button type="button" @click="hideStorageCorsHelp" class="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm font-medium">
          Got it
        </button>
      </div>
    </div>
  </Modal>
</template>
