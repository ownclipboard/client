<script setup lang="ts">
/**
 * Api keys for apps. Each device holds one key, is tied to a single folder and
 * talks to the legacy api. Keys are only ever shown once, at creation or rotation.
 */
import { computed, onMounted, ref } from "vue";
import { CpuChipIcon, PlusIcon } from "@heroicons/vue/20/solid";
import { alertRequestError } from "../http";
import config from "../config";
import { getDevices, type Device, type DeviceList } from "../services/devices.service";
import { useAuthUser } from "../stores/auth.store";
import type { components } from "../types/api";
import PageHeader from "../components/ui/PageHeader.vue";
import Card from "../components/ui/Card.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import EmptyState from "../components/ui/EmptyState.vue";
import Divider from "../components/ui/Divider.vue";
import DeviceRow from "../components/devices/DeviceRow.vue";
import DeviceDialog from "../components/devices/DeviceDialog.vue";
import ApiKeyDialog from "../components/devices/ApiKeyDialog.vue";

type CreateDeviceResponse = components["schemas"]["CreateDeviceResponse"];

const authUser = useAuthUser();

const devices = ref<Device[]>([]);
const limit = ref<DeviceList["limit"]>({ max: null, used: 0 });
const loading = ref(true);

const formOpen = ref(false);
const editing = ref<Device | null>(null);

// The key is held only long enough to show it once. `issuedOpen` is separate so
// the dialog keeps its content while it animates out.
const issued = ref<CreateDeviceResponse | null>(null);
const issuedOpen = ref(false);
const issuedIsRotation = ref(false);

const limitReached = computed(() => limit.value.max !== null && limit.value.used >= limit.value.max);
const limitLabel = computed(() =>
  limit.value.max === null ? `${limit.value.used} of unlimited` : `${limit.value.used} of ${limit.value.max}`
);

async function load() {
  try {
    const res = await getDevices();
    devices.value = res.devices;
    limit.value = res.limit;
  } catch (e) {
    alertRequestError(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function openCreate() {
  editing.value = null;
  formOpen.value = true;
}

function openEdit(device: Device) {
  editing.value = device;
  formOpen.value = true;
}

function onCreated(res: CreateDeviceResponse) {
  formOpen.value = false;
  devices.value = [res.device, ...devices.value];
  limit.value = { ...limit.value, used: limit.value.used + 1 };
  showKey(res, false);
}

function onSaved(device: Device) {
  formOpen.value = false;
  replace(device);
}

function onRotated(res: CreateDeviceResponse) {
  replace(res.device);
  showKey(res, true);
}

function onDeleted(publicId: string) {
  devices.value = devices.value.filter((d) => d.publicId !== publicId);
  limit.value = { ...limit.value, used: Math.max(0, limit.value.used - 1) };
}

function showKey(res: CreateDeviceResponse, rotated: boolean) {
  issuedIsRotation.value = rotated;
  issued.value = res;
  issuedOpen.value = true;
}

function closeKey() {
  issuedOpen.value = false;
  // Drop the key once the dialog has finished animating out.
  setTimeout(() => {
    if (!issuedOpen.value) issued.value = null;
  }, 300);
}

function replace(device: Device) {
  devices.value = devices.value.map((d) => (d.publicId === device.publicId ? device : d));
}
</script>

<template>
  <div class="max-w-3xl space-y-5">
    <PageHeader title="Devices" description="Api keys for apps that read and write your clips: the desktop app, a script, a shortcut.">
      <Button v-if="devices.length" variant="primary" size="sm" :disabled="limitReached" @click="openCreate">
        <PlusIcon class="h-4 w-4" />New device
      </Button>
    </PageHeader>

    <Card title="Your devices" description="Each device holds one api key and works in a single folder." :padded="false">
      <template #header>
        <Badge :variant="limitReached ? 'warn' : 'neutral'">{{ limitLabel }}</Badge>
      </template>

      <div v-if="loading" class="space-y-4 px-5 py-4">
        <div v-for="i in 2" :key="i" class="flex items-start gap-3">
          <Skeleton class="h-8 w-8 shrink-0 rounded-md" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-4 w-40" />
            <Skeleton class="h-3 w-64" />
          </div>
        </div>
      </div>

      <EmptyState
        v-else-if="!devices.length"
        class="m-5 border-0 py-10"
        title="No devices yet"
        description="Create one to get an api key, then connect an app with it."
      >
        <template #icon><CpuChipIcon /></template>
        <Button variant="primary" size="sm" @click="openCreate">
          <PlusIcon class="h-4 w-4" />New device
        </Button>
      </EmptyState>

      <ul v-else class="divide-y divide-line">
        <li v-for="device in devices" :key="device.publicId">
          <DeviceRow
            :device="device"
            @edit="openEdit"
            @updated="replace"
            @rotated="onRotated"
            @deleted="onDeleted"
          />
        </li>
      </ul>

      <template v-if="limitReached" #footer>
        <p class="mr-auto text-sm text-muted">
          You have used every device on the {{ authUser.data?.plan || "free" }} plan.
        </p>
        <Button size="sm" variant="primary" :to="{ name: 'pricing' }">Upgrade to Pro</Button>
      </template>
    </Card>

    <Card title="How apps connect" description="The device api is the same one the desktop app and the browser extension use.">
      <ol class="space-y-3 text-sm text-muted">
        <li class="flex gap-3">
          <span class="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-fg">1</span>
          <span>Point the app at <code class="font-mono text-[13px] text-fg">{{ config.apiOrigin }}</code> and paste the api key.</span>
        </li>
        <li class="flex gap-3">
          <span class="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-fg">2</span>
          <span>The app calls <code class="font-mono text-[13px] text-fg">/api/legacy/connect</code> once to activate the key.</span>
        </li>
        <li class="flex gap-3">
          <span class="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-fg">3</span>
          <span>From then on it reads clips from the device's folder and adds new ones. File clips are never returned.</span>
        </li>
      </ol>
      <Divider class="my-4" />
      <p class="text-xs text-faint">
        Disable a device to block its key without losing it. Rotate the key if it leaks, and delete the device when the app is gone.
      </p>
    </Card>

    <DeviceDialog
      :open="formOpen"
      :device="editing"
      @close="formOpen = false"
      @created="onCreated"
      @saved="onSaved"
    />

    <ApiKeyDialog
      :open="issuedOpen"
      :api-key="issued?.apiKey || ''"
      :device-name="issued?.device.name || ''"
      :folder="issued?.device.folder || ''"
      :rotated="issuedIsRotation"
      @close="closeKey"
    />
  </div>
</template>
