<script setup lang="ts">
/** One device in the list, with its state, key hint, usage and actions. */
import { computed, ref } from "vue";
import {
  ArrowPathIcon,
  CpuChipIcon,
  EllipsisHorizontalIcon,
  FolderIcon,
  PauseCircleIcon,
  PencilSquareIcon,
  PlayCircleIcon,
  TrashIcon
} from "@heroicons/vue/20/solid";
import { alertRequestError } from "../../http";
import { askToConfirm } from "../ConfirmHandler";
import { deleteDevice, rotateDeviceKey, setDeviceEnabled, type Device } from "../../services/devices.service";
import { foldersAsObject } from "../../stores/tabs.store";
import type { components } from "../../types/api";
import Badge from "../ui/Badge.vue";
import DropdownMenu from "../ui/DropdownMenu.vue";
import DropdownItem from "../ui/DropdownItem.vue";
import IconButton from "../ui/IconButton.vue";
import Spinner from "../ui/Spinner.vue";

const props = defineProps<{ device: Device }>();

const emit = defineEmits<{
  (e: "edit", device: Device): void;
  (e: "updated", device: Device): void;
  (e: "rotated", res: components["schemas"]["CreateDeviceResponse"]): void;
  (e: "deleted", publicId: string): void;
}>();

const folderName = computed(() => foldersAsObject.value[props.device.folder]?.name || props.device.folder);
// Menu items are not LoadingButtons, so the row shows its own busy state.
const busy = ref(false);

async function run(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  try {
    await action();
  } catch (e) {
    alertRequestError(e);
  } finally {
    busy.value = false;
  }
}

function toggleEnabled() {
  return run(async () => {
    const res = await setDeviceEnabled(props.device.publicId, !props.device.enabled);
    emit("updated", res.device);
  });
}

async function rotate() {
  const ok = await askToConfirm({
    title: `Rotate the key for ${props.device.name}?`,
    message: "The current key stops working straight away and the app has to connect again with the new one.",
    confirmLabel: "Rotate key",
    danger: true
  });
  if (!ok) return;

  return run(async () => emit("rotated", await rotateDeviceKey(props.device.publicId)));
}

async function remove() {
  const ok = await askToConfirm({
    title: `Delete ${props.device.name}?`,
    message: "Its api key stops working immediately. Clips it created stay in your folders.",
    confirmLabel: "Delete",
    danger: true
  });
  if (!ok) return;

  return run(async () => {
    await deleteDevice(props.device.publicId);
    emit("deleted", props.device.publicId);
  });
}
</script>

<template>
  <div :class="['flex items-start gap-3 px-5 py-3.5 transition-opacity', busy ? 'opacity-60' : '']">
    <span
      :class="[
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
        device.enabled ? 'border-line bg-raised text-muted' : 'border-line bg-sunken text-faint'
      ]"
    >
      <CpuChipIcon class="h-4 w-4" />
    </span>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span :class="['truncate text-sm font-medium', device.enabled ? 'text-fg' : 'text-muted']">{{ device.name }}</span>
        <Badge v-if="!device.enabled" variant="warn">Disabled</Badge>
        <Badge v-else-if="!device.connected" variant="outline">Not connected yet</Badge>
      </div>

      <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span class="inline-flex items-center gap-1">
          <FolderIcon class="h-3.5 w-3.5 text-faint" />{{ folderName }}
        </span>
        <span class="font-mono text-faint" title="Last characters of the api key">…{{ device.keyHint }}</span>
        <span>{{ device.hits }} {{ device.hits === 1 ? "call" : "calls" }}</span>
        <span v-if="device.usedBy" class="truncate">from {{ device.usedBy }}</span>
        <span v-if="device.lastUsedAt">last used <TimeAgo :date="device.lastUsedAt" /></span>
        <span v-else>added <TimeAgo :date="device.createdAt" /></span>
      </div>
    </div>

    <Spinner v-if="busy" size="sm" class="mt-2 text-faint" />

    <DropdownMenu>
      <template #trigger>
        <IconButton label="Device actions" size="sm">
          <EllipsisHorizontalIcon />
        </IconButton>
      </template>

      <DropdownItem @click="emit('edit', device)">
        <template #icon><PencilSquareIcon /></template>Edit name and folder
      </DropdownItem>
      <DropdownItem @click="rotate">
        <template #icon><ArrowPathIcon /></template>Rotate api key
      </DropdownItem>
      <DropdownItem @click="toggleEnabled">
        <template #icon><PlayCircleIcon v-if="!device.enabled" /><PauseCircleIcon v-else /></template>
        {{ device.enabled ? "Disable" : "Enable" }}
      </DropdownItem>
      <DropdownItem danger @click="remove">
        <template #icon><TrashIcon /></template>Delete
      </DropdownItem>
    </DropdownMenu>
  </div>
</template>
