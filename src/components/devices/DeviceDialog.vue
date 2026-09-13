<script setup lang="ts">
/**
 * Create a device, or edit an existing one's name and folder. Renaming and
 * moving are two endpoints, so an edit only sends what actually changed.
 */
import { computed, ref, watch } from "vue";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { $alert } from "../ws-alert/ws-alert";
import { folders } from "../../stores/tabs.store";
import { createDevice, renameDevice, setDeviceFolder, type Device } from "../../services/devices.service";
import type { components } from "../../types/api";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";
import Input from "../ui/Input.vue";
import Select from "../ui/Select.vue";

const props = defineProps<{
  open: boolean;
  /** Null creates a device, otherwise the device being edited. */
  device: Device | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "created", res: components["schemas"]["CreateDeviceResponse"]): void;
  (e: "saved", device: Device): void;
}>();

const name = ref("");
const folder = ref("clipboard");

// Encrypted folders are refused by the API: a device has no way to hold the password.
const options = computed(() => folders.value.filter((f) => f.visibility !== "encrypted"));
const isEdit = computed(() => !!props.device);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    name.value = props.device?.name ?? "";
    folder.value = props.device?.folder ?? "clipboard";
  },
  { immediate: true }
);

function save(btn: ILoadingButton) {
  const trimmed = name.value.trim();

  if (trimmed.length < 2 || trimmed.length > 50) {
    $alert.warning("Give the device a name between 2 and 50 characters.");
    return btn.stopLoading();
  }

  const run = props.device ? update(props.device, trimmed) : create(trimmed);
  return run.catch(alertRequestError).finally(btn.stopLoading);
}

async function create(deviceName: string) {
  const res = await createDevice(deviceName, folder.value);
  emit("created", res);
}

async function update(device: Device, deviceName: string) {
  let latest = device;
  if (deviceName !== device.name) latest = (await renameDevice(device.publicId, deviceName)).device;
  if (folder.value !== device.folder) latest = (await setDeviceFolder(device.publicId, folder.value)).device;
  emit("saved", latest);
}
</script>

<template>
  <Dialog
    :open="open"
    size="md"
    :title="isEdit ? 'Edit device' : 'New device'"
    :description="isEdit
      ? 'Change what this device is called and which folder it uses.'
      : 'Creates an api key an app can use to read and write your clips.'"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent>
      <Input
        v-model="name"
        label="Name"
        placeholder="My Laptop"
        maxlength="50"
        autocomplete="off"
        hint="How you will recognise this app in the list."
      />

      <Select v-model="folder" label="Folder">
        <option v-for="f in options" :key="f.slug" :value="f.slug">{{ f.name }}</option>
      </Select>
      <p class="-mt-2 text-xs text-muted">
        The device reads and writes clips here. Encrypted folders cannot be used.
        <template v-if="isEdit"> Clips it already created stay where they are.</template>
      </p>
    </form>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Cancel</Button>
      <Button variant="primary" type="submit" :click="save" :message="isEdit ? 'Saving' : 'Creating'">
        {{ isEdit ? "Save changes" : "Create device" }}
      </Button>
    </template>
  </Dialog>
</template>
