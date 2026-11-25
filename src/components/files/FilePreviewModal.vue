<script setup lang="ts">
/**
 * Full view of one uploaded file. Mirrors the clip preview: the file is shown
 * inline where the browser can render it, and downloading stays a deliberate
 * click rather than something opening the moment a card is picked.
 *
 * `space` points the url at that space's storage instead of the account's. A
 * space file has no preview url, so it is always fetched.
 */
import { computed, ref, watch } from "vue";
import { ArrowDownTrayIcon, ChevronDownIcon, DocumentIcon, TrashIcon } from "@heroicons/vue/20/solid";
import { getFileUrl, humanFileSize, startDownload, type StoredFile } from "../../services/files.service";
import { getSpaceFileUrl } from "../../services/spaces.service";
import { alertRequestError } from "../../http";
import { foldersAsObject } from "../../stores/tabs.store";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import Spinner from "../ui/Spinner.vue";
import DownloadMenu from "./DownloadMenu.vue";

const props = withDefaults(
  defineProps<{
    file: StoredFile | null;
    open: boolean;
    /** A space's publicId, when the file is one of that space's. */
    space?: string;
    /** The folder's name, which only the list above knows for a space. */
    folderName?: string;
    canDelete?: boolean;
  }>(),
  { space: "", folderName: "", canDelete: true }
);
// Deleting is the page's job: it owns the list this file is in.
const emit = defineEmits<{ (e: "close"): void; (e: "delete"): void }>();

/** Text types the browser reports as something else, e.g. application/json. */
const TEXT_EXT = ["txt", "md", "json", "csv", "log", "xml", "yml", "yaml", "js", "ts", "css", "html", "sh"];

type FileKind = "image" | "video" | "audio" | "pdf" | "text" | "other";

const fileKind = computed<FileKind>(() => {
  const file = props.file;
  if (!file) return "other";
  const type = file.contentType;
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/") || TEXT_EXT.includes(file.ext)) return "text";
  return "other";
});

const folderLabel = computed(() => {
  if (props.folderName) return props.folderName;
  return props.file ? foldersAsObject.value[props.file.folder]?.name || props.file.folder : "";
});

/** The account's own file, or the space's. */
function urlOf(file: StoredFile) {
  return props.space ? getSpaceFileUrl(props.space, file.publicId) : getFileUrl(file.publicId);
}

// `src` draws the preview, `downloadUrl` is the signed one, fetched only when
// it is actually needed: a preview url costs no round trip.
const src = ref<string | null>(null);
const downloadUrl = ref<string | null>(null);
const loading = ref(false);
const textBody = ref<string | null>(null);
const mediaError = ref(false);

watch(
  () => [props.open, props.file] as const,
  async ([open, file]) => {
    src.value = null;
    downloadUrl.value = null;
    textBody.value = null;
    mediaError.value = false;
    if (!open || !file) return;

    if (file.previewUrl && file.status === "uploaded") {
      src.value = file.previewUrl;
    } else {
      loading.value = true;
      try {
        downloadUrl.value = await urlOf(file);
        src.value = downloadUrl.value;
      } catch (e) {
        alertRequestError(e);
      } finally {
        loading.value = false;
      }
    }

    // Text is read out of storage directly, which needs a CORS GET on the
    // bucket. Fall back to the plain card when that is not allowed.
    if (src.value && fileKind.value === "text") {
      try {
        const res = await fetch(src.value);
        if (res.ok) {
          const body = await res.text();
          textBody.value = body.length > 200_000 ? body.slice(0, 200_000) + "\n…(truncated)" : body;
        }
      } catch {
        textBody.value = null;
      }
    }
  },
  { immediate: true }
);

const downloading = ref(false);

/**
 * Asked for fresh each time rather than reusing `downloadUrl`: that one carries
 * no attachment, so it would open the file instead of saving it, and the name
 * the user picked is part of the url, so there is nothing here worth caching.
 */
async function download(name: "title" | "filename") {
  const file = props.file;
  if (!file) return;
  downloading.value = true;
  try {
    const options = { download: true, name } as const;
    const url = props.space
      ? await getSpaceFileUrl(props.space, file.publicId, options)
      : await getFileUrl(file.publicId, options);
    startDownload(url);
  } catch (e) {
    alertRequestError(e);
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <Dialog :open="open && !!file" size="xl" flush @close="emit('close')">
    <template #header>
      <div v-if="file" class="min-w-0">
        <div class="flex items-center gap-2 text-xs text-muted">
          <Badge variant="outline" uppercase>{{ file.ext || "file" }}</Badge>
          <span>{{ folderLabel }}</span>
          <span class="text-faint">·</span>
          <TimeAgo :date="file.uploadedAt || file.createdAt" />
        </div>
        <h2 class="mt-1 truncate text-[15px] font-semibold text-fg">{{ file.title || file.name }}</h2>
      </div>
    </template>

    <div v-if="file" class="max-h-[70vh] overflow-auto scroll-thin p-5">
      <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Spinner size="sm" /> Preparing preview
      </div>

      <template v-else-if="src && !mediaError">
        <img v-if="fileKind === 'image'" :src="src" :alt="file.title || file.name" class="mx-auto max-h-[60vh] max-w-full rounded-md" @error="mediaError = true" />
        <video v-else-if="fileKind === 'video'" :src="src" controls class="mx-auto max-h-[60vh] max-w-full rounded-md" @error="mediaError = true"></video>
        <audio v-else-if="fileKind === 'audio'" :src="src" controls class="w-full" @error="mediaError = true"></audio>
        <iframe v-else-if="fileKind === 'pdf'" :src="src" class="h-[60vh] w-full rounded-md bg-white" :title="file.name"></iframe>
        <pre v-else-if="fileKind === 'text' && textBody !== null" class="whitespace-pre-wrap break-words rounded-md bg-sunken p-4 text-xs leading-relaxed text-clip-fg">{{ textBody }}</pre>
        <div v-else class="flex flex-col items-center gap-2 py-12 text-center text-muted">
          <DocumentIcon class="h-10 w-10 text-faint" />
          <div class="break-all text-sm text-fg">{{ file.name }}</div>
          <div class="text-xs">No inline preview for this file type.</div>
        </div>
      </template>

      <div v-else class="flex flex-col items-center gap-2 py-12 text-center text-muted">
        <DocumentIcon class="h-10 w-10 text-faint" />
        <div class="break-all text-sm text-fg">{{ file.name }}</div>
        <div v-if="mediaError" class="text-xs">The file couldn't be displayed inline. Use Download instead.</div>
        <div v-else-if="file.status === 'pending'" class="text-xs">This upload never finished, so there is nothing to show.</div>
      </div>
    </div>

    <template #footer>
      <span v-if="file" class="text-xs text-muted">
        {{ humanFileSize(file.size) }}<template v-if="file.ext"> · {{ file.ext.toUpperCase() }} file</template>
      </span>
      <!-- Kept on the left, away from Download: the two are one slip apart otherwise. -->
      <Button v-if="canDelete" variant="danger" size="sm" class="mr-auto" @click="emit('delete')">
        <TrashIcon class="h-4 w-4" /> Delete
      </Button>
      <Button variant="ghost" @click="emit('close')">Close</Button>
      <DownloadMenu placement="top" :disabled="file?.status === 'pending'" @download="download">
        <template #trigger>
          <Button variant="primary" :disabled="file?.status === 'pending'">
            <Spinner v-if="downloading" size="sm" /><ArrowDownTrayIcon v-else class="h-4 w-4" /> Download
            <ChevronDownIcon class="h-4 w-4 opacity-70" />
          </Button>
        </template>
      </DownloadMenu>
    </template>
  </Dialog>
</template>
