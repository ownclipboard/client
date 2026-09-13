<script lang="ts" setup>
/**
 * One clip in the list. Handles copy, download, preview, unlock/hide for
 * encrypted clips, inline editing (Pro), move / copy to folder, and delete.
 */
import { computed, reactive, ref, nextTick, type PropType } from "vue";
import { useClipboard } from "@vueuse/core";
import type { ILoadingButton } from "revue-components/vues/component-types";
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
  DocumentIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  EyeSlashIcon,
  FolderArrowDownIcon,
  LinkIcon,
  LockClosedIcon,
  LockOpenIcon,
  PencilIcon,
  TrashIcon,
  Bars3BottomLeftIcon,
  CodeBracketIcon
} from "@heroicons/vue/20/solid";
import { $events } from "../../events";
import { useAuthUser } from "../../stores/auth.store";
import { foldersAsObject, getFolders } from "../../stores/tabs.store";
import { askForFolder } from "../FolderPickerHandler";
import { getFileUrl } from "../../services/files.service";
import { previewClip } from "../ClipPreviewHandler";
import { refreshAuthData } from "../../services/auth.service";
import { aesDecrypt, aesEncrypt } from "../../functions/crypto";
import { $http, alertRequestError } from "../../http";
import { checkFolderPassword } from "../../services/clips.services";
import type { OwnClip } from "../../types/models.types";
import { askForPassword } from "../PasswordPromptHandler";
import { $alert } from "../ws-alert/ws-alert";
import IconButton from "../ui/IconButton.vue";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import DropdownMenu from "../ui/DropdownMenu.vue";
import DropdownItem from "../ui/DropdownItem.vue";
import Divider from "../ui/Divider.vue";
import Textarea from "../ui/Textarea.vue";

const props = defineProps({
  clip: { type: Object as PropType<OwnClip>, required: true },
  index: { type: Number, required: true },
  canDelete: { type: Boolean, default: false },
  // Show the folder the clip belongs to (cross-folder search results)
  showFolder: { type: Boolean, default: false },
  // Public paste page: no editing, moving or deleting.
  readonly: { type: Boolean, default: false }
});

const clip = computed(() => props.clip);
const authUser = useAuthUser();
const isPro = computed(() => authUser.data?.plan === "pro");
const isFile = computed(() => clip.value.type === "file" && !!clip.value.file);
const isLocked = computed(() => clip.value.encrypted && !clip.value.decrypted);
const folderName = computed(() => foldersAsObject.value[clip.value.folder]?.name || clip.value.folder);
const fileLabel = computed(() => (clip.value.file ? clip.value.file.publicId + (clip.value.file.ext ? "." + clip.value.file.ext : "") : ""));

const TYPE_ICON: Record<OwnClip["type"], any> = {
  text: Bars3BottomLeftIcon,
  url: LinkIcon,
  html: CodeBracketIcon,
  file: DocumentIcon
};

/* ---------------- Copy ---------------- */

const { copy } = useClipboard();
const copied = ref(false);

function copyClip(btn?: ILoadingButton) {
  copy(clip.value.context);
  copied.value = true;
  btn?.stopLoading();
  setTimeout(() => (copied.value = false), 2000);
}

/* ---------------- Encryption ---------------- */

// Ciphertext kept aside while a clip is shown decrypted, so it can be hidden again.
const encryptedContext = ref<string | null>(null);

async function unlock(btn: ILoadingButton) {
  let password = await askForPassword(`Enter the password for "${folderName.value}" to read this clip.`);
  if (!password) return btn.stopLoading();

  if (!(await checkFolderPassword(clip.value.folder, password))) {
    $alert.error(`Incorrect password for "${folderName.value}".`);
    return btn.stopLoading();
  }

  try {
    const plain = aesDecrypt(clip.value.context, password);
    if (!plain) throw new Error("Could not decrypt this clip.");
    encryptedContext.value = clip.value.context;
    clip.value.decrypted = true;
    clip.value.context = plain;
  } catch (e: any) {
    $alert.error(e.message);
  } finally {
    password = "";
    btn.stopLoading();
  }
}

function hide() {
  if (encryptedContext.value === null) return;
  clip.value.context = encryptedContext.value;
  clip.value.decrypted = false;
  encryptedContext.value = null;
  isEditing.value = false;
}

/* ---------------- Edit (Pro) ---------------- */

const isEditing = ref(false);
const editForm = reactive({ title: "", content: "" });
const editBody = ref<InstanceType<typeof Textarea>>();
const editTitle = ref<HTMLInputElement>();

async function startEditing() {
  editForm.title = clip.value.title || "";
  editForm.content = clip.value.context;
  isEditing.value = true;
  await nextTick();
  if (isFile.value) editTitle.value?.focus();
  else editBody.value?.focus();
}

function cancelEditing() {
  isEditing.value = false;
}

async function saveClip(btn: ILoadingButton) {
  const content = editForm.content.trim();
  const title = editForm.title.trim();

  if (!isFile.value && !content.length) {
    $alert.error("Content can't be empty.");
    return btn.stopLoading();
  }

  const data: { title?: string; content?: string } = {};
  if (title !== (clip.value.title || "")) data.title = title;

  let contentToSend = content;
  if (!isFile.value && content !== clip.value.context) {
    if (clip.value.encrypted) {
      let password = await askForPassword(`Enter the password for "${folderName.value}" to save this clip.`);
      if (!password) return btn.stopLoading();
      if (!(await checkFolderPassword(clip.value.folder, password))) {
        $alert.error(`Incorrect password for "${folderName.value}".`);
        return btn.stopLoading();
      }
      contentToSend = aesEncrypt(content, password);
      password = "";
    }
    data.content = contentToSend;
  }

  if (!Object.keys(data).length) {
    isEditing.value = false;
    return btn.stopLoading();
  }

  try {
    await $http.post(`/clip/${clip.value.publicId}/update`, data);
    if (data.title !== undefined) clip.value.title = title;
    if (data.content !== undefined) {
      clip.value.context = content;
      if (clip.value.encrypted) encryptedContext.value = contentToSend;
    }
    clip.value.updatedAt = new Date().toISOString();
    isEditing.value = false;
  } catch (e: any) {
    alertRequestError(e);
    // A 403 means the plan changed server side (e.g. subscription expired), sync it.
    if (e?.response?.status === 403) await refreshAuthData(authUser);
  } finally {
    btn.stopLoading();
  }
}

/* ---------------- Move / Copy to folder ---------------- */

type TransferResponse = {
  folder: string;
  skipped: { id: string; reason: "encrypted" | "not_found" | "same_folder" | "file" }[];
};

const SKIP_REASONS: Record<TransferResponse["skipped"][number]["reason"], string> = {
  encrypted: "Encrypted clips can't be moved or copied.",
  not_found: "This clip no longer exists.",
  same_folder: "The clip is already in that folder.",
  file: "Files can't be copied. Move them instead."
};

const transferring = ref(false);

async function transfer(action: "move" | "copy") {
  const folder = await askForFolder(action === "move" ? "Move clip to" : "Copy clip to", [clip.value.folder]);
  if (!folder) return;

  transferring.value = true;
  try {
    const res = await $http.post<any, TransferResponse>(`/clips/${action}`, { ids: [clip.value.publicId], folder: folder.slug });
    const skipped = res.skipped?.[0];
    if (skipped) $alert.warning(SKIP_REASONS[skipped.reason] || "The clip was skipped.");
    await getFolders();
    if (action === "move" && !skipped) $events.emit("refreshClips");
  } catch (e: any) {
    alertRequestError(e);
    if (e?.response?.status === 403) await refreshAuthData(authUser);
  } finally {
    transferring.value = false;
  }
}

/* ---------------- File download ---------------- */

async function downloadFile(btn: ILoadingButton) {
  // Open the tab first so the browser doesn't treat the async open as a popup.
  const tab = window.open("", "_blank");
  try {
    const url = await getFileUrl(clip.value.file!.publicId);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (e) {
    tab?.close();
    alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}

/* ---------------- Delete ---------------- */

const deleting = ref(false);
function remove() {
  if (!props.canDelete) return;
  deleting.value = true;
  $events.emit("delete-clip", {
    btn: { stopLoading: () => (deleting.value = false) },
    data: [clip.value, props.index]
  });
}
</script>

<template>
  <article
    :class="[
      'group relative grid grid-cols-[36px_1fr] gap-x-3 gap-y-2 rounded-lg border bg-surface px-3.5 py-3 transition-shadow sm:grid-cols-[36px_1fr_auto]',
      isEditing ? 'border-accent/40 ring-4 ring-accent/10' : 'border-line hover:border-line-strong hover:shadow-card',
      deleting || transferring ? 'opacity-50' : ''
    ]"
    @keydown.esc.prevent="isEditing && cancelEditing()"
  >
    <!-- Type glyph -->
    <div
      :class="[
        'flex h-9 w-9 items-center justify-center rounded-md border [&>svg]:h-[18px] [&>svg]:w-[18px]',
        isLocked ? 'border-transparent bg-warn-soft text-warn' : isFile ? 'border-transparent bg-info-soft text-info' : 'border-line bg-raised text-muted'
      ]"
      aria-hidden="true"
    >
      <LockClosedIcon v-if="isLocked" />
      <component v-else :is="TYPE_ICON[clip.type] || Bars3BottomLeftIcon" />
    </div>

    <!-- Content -->
    <div class="min-w-0">
      <!-- Title row -->
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <template v-if="isEditing">
          <input
            ref="editTitle"
            v-model="editForm.title"
            type="text"
            placeholder="Title (optional)"
            class="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 text-sm font-medium text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </template>
        <template v-else>
          <span v-if="clip.title" class="truncate font-medium text-fg">{{ clip.title }}</span>
        </template>
        <Badge variant="outline" uppercase>{{ isLocked ? "encrypted" : clip.type }}</Badge>
        <Badge v-if="showFolder" variant="neutral">{{ folderName }}</Badge>
      </div>

      <!-- Body -->
      <div class="mt-1">
        <template v-if="isLocked">
          <p class="text-[13px] text-faint">Encrypted in your browser. Unlock to read it.</p>
        </template>

        <template v-else-if="isEditing">
          <div v-if="isFile" class="flex items-center gap-1.5 font-mono text-xs text-muted">
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
            v-if="clip.type === 'text' || clip.type === 'html'"
            type="button"
            class="block w-full text-left font-mono text-[13px] leading-relaxed text-fg/90 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden break-words whitespace-pre-wrap"
            title="Open preview"
            @click="previewClip(clip)"
          >{{ clip.context }}</button>
          <a
            v-else-if="clip.type === 'url'"
            :href="clip.context"
            target="_blank"
            rel="noopener"
            class="break-all font-mono text-[13px] text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >{{ clip.context }}</a>
          <button
            v-else-if="isFile"
            type="button"
            class="flex items-center gap-1.5 font-mono text-[13px] text-fg/90 hover:text-accent"
            title="Open preview"
            @click="previewClip(clip)"
          >
            <DocumentIcon class="h-4 w-4 text-faint" /> {{ fileLabel }}
          </button>
        </template>
      </div>

      <!-- Meta -->
      <div v-if="!isEditing" class="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-faint">
        <TimeAgo :date="clip.updatedAt" />
        <span v-if="!isFile && !isLocked">· {{ clip.context.length.toLocaleString() }} chars</span>
        <span v-if="clip.encrypted && clip.decrypted" class="flex items-center gap-1 text-warn"><LockOpenIcon class="h-3 w-3" /> unlocked</span>
      </div>
    </div>

    <!-- Actions -->
    <div
      v-if="!isEditing"
      class="col-start-2 flex items-center gap-0.5 sm:col-start-3 sm:self-start sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
    >
      <template v-if="isLocked">
        <Button size="sm" variant="secondary" :click="unlock" message="Unlocking">
          <LockOpenIcon class="h-4 w-4 text-warn" /> Unlock
        </Button>
        <DropdownMenu v-if="!readonly">
          <template #trigger><IconButton label="More actions" size="sm"><EllipsisHorizontalIcon /></IconButton></template>
          <DropdownItem @click="copyClip()"><template #icon><ClipboardDocumentIcon /></template>Copy encrypted text</DropdownItem>
          <template v-if="canDelete">
            <Divider />
            <DropdownItem danger @click="remove"><template #icon><TrashIcon /></template>Delete</DropdownItem>
          </template>
        </DropdownMenu>
      </template>

      <template v-else>
        <IconButton v-if="clip.type === 'url'" label="Open link" size="sm" :href="clip.context">
          <ArrowTopRightOnSquareIcon />
        </IconButton>
        <IconButton v-else label="Preview" size="sm" @click="previewClip(clip)"><EyeIcon /></IconButton>

        <IconButton v-if="isFile" label="Download" size="sm" variant="primary" :click="downloadFile"><ArrowDownTrayIcon /></IconButton>
        <IconButton v-else :label="copied ? 'Copied' : 'Copy'" size="sm" variant="primary" :click="copyClip">
          <CheckIcon v-if="copied" />
          <ClipboardDocumentIcon v-else />
        </IconButton>

        <DropdownMenu v-if="!readonly">
          <template #trigger><IconButton label="More actions" size="sm"><EllipsisHorizontalIcon /></IconButton></template>

          <DropdownItem v-if="isPro" @click="startEditing"><template #icon><PencilIcon /></template>{{ isFile ? "Edit title" : "Edit" }}</DropdownItem>
          <DropdownItem v-else :to="{ name: 'pricing' }" hint="Pro"><template #icon><PencilIcon /></template>Edit</DropdownItem>

          <template v-if="!clip.encrypted">
            <DropdownItem @click="transfer('move')"><template #icon><FolderArrowDownIcon /></template>Move to folder</DropdownItem>
            <template v-if="!isFile">
              <DropdownItem v-if="isPro" @click="transfer('copy')"><template #icon><DocumentDuplicateIcon /></template>Copy to folder</DropdownItem>
              <DropdownItem v-else :to="{ name: 'pricing' }" hint="Pro"><template #icon><DocumentDuplicateIcon /></template>Copy to folder</DropdownItem>
            </template>
          </template>

          <DropdownItem v-if="clip.encrypted && clip.decrypted" @click="hide"><template #icon><EyeSlashIcon /></template>Hide content</DropdownItem>

          <template v-if="canDelete">
            <Divider />
            <DropdownItem danger @click="remove"><template #icon><TrashIcon /></template>Delete</DropdownItem>
          </template>
        </DropdownMenu>
      </template>
    </div>
  </article>
</template>
