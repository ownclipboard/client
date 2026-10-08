<script setup lang="ts">
/**
 * One clip inside a space. Everyone sees every clip, but only its author can
 * edit or delete it, so the row shows who added it and offers those actions to
 * them alone. Anyone can take a copy into another folder of the space, or into
 * their own clipboard.
 */
import { computed, nextTick, ref } from "vue";
import { useClipboard } from "@vueuse/core";
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  Bars3BottomLeftIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  DocumentIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  InboxArrowDownIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon
} from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import { askToConfirm } from "../ConfirmHandler";
import { askForFolder } from "../FolderPickerHandler";
import { previewClip } from "../ClipPreviewHandler";
import { $alert } from "../ws-alert/ws-alert";
import {
  deleteSpaceClip,
  getSpaceFileUrl,
  moveSpaceClips,
  transferSpaceClip,
  updateSpaceClip,
  type SpaceClip
} from "../../services/spaces.service";
import { currentSpaceFolders } from "../../stores/spaces.store";
import { getFolders } from "../../stores/tabs.store";
import type { OwnClip } from "../../types/models.types";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import IconButton from "../ui/IconButton.vue";
import DropdownMenu from "../ui/DropdownMenu.vue";
import DropdownItem from "../ui/DropdownItem.vue";
import Textarea from "../ui/Textarea.vue";

const props = defineProps<{
  spaceId: string;
  clip: SpaceClip;
  /** Shown when the list mixes folders, as search results do. */
  showFolder?: boolean;
}>();

const emit = defineEmits<{ (e: "changed"): void; (e: "deleted", publicId: string): void }>();

const TYPE_ICON: Record<string, any> = { text: Bars3BottomLeftIcon, url: LinkIcon, file: DocumentIcon };

const isFile = computed(() => props.clip.type === "file");
const fileLabel = computed(() => props.clip.file?.name || props.clip.title || "File");
const folderName = computed(
  () => currentSpaceFolders.value.find((f) => f.slug === props.clip.folder)?.name || props.clip.folder
);

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

/* ---------------- Preview and download ---------------- */

/**
 * The preview modal speaks the personal clip shape, so a space clip is dressed
 * as one. Its url comes from the space endpoint through the resolver.
 */
const asOwnClip = computed<OwnClip>(() => ({
  publicId: props.clip.publicId,
  title: props.clip.title || "",
  type: props.clip.type as OwnClip["type"],
  folder: props.clip.folder,
  context: props.clip.context,
  file: props.clip.file ? { publicId: props.clip.file.name, ext: props.clip.file.ext } : undefined,
  locked: false,
  favorite: false,
  encrypted: false,
  createdAt: props.clip.createdAt
}));

function openPreview() {
  previewClip(asOwnClip.value, () => getSpaceFileUrl(props.spaceId, props.clip.publicId));
}

async function download(btn: ILoadingButton) {
  // Opened first, so the browser does not treat the url that arrives later as a popup.
  const tab = window.open("", "_blank");
  try {
    const url = await getSpaceFileUrl(props.spaceId, props.clip.publicId);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (e) {
    tab?.close();
    alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}

/* ---------------- Copy ---------------- */

const { copy } = useClipboard();
const copied = ref(false);

async function copyText(btn?: ILoadingButton) {
  await copy(props.clip.context);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
  btn?.stopLoading();
}

/** Into another folder of the same space. Only the author of a clip can move it. */
async function moveToFolder() {
  const choices = currentSpaceFolders.value.map((f) => ({
    name: f.name,
    slug: f.slug,
    contents: f.contents || 0,
    visibility: "public" as const
  }));
  const folder = await askForFolder("Move to which folder of this space?", [props.clip.folder], choices);
  if (!folder) return;

  return run(async () => {
    const res = await moveSpaceClips(props.spaceId, [props.clip.publicId], folder.slug);
    const skipped = res.skipped?.[0];
    if (skipped) $alert.warning(SKIP_REASONS[skipped.reason] || "The clip was skipped.");
    emit("changed");
  });
}

const SKIP_REASONS: Record<string, string> = {
  same_folder: "The clip is already in that folder.",
  not_found: "The clip no longer exists.",
  not_author: "Only the member who added a clip can move it."
};

/** Out of the space and into the member's own clipboard. */
async function keepACopy() {
  const folder = await askForFolder("Keep a copy in which of your folders?");
  if (!folder) return;

  return run(async () => {
    await transferSpaceClip(props.spaceId, props.clip.publicId, folder.slug);
    // The copy landed in the user's own folders, so their counts moved.
    getFolders().catch(() => {});
  });
}

/* ---------------- Edit and delete ---------------- */

const isEditing = ref(false);
const editForm = ref({ title: "", content: "" });
const editTitle = ref<HTMLInputElement>();

async function startEditing() {
  editForm.value = { title: props.clip.title || "", content: props.clip.context };
  isEditing.value = true;
  await nextTick();
  editTitle.value?.focus();
}

function cancelEditing() {
  isEditing.value = false;
}

function saveClip(btn: ILoadingButton) {
  const title = editForm.value.title.trim();
  const content = editForm.value.content;

  if (!isFile.value && !content.trim()) {
    $alert.error("Content can't be empty.");
    return btn.stopLoading();
  }

  return updateSpaceClip(props.spaceId, props.clip.publicId, {
    title,
    content: isFile.value ? undefined : content
  })
    .then(() => {
      isEditing.value = false;
      emit("changed");
    })
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}

async function remove() {
  const ok = await askToConfirm({
    title: "Delete this clip?",
    message: props.clip.title
      ? `"${props.clip.title}" is removed for everyone in the space.`
      : "The clip is removed for everyone in the space.",
    confirmLabel: "Delete",
    danger: true
  });
  if (!ok) return;

  return run(async () => {
    await deleteSpaceClip(props.spaceId, props.clip.publicId);
    emit("deleted", props.clip.publicId);
  });
}
</script>

<template>
  <article
    :class="[
      'group relative grid grid-cols-1 gap-x-3 gap-y-2 rounded-lg border bg-surface px-4 py-3 transition-shadow sm:grid-cols-[1fr_auto]',
      isEditing ? 'border-accent/40 ring-4 ring-accent/10' : 'border-line hover:border-line-strong hover:shadow-card',
      busy ? 'opacity-50' : ''
    ]"
    @keydown.esc.prevent="isEditing && cancelEditing()"
  >
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Badge :variant="isFile ? 'info' : 'outline'" uppercase>
          <component :is="TYPE_ICON[clip.type] || Bars3BottomLeftIcon" class="h-3 w-3" />
          {{ clip.type }}
        </Badge>
        <input
          v-if="isEditing"
          ref="editTitle"
          v-model="editForm.title"
          type="text"
          placeholder="Title (optional)"
          class="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 text-sm font-medium text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <span v-else-if="clip.title" class="truncate font-medium text-fg">{{ clip.title }}</span>
        <Badge v-if="showFolder" variant="neutral">{{ folderName }}</Badge>
      </div>

      <div class="mt-1">
        <template v-if="isEditing">
          <div v-if="isFile" class="flex items-center gap-1.5 text-xs text-muted">
            <DocumentIcon class="h-4 w-4 text-faint" /> {{ fileLabel }}
            <span class="text-faint">· file name can't be changed</span>
          </div>
          <Textarea v-else v-model="editForm.content" :rows="6" />
          <div class="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" @click="cancelEditing">Cancel</Button>
            <Button size="sm" variant="primary" :click="saveClip" message="Saving">Save</Button>
          </div>
        </template>

        <template v-else>
          <button
            v-if="clip.type === 'text'"
            type="button"
            class="block w-full overflow-hidden whitespace-pre-wrap break-words text-left text-[13px] leading-relaxed text-fg/90 [-webkit-box-orient:vertical] [-webkit-line-clamp:3] [display:-webkit-box]"
            title="Open preview"
            @click="openPreview"
          >{{ clip.context }}</button>
          <a
            v-else-if="clip.type === 'url'"
            :href="clip.context"
            target="_blank"
            rel="noopener"
            class="break-all text-[13px] text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >{{ clip.context }}</a>
          <button
            v-else
            type="button"
            class="flex items-center gap-1.5 text-[13px] text-fg/90 hover:text-accent"
            title="Open preview"
            @click="openPreview"
          >
            <DocumentIcon class="h-4 w-4 text-faint" /> {{ fileLabel }}
          </button>
        </template>
      </div>

      <div v-if="!isEditing" class="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-faint">
        <span v-if="clip.author" :class="clip.mine ? 'text-accent' : ''">{{ clip.mine ? "You" : clip.author }}</span>
        <TimeAgo :date="clip.createdAt" />
        <span v-if="isFile">· {{ clip.size.human }}</span>
        <span v-else>· {{ clip.context.length.toLocaleString() }} chars</span>
      </div>
    </div>

    <div v-if="!isEditing" class="flex items-start gap-1 sm:opacity-0 sm:transition-opacity sm:focus-within:opacity-100 sm:group-hover:opacity-100">
      <IconButton v-if="isFile" label="Preview" size="sm" @click="openPreview"><EyeIcon /></IconButton>
      <IconButton v-else-if="clip.type === 'url'" label="Open link" size="sm" :href="clip.context">
        <ArrowTopRightOnSquareIcon />
      </IconButton>

      <IconButton v-if="isFile" label="Download" size="sm" :click="download"><ArrowDownTrayIcon /></IconButton>
      <IconButton v-else :label="copied ? 'Copied' : 'Copy'" size="sm" :variant="copied ? 'primary' : 'ghost'" :click="copyText">
        <CheckIcon v-if="copied" />
        <ClipboardDocumentIcon v-else />
      </IconButton>

      <DropdownMenu>
        <template #trigger>
          <IconButton label="Clip actions" size="sm"><EllipsisHorizontalIcon /></IconButton>
        </template>

        <DropdownItem v-if="clip.mine" @click="startEditing">
          <template #icon><PencilSquareIcon /></template>{{ isFile ? "Edit title" : "Edit" }}
        </DropdownItem>
        <DropdownItem v-if="clip.mine" @click="moveToFolder">
          <template #icon><ArrowsRightLeftIcon /></template>Move to folder
        </DropdownItem>
        <DropdownItem @click="keepACopy">
          <template #icon><InboxArrowDownIcon /></template>Keep a copy in my clips
        </DropdownItem>
        <DropdownItem v-if="clip.mine" danger @click="remove">
          <template #icon><TrashIcon /></template>Delete
        </DropdownItem>
      </DropdownMenu>
    </div>
  </article>
</template>
