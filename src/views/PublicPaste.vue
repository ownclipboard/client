<script setup lang="ts">
/**
 * Public paste: anyone with the link can paste text (or an image) into this
 * folder without signing in. Clips pasted from this browser are listed below.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useTitle } from "@vueuse/core";
import { ClipboardDocumentIcon } from "@heroicons/vue/24/outline";
import config from "../config";
import { $http, alertRequestError } from "../http";
import type { OwnClip, OwnFolder } from "../types/models.types";
import { $localStorage } from "../stores/native";
import Paginator, { Pagination } from "../components/paginator/Paginator.vue";
import ClipRow from "../components/clips/ClipRow.vue";
import ThemeToggle from "../components/shell/ThemeToggle.vue";
import Spinner from "../components/ui/Spinner.vue";
import Kbd from "../components/ui/Kbd.vue";
import EmptyState from "../components/ui/EmptyState.vue";
import PasswordPrompt from "../components/PasswordPrompt.vue";
import ClipPreviewModal from "../components/ClipPreviewModal.vue";

const $route = useRoute();
const folder = ref<OwnFolder>();
const notFound = ref(false);
const clips = ref(Pagination<OwnClip>());
const isPasting = ref(false);
const pasteId = computed<string>(() => $route.params.pasteId as string);
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

type thisDeviceClips = Record<string, string[]>;
const thisDeviceClips = $localStorage.persistedReactive<thisDeviceClips>("public-clips", {});

function addToThisDeviceClips(clipPublicId: string) {
  if (!thisDeviceClips[pasteId.value]) thisDeviceClips[pasteId.value] = [];
  if (!thisDeviceClips[pasteId.value].includes(clipPublicId)) thisDeviceClips[pasteId.value].push(clipPublicId);
}

async function getFolderByPasteId() {
  if (!pasteId.value) return;
  try {
    const { folder: $folder } = await $http.get<any, { folder: OwnFolder }>(`/folders/public/${pasteId.value}`);
    folder.value = $folder;
    useTitle(`${folder.value.name} · Public paste`);
    await loadThisDeviceClips();
  } catch (e) {
    notFound.value = true;
    alertRequestError(e);
  }
}

async function loadThisDeviceClips() {
  const ids = thisDeviceClips[pasteId.value];
  if (!ids || !ids.length) return;
  try {
    const data = await $http.post<any, { clips: Pagination<OwnClip> }>(`/clips/find`, { ids }, { params: $route.query });
    clips.value = data.clips;
  } catch (e) {
    alertRequestError(e);
  }
}

async function pasteContent(content: string) {
  if (!content.trim() || isPasting.value) return;
  isPasting.value = true;
  try {
    const { clip } = await $http.post<any, { clip: OwnClip }>(`/clips/paste/${pasteId.value}`, { content });
    addToThisDeviceClips(clip.publicId);
    await loadThisDeviceClips();
  } catch (e) {
    alertRequestError(e);
  } finally {
    isPasting.value = false;
  }
}

async function pasteFromClipboard() {
  try {
    const content = await navigator.clipboard.readText();
    await pasteContent(content);
  } catch {
    // permission denied: the user can still use Cmd/Ctrl+V
  }
}

function isEditable(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  return !!node && (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.isContentEditable);
}

function onWindowPaste(e: ClipboardEvent) {
  if (isEditable(e.target)) return;
  const text = e.clipboardData?.getData("text/plain");
  if (!text) return;
  e.preventDefault();
  pasteContent(text);
}

onMounted(() => {
  getFolderByPasteId();
  window.addEventListener("paste", onWindowPaste);
});
onBeforeUnmount(() => window.removeEventListener("paste", onWindowPaste));
</script>

<template>
  <div class="min-h-screen bg-bg">
    <header class="flex h-14 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
      <RouterLink :to="{ name: 'index' }" class="flex items-center gap-2 text-fg">
        <img src="/logo.png" alt="" class="h-6 w-6 invert dark:invert-0" />
        <span class="text-[15px] font-semibold tracking-tight">{{ config.name }}</span>
      </RouterLink>
      <ThemeToggle />
    </header>

    <main class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <EmptyState v-if="notFound" title="This paste link doesn't exist" description="The folder's owner may have turned it off." />

      <template v-else-if="folder">
        <div class="mb-6">
          <p class="text-[11px] font-medium uppercase tracking-wider text-faint">Public paste</p>
          <h1 class="mt-1 text-2xl font-semibold tracking-tight text-fg">{{ folder.name }}</h1>
          <p class="mt-1 text-sm text-muted">Anything you paste here goes into this folder. You'll only see the clips you pasted from this browser.</p>
        </div>

        <button
          type="button"
          class="group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-surface px-6 py-14 text-center transition-colors hover:border-accent/60 hover:bg-accent-soft/30 focus-visible:border-accent"
          :disabled="isPasting"
          @click="pasteFromClipboard"
        >
          <template v-if="isPasting">
            <Spinner class="text-accent" />
            <span class="text-sm text-muted">Pasting</span>
          </template>
          <template v-else>
            <span class="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"><ClipboardDocumentIcon class="h-6 w-6" /></span>
            <span class="text-base font-medium text-fg">Click to paste from your clipboard</span>
            <span class="flex items-center gap-1 text-xs text-muted">or press <Kbd>{{ isMac ? "⌘" : "Ctrl" }}</Kbd><Kbd>V</Kbd> anywhere on this page</span>
          </template>
        </button>

        <section class="mt-10">
          <h2 class="mb-3 text-[11px] font-medium uppercase tracking-wider text-faint">Pasted from this browser</h2>
          <div v-if="clips.data.length" class="space-y-2">
            <ClipRow v-for="(clip, index) in clips.data" :key="clip.publicId" :clip="clip" :index="index" readonly />
            <Paginator :data="clips" @on-page-change="loadThisDeviceClips" />
          </div>
          <p v-else class="text-sm text-muted">Nothing pasted from this browser yet.</p>
        </section>
      </template>

      <div v-else class="flex items-center justify-center gap-2 py-20 text-sm text-muted"><Spinner size="sm" /> Loading</div>
    </main>

    <PasswordPrompt />
    <ClipPreviewModal />
  </div>
</template>
