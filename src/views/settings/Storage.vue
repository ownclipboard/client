<script setup lang="ts">
/**
 * Where this account's files live: the bucket we operate (Pro), or s3
 * credentials of the user's own.
 *
 * The form is four fields plus three that have sensible defaults, and `prefix`
 * is the one worth being careful with. For an account that already has files it
 * has to be the prefix those files are stored under, or they all stop resolving.
 * The api refuses a wrong one by reading an existing file back, and its refusal
 * names the file and the path it expected — so that message is shown in the form
 * rather than toasted, because it is the only thing that says what to fix.
 */
import { computed, onMounted, reactive, ref } from "vue";
import { CloudIcon, ExclamationTriangleIcon, ServerStackIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $alert } from "../../components/ws-alert/ws-alert";
import {
  connectStorage,
  disconnectStorage,
  getStorageStatus,
  useAppStorage,
  type StorageConnectBody,
  type StorageStatus
} from "../../services/files.service";
import { refreshAuthData } from "../../services/auth.service";
import { useAuthUser } from "../../stores/auth.store";
import { askToConfirm } from "../../components/ConfirmHandler";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import Switch from "../../components/ui/Switch.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import StorageSetupGuide from "../../components/storage/StorageSetupGuide.vue";

const authUser = useAuthUser();

const status = ref<StorageStatus | null>(null);
const loading = ref(true);
// Set while the user is filling in credentials of their own.
const showForm = ref<"own" | null>(null);
const isPro = computed(() => authUser.data?.plan === "pro");

const form = reactive({
  endpoint: "",
  bucket: "",
  accessKeyId: "",
  secretAccessKey: "",
  region: "auto",
  prefix: "",
  forcePathStyle: true
});
const advanced = ref(false);
/** The api's own words when a connection is refused. Long, and worth reading. */
const connectError = ref("");
const guideOpen = ref(false);

/**
 * Keep the summary `ping` gave us in step with what this page just did, so the
 * upload button reacts without waiting for a reload.
 */
function setStatus(next: StorageStatus) {
  status.value = next;
  authUser.storage = {
    connected: next.connected,
    default: next.default,
    defaultAvailable: next.defaultAvailable,
    proRequired: next.proRequired
  };
}

async function loadStatus() {
  try {
    setStatus(await getStorageStatus());
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadStatus);

function openForm() {
  // Offer the prefix the account is already on, so replacing credentials keeps
  // pointing at the same objects unless the user says otherwise.
  form.prefix = status.value?.prefix || "";
  connectError.value = "";
  showForm.value = "own";
}

function connect(btn: ILoadingButton) {
  connectError.value = "";

  const body: StorageConnectBody = {
    endpoint: form.endpoint.trim(),
    bucket: form.bucket.trim(),
    accessKeyId: form.accessKeyId.trim(),
    secretAccessKey: form.secretAccessKey.trim(),
    region: form.region.trim() || "auto",
    forcePathStyle: form.forcePathStyle,
    // Empty means the bucket root, which the api takes as written.
    prefix: form.prefix.trim()
  };

  if (!body.endpoint || !body.bucket || !body.accessKeyId || !body.secretAccessKey) {
    $alert.warning("The endpoint, bucket, access key id and secret access key are all required.");
    return btn.stopLoading();
  }

  return connectStorage(body)
    .then((res) => {
      setStatus(res);
      form.secretAccessKey = "";
      form.accessKeyId = "";
      showForm.value = null;
      advanced.value = false;
    })
    .catch((e: any) => {
      // The refusal explains itself, and a toast is the wrong place for it.
      const message = e?.response?.data?.error;
      if (message) connectError.value = message;
      else alertRequestError(e);
    })
    .finally(btn.stopLoading);
}

async function useHosted(btn: ILoadingButton) {
  try {
    setStatus(await useAppStorage());
    showForm.value = null;
  } catch (e: any) {
    alertRequestError(e);
    // 403: the plan changed server side, sync it so the page reflects that.
    if (e?.response?.status === 403) await refreshAuthData(authUser);
  } finally {
    btn.stopLoading();
  }
}

async function disconnect(btn: ILoadingButton) {
  const ok = await askToConfirm({
    title: "Disconnect storage?",
    message: "Uploaded files stay in the bucket but become unavailable here until you reconnect.",
    confirmLabel: "Disconnect",
    danger: true
  });
  if (!ok) return btn.stopLoading();

  return disconnectStorage()
    .then(() => loadStatus())
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}
</script>

<template>
  <div class="space-y-5">
    <Card title="File storage" description="Where uploaded files are kept. We host them for you (Pro), or connect a bucket of your own.">
      <template #header>
        <Badge v-if="status?.connected" variant="accent">Connected</Badge>
        <Badge v-else-if="status?.proRequired" variant="warn">Pro required</Badge>
        <Badge v-else-if="!loading" variant="neutral">Not connected</Badge>
      </template>

      <div v-if="loading" class="space-y-2">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-4 w-64" />
      </div>

      <template v-else>
        <!-- Pro subscription lapsed while on our bucket -->
        <div v-if="status?.proRequired" class="mb-4 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
          Your files are in our bucket, which needs an active Pro plan. Uploads are paused until you
          <RouterLink :to="{ name: 'pricing' }" class="font-medium underline underline-offset-2">renew Pro</RouterLink>
          or connect a bucket of your own below.
        </div>

        <!-- Current connection -->
        <template v-if="status?.connected && !showForm">
          <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt class="text-muted">Storage</dt>
            <dd class="flex items-center gap-2 text-fg">
              <template v-if="status.default"><CloudIcon class="h-4 w-4 text-accent" /> Hosted by us</template>
              <template v-else><ServerStackIcon class="h-4 w-4 text-faint" /> Your own bucket</template>
            </dd>
            <template v-if="!status.default && status.endpoint">
              <dt class="text-muted">Endpoint</dt>
              <dd class="break-all font-mono text-fg">{{ status.endpoint }}</dd>
            </template>
            <template v-if="!status.default && status.bucket">
              <dt class="text-muted">Bucket</dt>
              <dd class="font-mono text-fg">{{ status.bucket }}</dd>
            </template>
            <template v-if="!status.default">
              <dt class="text-muted">Prefix</dt>
              <dd class="font-mono text-fg">{{ status.prefix || "bucket root" }}</dd>
            </template>
            <template v-if="status.connectedAt">
              <dt class="text-muted">Connected</dt>
              <dd class="text-fg"><TimeAgo :date="status.connectedAt" /></dd>
            </template>
          </dl>
          <div class="mt-4 flex flex-wrap gap-2">
            <Button size="sm" @click="openForm">{{ status.default ? "Use my own bucket" : "Replace credentials" }}</Button>
            <Button size="sm" variant="danger" :click="disconnect" message="Disconnecting">Disconnect</Button>
          </div>
        </template>

        <!-- Choose a storage -->
        <template v-else>
          <div v-if="!showForm" class="grid gap-3 sm:grid-cols-2">
            <div v-if="status?.defaultAvailable" class="flex flex-col rounded-md border border-line p-4">
              <div class="flex items-center gap-2 text-sm font-medium text-fg">
                <CloudIcon class="h-4 w-4 text-accent" /> We host your files
                <Badge variant="accent" uppercase class="ml-auto">Pro</Badge>
              </div>
              <p class="mt-1 flex-1 text-sm text-muted">Nothing to set up, nothing to pay for elsewhere. Your files are kept in storage we run, under your own prefix.</p>
              <Button v-if="isPro" class="mt-4" variant="primary" size="sm" :click="useHosted" message="Connecting">Host my files</Button>
              <Button v-else class="mt-4" size="sm" :to="{ name: 'pricing' }">Upgrade to Pro</Button>
            </div>
            <div class="flex flex-col rounded-md border border-line p-4">
              <div class="flex items-center gap-2 text-sm font-medium text-fg">
                <ServerStackIcon class="h-4 w-4 text-faint" /> Your own bucket
              </div>
              <p class="mt-1 flex-1 text-sm text-muted">
                Rent storage in your own name and connect it with an s3 key. Works with Cloudflare R2, Backblaze B2, MinIO and AWS S3.
              </p>
              <div class="mt-4 flex flex-wrap items-center gap-3">
                <Button size="sm" :variant="status?.defaultAvailable ? 'secondary' : 'primary'" @click="openForm">Connect my bucket</Button>
                <button type="button" class="text-[13px] font-medium text-accent underline underline-offset-2" @click="guideOpen = true">
                  Show me how
                </button>
              </div>
            </div>
          </div>

          <form v-else class="space-y-4" @submit.prevent>
            <!-- The api's refusal, which says what to fix. -->
            <div v-if="connectError" class="flex gap-2.5 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <ExclamationTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" />
              <p>{{ connectError }}</p>
            </div>

            <Input
              v-model="form.endpoint"
              type="url"
              label="Endpoint"
              placeholder="https://abc123.r2.cloudflarestorage.com"
              autocomplete="off"
              mono
              hint="The bucket's s3 address, without the bucket name."
            />
            <Input v-model="form.bucket" label="Bucket" placeholder="my-clips" autocomplete="off" mono />
            <Input v-model="form.accessKeyId" label="Access key id" autocomplete="off" mono />
            <Input
              v-model="form.secretAccessKey"
              type="password"
              label="Secret access key"
              autocomplete="off"
              mono
              hint="Stored encrypted and never shown again. Limit the key to this one bucket."
            />

            <div>
              <button
                type="button"
                class="text-[13px] font-medium text-accent underline underline-offset-2"
                @click="advanced = !advanced"
              >
                {{ advanced ? "Hide" : "Show" }} region, prefix and url style
              </button>
              <!-- Worth opening when replacing credentials: the prefix has to keep matching. -->
              <p v-if="!advanced && status?.connected" class="mt-1.5 text-xs text-faint">
                Already have files? Open this and check the prefix they are stored under.
              </p>
            </div>

            <template v-if="advanced">
              <Input v-model="form.region" label="Region" placeholder="auto" autocomplete="off" mono hint="`auto` suits R2. On AWS, the bucket's real region." />
              <Input
                v-model="form.prefix"
                label="Prefix"
                placeholder="(bucket root)"
                autocomplete="off"
                mono
                hint="Folder inside the bucket to keep files in. If you already have files here it must be the folder they are already in, or they stop resolving."
              />
              <Switch
                v-model="form.forcePathStyle"
                label="Put the bucket in the url path"
                description="On for R2, Backblaze and MinIO. Off only if your provider needs the bucket as a subdomain."
              />
            </template>

            <div class="flex flex-wrap items-center gap-2">
              <Button variant="primary" type="submit" :click="connect" message="Connecting">Connect</Button>
              <Button variant="ghost" @click="showForm = null">Cancel</Button>
              <button type="button" class="ml-auto text-[13px] font-medium text-accent underline underline-offset-2" @click="guideOpen = true">
                Where do I get these?
              </button>
            </div>
          </form>
        </template>
      </template>

      <p class="mt-4 text-xs text-faint">
        Files upload from your browser straight to the bucket, so it needs a CORS rule allowing PUT, GET and HEAD from this
        site. No bucket yet?
        <button type="button" class="text-accent underline underline-offset-2" @click="guideOpen = true">Read the setup guide</button>.
      </p>
    </Card>

    <StorageSetupGuide :open="guideOpen" @close="guideOpen = false" />
  </div>
</template>
