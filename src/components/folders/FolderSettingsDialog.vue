<script setup lang="ts">
/**
 * Settings for one folder: encryption password (once), public paste toggle,
 * and deletion. Opened from the sidebar gear via the folder-settings store.
 */
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useClipboard } from "@vueuse/core";
import { CheckIcon, ClipboardDocumentIcon, EyeSlashIcon, FolderIcon, LockClosedIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { md5 } from "../../functions/crypto";
import { $http, alertDeleteError, alertRequestError } from "../../http";
import config from "../../config";
import { currentTab, foldersAsObject, getFolders } from "../../stores/tabs.store";
import { useAuthUser } from "../../stores/auth.store";
import { closeFolderSettings, folderSettingsSlug, openFolderSettings } from "../../stores/folder-settings.store";
import type { components } from "../../types/api";
import { $alert } from "../ws-alert/ws-alert";
import { redirect } from "../../functions";
import { askForPassword } from "../PasswordPromptHandler";
import Dialog from "../ui/Dialog.vue";
import Button from "../ui/Button.vue";
import Input from "../ui/Input.vue";
import Switch from "../ui/Switch.vue";
import Badge from "../ui/Badge.vue";

const $router = useRouter();
const authUser = useAuthUser();
const open = computed(() => folderSettingsSlug.value !== null);
const folder = computed(() => (folderSettingsSlug.value ? foldersAsObject.value[folderSettingsSlug.value] : undefined));

const password = ref("");
const deleteName = ref("");
const newName = ref("");
const publicPaste = ref(false);
const togglingPublic = ref(false);

watch(folder, (f) => {
  publicPaste.value = !!f?.publicPaste;
  password.value = "";
  deleteName.value = "";
  newName.value = f?.name || "";
}, { immediate: true });

// The default folders cannot be renamed or deleted.
const PROTECTED = ["clipboard", "encrypted"];
const isProtected = computed(() => !!folder.value && PROTECTED.includes(folder.value.slug));
const canRename = computed(() => !!folder.value && newName.value.trim().length > 0 && newName.value.trim() !== folder.value.name);

/**
 * Rename the folder. The slug is derived from the name, so the current tab and
 * the open dialog follow the folder to its new slug.
 */
async function renameFolder(btn: ILoadingButton) {
  if (!folder.value || !canRename.value) return btn.stopLoading();
  const oldSlug = folder.value.slug;

  try {
    const renamed = await $http.post<any, components["schemas"]["Folder"]>(`/folder/${oldSlug}/rename`, {
      name: newName.value.trim()
    });
    // Point at the new slug before refreshing, otherwise the refresh sees the old slug as gone.
    if (currentTab.value === oldSlug) currentTab.value = renamed.slug;
    openFolderSettings(renamed.slug);
    await getFolders();
    $alert.success(`Folder renamed to "${renamed.name}".`);
  } catch (e) {
    alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}

const VISIBILITY = {
  public: { icon: FolderIcon, label: "Public folder", variant: "neutral" as const },
  private: { icon: EyeSlashIcon, label: "Private folder", variant: "info" as const },
  encrypted: { icon: LockClosedIcon, label: "Encrypted folder", variant: "warn" as const }
};

const publicPasteUrl = computed(() =>
  folder.value?.publicPaste
    ? config.baseUrl + $router.resolve({ name: "public-paste", params: { pasteId: folder.value.publicPaste.id } }).href
    : ""
);

const { copy, copied } = useClipboard();

function setPassword(btn: ILoadingButton) {
  if (!folder.value || !password.value) return btn.stopLoading();

  return $http
    .post(`/folder/${folder.value.slug}/set-password`, { password: md5(password.value) })
    .then(() => {
      password.value = "";
      // Reload so every cached folder state picks up the new password flag.
      setTimeout(() => window.location.reload(), 1500);
    })
    .catch((e) => {
      alertRequestError(e);
      btn.stopLoading();
    });
}

async function togglePublicPaste(value: boolean) {
  if (!folder.value || togglingPublic.value) return;
  togglingPublic.value = true;
  const slug = folder.value.slug;
  try {
    await $http.post(`/folder/${slug}/${value ? "enable-public-paste" : "disable-public-paste"}`);
    await getFolders();
  } catch (e) {
    alertRequestError(e);
    publicPaste.value = !value;
  } finally {
    togglingPublic.value = false;
  }
}

async function deleteFolder(btn: ILoadingButton) {
  if (!folder.value) return btn.stopLoading();
  if (deleteName.value !== folder.value.name) {
    return btn.stopLoading(() => $alert.warning("Type the folder name exactly to confirm."));
  }

  // A folder with a password is only deleted when the request carries that password.
  let password: string | undefined;
  if (folder.value.hasPassword) {
    password = await askForPassword(`Enter the password for "${folder.value.name}" to delete it.`);
    if (!password) return btn.stopLoading();
  }

  try {
    // Every clip goes with the folder, and each file is removed from storage one by one.
    // The POST alias carries the password: a DELETE body does not survive every proxy.
    await $http.post(`/folder/${folder.value.slug}/delete`, password ? { password } : undefined);
    currentTab.value = "clipboard";
    closeFolderSettings();
    redirect($router.resolve({ name: "clipboard" }).href, 1000);
  } catch (e) {
    // The folder's files leave storage first, so a disconnected server fails this.
    alertDeleteError(e, !!authUser.storage?.connected);
    btn.stopLoading();
  }
}
</script>

<template>
  <Dialog :open="open" :title="folder?.name || ''" size="md" @close="closeFolderSettings">
    <template v-if="folder">
      <div class="space-y-6">
        <div class="flex items-center gap-2 text-sm text-muted">
          <Badge :variant="VISIBILITY[folder.visibility].variant">
            <component :is="VISIBILITY[folder.visibility].icon" class="h-3 w-3" />
            {{ VISIBILITY[folder.visibility].label }}
          </Badge>
          <span class="text-xs">{{ folder.contents }} clips</span>
        </div>

        <!-- Rename -->
        <section v-if="!isProtected" class="space-y-2">
          <form class="flex items-end gap-2" @submit.prevent>
            <Input v-model="newName" label="Name" placeholder="Folder name" class="flex-1" maxlength="100" autocomplete="off" />
            <Button type="submit" :click="renameFolder" message="Renaming" :disabled="!canRename">Rename</Button>
          </form>
          <p class="text-xs text-faint">Renaming changes the folder's link, so public paste and bookmarked links update with it.</p>
        </section>

        <!-- Encrypted folder without a password yet -->
        <section v-if="folder.visibility === 'encrypted' && !folder.hasPassword" class="space-y-3">
          <div class="rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
            This folder encrypts its clips in your browser, but has no password yet. Set one to start pasting into it.
            The password is required every time you read or write a clip here, and it cannot be recovered.
          </div>
          <form class="flex items-end gap-2" @submit.prevent>
            <Input v-model="password" type="password" label="Encryption password" placeholder="Choose a password" class="flex-1" autocomplete="new-password" />
            <Button variant="primary" type="submit" :click="setPassword" message="Saving">Set password</Button>
          </form>
        </section>

        <!-- Public paste -->
        <section v-if="folder.visibility === 'public'" class="space-y-3">
          <Switch
            v-model="publicPaste"
            label="Public paste"
            description="Anyone with the link can paste into this folder without signing in."
            :disabled="togglingPublic"
            @update:model-value="togglePublicPaste"
          />
          <div v-if="folder.publicPaste" class="flex items-center gap-2">
            <Input :model-value="publicPasteUrl" readonly mono size="sm" class="flex-1" />
            <Button size="sm" @click="copy(publicPasteUrl)">
              <CheckIcon v-if="copied" class="h-4 w-4 text-accent" />
              <ClipboardDocumentIcon v-else class="h-4 w-4" />
              {{ copied ? "Copied" : "Copy link" }}
            </Button>
          </div>
        </section>

        <!-- Delete -->
        <section v-if="!isProtected" class="space-y-3 border-t border-line pt-5">
          <div>
            <h3 class="text-sm font-medium text-fg">Delete folder</h3>
            <p class="mt-0.5 text-sm text-muted">Deletes the folder and every clip in it. Type <span class="font-medium text-fg">{{ folder.name }}</span> to confirm<template v-if="folder.hasPassword">, then enter the folder password</template>.</p>
          </div>
          <form class="flex items-end gap-2" @submit.prevent>
            <Input v-model="deleteName" placeholder="Folder name" class="flex-1" autocomplete="off" />
            <Button variant="danger" type="submit" :click="deleteFolder" message="Deleting" :disabled="deleteName !== folder.name">Delete</Button>
          </form>
        </section>
      </div>
    </template>
  </Dialog>
</template>
