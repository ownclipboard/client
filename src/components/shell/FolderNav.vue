<script setup lang="ts">
/**
 * Folder list for the sidebar and the mobile drawer. Selecting a folder sets
 * the current tab and takes the user to the clipboard.
 */
import { ref, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Cog6ToothIcon, EyeSlashIcon, FolderIcon, LockClosedIcon, PlusIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { currentTab, folders, foldersLoaded, getFolders, openFolder } from "../../stores/tabs.store";
import { openFolderSettings } from "../../stores/folder-settings.store";
import { $http, alertRequestError } from "../../http";
import type { OwnFolder } from "../../types/models.types";
import Skeleton from "../ui/Skeleton.vue";
import Input from "../ui/Input.vue";
import Button from "../ui/Button.vue";

const emit = defineEmits<{ (e: "navigate"): void }>();
const $router = useRouter();
const $route = useRoute();

const ICONS: Record<OwnFolder["visibility"], any> = {
  public: FolderIcon,
  private: EyeSlashIcon,
  encrypted: LockClosedIcon
};

async function select(folder: OwnFolder) {
  openFolder(folder.slug);
  if ($route.name !== "clipboard") await $router.push({ name: "clipboard" });
  else if ($route.query.page) await $router.replace({ query: {} });
  emit("navigate");
}

function settings(folder: OwnFolder) {
  openFolderSettings(folder.slug);
  emit("navigate");
}

/* New folder */
const adding = ref(false);
const newName = ref("");
const nameInput = ref<InstanceType<typeof Input>>();

async function startAdding() {
  adding.value = true;
  await nextTick();
  nameInput.value?.focus();
}

function cancelAdding() {
  adding.value = false;
  newName.value = "";
}

function createFolder(btn: ILoadingButton) {
  const name = newName.value.trim();
  if (!name) return btn.stopLoading();

  return $http
    .post("/folders", { name })
    .then(getFolders)
    .then(cancelAdding)
    .catch(alertRequestError)
    .finally(btn.stopLoading);
}
</script>

<template>
  <nav aria-label="Folders" class="flex flex-col gap-0.5">
    <div class="mb-1 flex items-center justify-between px-2">
      <span class="text-[11px] font-medium uppercase tracking-wider text-faint">Folders</span>
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-raised hover:text-fg"
        title="New folder"
        aria-label="New folder"
        @click="startAdding"
      >
        <PlusIcon class="h-4 w-4" />
      </button>
    </div>

    <template v-if="!foldersLoaded">
      <Skeleton v-for="i in 3" :key="i" class="mx-2 my-1 h-7" />
    </template>

    <template v-for="folder in folders" :key="folder.slug">
      <div
        :class="[
          'group flex items-center rounded-md pr-1 transition-colors',
          folder.slug === currentTab && $route.name === 'clipboard' ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-raised hover:text-fg'
        ]"
      >
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-left text-[13px]"
          :aria-current="folder.slug === currentTab ? 'page' : undefined"
          @click="select(folder)"
        >
          <component :is="ICONS[folder.visibility] || FolderIcon" class="h-4 w-4 shrink-0 opacity-80" />
          <span :class="['flex-1 truncate', folder.slug === currentTab ? 'font-medium text-fg' : 'text-fg/90']">{{ folder.name }}</span>
          <span class="font-mono text-[11px] tabular-nums opacity-70">{{ folder.contents }}</span>
        </button>
        <button
          type="button"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-faint opacity-0 transition-opacity hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
          :title="`${folder.name} settings`"
          :aria-label="`${folder.name} settings`"
          @click.stop="settings(folder)"
        >
          <Cog6ToothIcon class="h-3.5 w-3.5" />
        </button>
      </div>
    </template>

    <form v-if="adding" class="mt-1 flex items-center gap-1 px-1" @submit.prevent @keydown.esc="cancelAdding">
      <Input ref="nameInput" v-model="newName" size="sm" placeholder="Folder name" class="flex-1" />
      <Button size="sm" variant="primary" type="submit" :click="createFolder" message="">Add</Button>
      <Button size="sm" variant="ghost" @click="cancelAdding">Cancel</Button>
    </form>
  </nav>
</template>
