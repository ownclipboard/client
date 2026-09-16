<script setup lang="ts">
/** Full view of a clip: text with copy, url, or an inline file preview with download. */
import { computed, ref, watch } from "vue";
import { useClipboard } from "@vueuse/core";
import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, CheckIcon, ClipboardDocumentIcon, DocumentIcon } from "@heroicons/vue/20/solid";
import { ClipPreviewClip, closeClipPreview, ShowClipPreview } from "./ClipPreviewHandler";
import { getFileUrl } from "../services/files.service";
import { alertRequestError } from "../http";
import { foldersAsObject } from "../stores/tabs.store";
import Dialog from "./ui/Dialog.vue";
import Button from "./ui/Button.vue";
import Badge from "./ui/Badge.vue";
import Spinner from "./ui/Spinner.vue";

const clip = computed(() => ClipPreviewClip.value);

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif", "ico"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v", "ogv"];
const AUDIO_EXT = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];
const PDF_EXT = ["pdf"];
const TEXT_EXT = ["txt", "md", "json", "csv", "log", "xml", "yml", "yaml", "js", "ts", "css", "html", "sh"];

type FileKind = "image" | "video" | "audio" | "pdf" | "text" | "other";

const fileKind = computed<FileKind>(() => {
  const ext = clip.value?.file?.ext || "";
  if (IMAGE_EXT.includes(ext)) return "image";
  if (VIDEO_EXT.includes(ext)) return "video";
  if (AUDIO_EXT.includes(ext)) return "audio";
  if (PDF_EXT.includes(ext)) return "pdf";
  if (TEXT_EXT.includes(ext)) return "text";
  return "other";
});

const isFile = computed(() => clip.value?.type === "file" && !!clip.value.file);
const folderName = computed(() => (clip.value ? foldersAsObject.value[clip.value.folder]?.name || clip.value.folder : ""));
const fileLabel = computed(() => (clip.value?.file ? clip.value.file.publicId + (clip.value.file.ext ? "." + clip.value.file.ext : "") : ""));

const fileUrl = ref<string | null>(null);
const loadingUrl = ref(false);
const textBody = ref<string | null>(null);
const mediaError = ref(false);

watch(
  [ShowClipPreview, clip],
  async ([show, c]) => {
    fileUrl.value = null;
    textBody.value = null;
    mediaError.value = false;
    if (!show || !c || c.type !== "file" || !c.file) return;

    loadingUrl.value = true;
    try {
      fileUrl.value = await getFileUrl(c.file.publicId);
      // Small text files can be shown inline; this needs CORS GET on the bucket, so fall back quietly.
      if (fileKind.value === "text") {
        try {
          const res = await fetch(fileUrl.value);
          if (res.ok) {
            const body = await res.text();
            textBody.value = body.length > 200_000 ? body.slice(0, 200_000) + "\n…(truncated)" : body;
          }
        } catch {
          textBody.value = null;
        }
      }
    } catch (e) {
      alertRequestError(e);
    } finally {
      loadingUrl.value = false;
    }
  },
  { immediate: true }
);

const { copy } = useClipboard();
const copied = ref(false);
async function copyContent() {
  if (!clip.value) return;
  await copy(clip.value.context);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

function download() {
  if (fileUrl.value) window.open(fileUrl.value, "_blank");
}
</script>

<template>
  <Dialog :open="ShowClipPreview && !!clip" size="xl" flush @close="closeClipPreview">
    <template #header>
      <div v-if="clip" class="min-w-0">
        <div class="flex items-center gap-2 text-xs text-muted">
          <Badge variant="outline" uppercase>{{ clip.type }}</Badge>
          <span>{{ folderName }}</span>
          <span class="text-faint">·</span>
          <TimeAgo :date="clip.createdAt" />
        </div>
        <h2 v-if="clip.title" class="mt-1 truncate text-[15px] font-semibold text-fg">{{ clip.title }}</h2>
      </div>
    </template>

    <div v-if="clip" class="max-h-[70vh] overflow-auto scroll-thin p-5">
      <template v-if="isFile">
        <div v-if="loadingUrl" class="flex items-center justify-center gap-2 py-16 text-sm text-muted"><Spinner size="sm" /> Preparing preview</div>

        <template v-else-if="fileUrl && !mediaError">
          <img v-if="fileKind === 'image'" :src="fileUrl" :alt="clip.title || fileLabel" class="mx-auto max-h-[60vh] max-w-full rounded-md" @error="mediaError = true" />
          <video v-else-if="fileKind === 'video'" :src="fileUrl" controls class="mx-auto max-h-[60vh] max-w-full rounded-md" @error="mediaError = true"></video>
          <audio v-else-if="fileKind === 'audio'" :src="fileUrl" controls class="w-full" @error="mediaError = true"></audio>
          <iframe v-else-if="fileKind === 'pdf'" :src="fileUrl" class="h-[60vh] w-full rounded-md bg-white" title="PDF preview"></iframe>
          <pre v-else-if="fileKind === 'text' && textBody !== null" class="whitespace-pre-wrap break-words rounded-md bg-sunken p-4 text-xs leading-relaxed text-clip-fg">{{ textBody }}</pre>
          <div v-else class="flex flex-col items-center gap-2 py-12 text-center text-muted">
            <DocumentIcon class="h-10 w-10 text-faint" />
            <div class="break-all text-sm text-fg">{{ fileLabel }}</div>
            <div class="text-xs">No inline preview for this file type.</div>
          </div>
        </template>

        <div v-else class="flex flex-col items-center gap-2 py-12 text-center text-muted">
          <DocumentIcon class="h-10 w-10 text-faint" />
          <div class="break-all text-sm text-fg">{{ fileLabel }}</div>
          <div v-if="mediaError" class="text-xs">The file couldn't be displayed inline. Use Download instead.</div>
        </div>
      </template>

      <template v-else>
        <a
          v-if="clip.type === 'url'"
          :href="clip.context"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 break-all text-sm text-accent underline decoration-accent/40 underline-offset-2"
        >{{ clip.context }} <ArrowTopRightOnSquareIcon class="h-4 w-4 shrink-0" /></a>
        <pre v-else class="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-clip-fg">{{ clip.context }}</pre>
      </template>
    </div>

    <template #footer>
      <span v-if="clip" class="mr-auto text-xs text-muted">
        <template v-if="isFile && clip.file?.ext">{{ clip.file.ext.toUpperCase() }} file</template>
        <template v-else-if="clip">{{ clip.context.length.toLocaleString() }} characters</template>
      </span>
      <Button variant="ghost" @click="closeClipPreview">Close</Button>
      <Button v-if="isFile" variant="primary" :disabled="!fileUrl" @click="download"><ArrowDownTrayIcon class="h-4 w-4" /> Download</Button>
      <Button v-else variant="primary" @click="copyContent">
        <CheckIcon v-if="copied" class="h-4 w-4" /><ClipboardDocumentIcon v-else class="h-4 w-4" />
        {{ copied ? "Copied" : "Copy" }}
      </Button>
    </template>
  </Dialog>
</template>
