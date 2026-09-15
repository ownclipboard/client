<script setup lang="ts">
/**
 * Shows an api key exactly once, right after a device is created or its key is
 * rotated. The server only keeps a hash, so a key that is not saved here is gone.
 */
import { computed, ref, watch } from "vue";
import { useClipboard } from "@vueuse/core";
import { CheckIcon, ClipboardDocumentIcon, ExclamationTriangleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/vue/20/solid";
import config from "../../config";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";
import IconButton from "../ui/IconButton.vue";

const props = defineProps<{
  open: boolean;
  apiKey: string;
  deviceName: string;
  folder: string;
  /** The key replaced an older one rather than belonging to a brand new device. */
  rotated?: boolean;
}>();

const emit = defineEmits<{ (e: "close"): void }>();

const { copy, copied } = useClipboard({ copiedDuring: 2000 });
const revealed = ref(false);

// Every key starts hidden, including the second one shown in a session.
watch(() => props.open, (open) => open && (revealed.value = false));

const masked = computed(() => "\u2022".repeat(48));

/** The real command, always copied. */
const connectSnippet = computed(() => snippet(props.apiKey));
/** What is drawn: hiding the key has to hide it here too. */
const shownSnippet = computed(() => snippet(revealed.value ? props.apiKey : masked.value));

function snippet(key: string) {
  return `curl -X POST ${config.apiOrigin}/api/connect \\
  -H "oc-key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"device_id":"${slugId(props.deviceName)}"}'`;
}

function slugId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-app";
}
</script>

<template>
  <Dialog
    :open="open"
    size="lg"
    :title="rotated ? 'New api key' : 'Device created'"
    :description="rotated
      ? `The old key for ${deviceName} stopped working. Update the app with the key below.`
      : `${deviceName} can now read and write clips in the ${folder} folder.`"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <div class="flex items-start gap-2.5 rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
        <ExclamationTriangleIcon class="mt-px h-4 w-4 shrink-0" />
        <p>Copy this key now. We only store a hash of it, so we can't show it again. If you lose it, rotate the key.</p>
      </div>

      <div>
        <span class="mb-1.5 block text-[13px] font-medium text-fg">Api key</span>
        <div class="flex items-center gap-1.5 rounded-md border border-line bg-sunken px-3 py-2">
          <code class="min-w-0 flex-1 break-all font-mono text-[13px] leading-5 text-fg">{{ revealed ? apiKey : masked }}</code>
          <IconButton
            size="sm"
            :label="revealed ? 'Hide key' : 'Show key'"
            @click="revealed = !revealed"
          >
            <EyeSlashIcon v-if="revealed" />
            <EyeIcon v-else />
          </IconButton>
          <IconButton size="sm" :label="copied ? 'Copied' : 'Copy key'" :variant="copied ? 'primary' : 'ghost'" @click="copy(apiKey)">
            <CheckIcon v-if="copied" />
            <ClipboardDocumentIcon v-else />
          </IconButton>
        </div>
      </div>

      <div>
        <span class="mb-1.5 block text-[13px] font-medium text-fg">Connect the app once</span>
        <p class="mb-2 text-sm text-muted">
          A key has to be connected before any other call accepts it. Send it as the <code class="font-mono text-[13px] text-fg">oc-key</code> header,
          an <code class="font-mono text-[13px] text-fg">api_key</code> query param or an <code class="font-mono text-[13px] text-fg">api_key</code> body field.
        </p>
        <div class="relative rounded-md border border-line bg-sunken">
          <pre class="scroll-thin overflow-x-auto px-3 py-2.5 pr-11 font-mono text-[12px] leading-5 text-fg">{{ shownSnippet }}</pre>
          <IconButton class="absolute right-1.5 top-1.5" size="sm" label="Copy command" @click="copy(connectSnippet)">
            <ClipboardDocumentIcon />
          </IconButton>
        </div>
        <p class="mt-2 text-xs text-faint">
          After that the app can read clips from <code class="font-mono">/api/all</code>, add one with
          <code class="font-mono">/api/add</code> and remove one with <code class="font-mono">/api/delete</code>.
        </p>
      </div>
    </div>

    <template #footer>
      <Button variant="primary" @click="emit('close')">Done</Button>
    </template>
  </Dialog>
</template>
