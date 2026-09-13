<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useClipboard } from "@vueuse/core";
import Modal from "./Modal.vue";
import { ClipPreviewClip, closeClipPreview, ShowClipPreview } from "./ClipPreviewHandler";
import { getFileUrl } from "../services/files.service";
import { alertRequestError } from "../http";
import { foldersAsObject } from "../stores/tabs.store";

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

// Presigned url for file clips, fetched when the modal opens.
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
  <Modal v-if="ShowClipPreview && clip" max-size="max-w-4xl" @close-modal="closeClipPreview">
    <div @keydown.esc="closeClipPreview">
      <div class="p-3 pr-12 border-b border-gray-800">
        <div class="flex items-center space-x-2 text-xs text-gray-500">
          <small class="bg-gray-700 text-gray-200 p-1 rounded uppercase font-medium">{{ clip.type }}</small>
          <span><i class="far fa-folder mr-1"></i>{{ folderName }}</span>
          <TimeAgo :date="clip.updatedAt" />
        </div>
        <div class="text-lg font-bold text-green-400 mt-1 break-words">
          {{ clip.title || (isFile ? clip.context : "Untitled clip") }}
        </div>
      </div>

      <div class="p-3 max-h-[70vh] overflow-auto">
        <!-- File clips -->
        <template v-if="isFile">
          <div v-if="loadingUrl" class="text-center text-gray-500 py-10">
            <i class="fa fa-slash fa-spin mr-2"></i>Preparing preview...
          </div>

          <template v-else-if="fileUrl && !mediaError">
            <img
              v-if="fileKind === 'image'"
              :src="fileUrl"
              :alt="clip.context"
              class="max-w-full max-h-[60vh] mx-auto rounded"
              @error="mediaError = true" />
            <video
              v-else-if="fileKind === 'video'"
              :src="fileUrl"
              controls
              class="max-w-full max-h-[60vh] mx-auto rounded"
              @error="mediaError = true"></video>
            <audio
              v-else-if="fileKind === 'audio'"
              :src="fileUrl"
              controls
              class="w-full"
              @error="mediaError = true"></audio>
            <iframe
              v-else-if="fileKind === 'pdf'"
              :src="fileUrl"
              class="w-full h-[60vh] rounded bg-white"
              title="PDF preview"></iframe>
            <pre
              v-else-if="fileKind === 'text' && textBody !== null"
              class="bg-gray-900 rounded p-3 text-xs font-mono whitespace-pre-wrap break-words text-antiquewhite">{{ textBody }}</pre>
            <div v-else class="text-center py-10 text-gray-400">
              <i class="far fa-file fa-4x mb-3"></i>
              <div class="break-all">{{ clip.context }}</div>
              <div class="text-xs mt-1">No inline preview for this file type.</div>
            </div>
          </template>

          <div v-else class="text-center py-10 text-gray-400">
            <i class="far fa-file fa-4x mb-3"></i>
            <div class="break-all">{{ clip.context }}</div>
            <div v-if="mediaError" class="text-xs mt-1">The file could not be displayed inline. Use Download instead.</div>
          </div>
        </template>

        <!-- Text / url clips -->
        <template v-else>
          <a
            v-if="clip.type === 'url'"
            :href="clip.context"
            target="_blank"
            rel="noopener"
            class="text-green-400 hover:text-green-500 break-all font-mono text-sm">{{ clip.context }}</a>
          <pre
            v-else
            class="font-mono text-sm whitespace-pre-wrap break-words text-antiquewhite">{{ clip.context }}</pre>
        </template>
      </div>

      <div class="p-3 border-t border-gray-800 flex items-center justify-between text-sm font-medium">
        <span v-if="isFile && clip.file?.ext" class="text-xs text-gray-500 uppercase">{{ clip.file.ext }} file</span>
        <span v-else class="text-xs text-gray-500">{{ clip.context.length }} characters</span>
        <div class="space-x-3">
          <button
            v-if="isFile"
            type="button"
            :disabled="!fileUrl"
            @click="download"
            class="px-3 py-2 rounded bg-green-300 hover:bg-green-400 text-gray-800">
            <i class="fa fa-download mr-1"></i>Download
          </button>
          <button
            v-else
            type="button"
            @click="copyContent"
            class="px-3 py-2 rounded bg-green-300 hover:bg-green-400 text-gray-800">
            <i class="fa fa-copy mr-1"></i>{{ copied ? "Copied!" : "Copy" }}
          </button>
          <button type="button" @click="closeClipPreview" class="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700">
            Close
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>
