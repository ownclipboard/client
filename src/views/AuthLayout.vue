<script lang="ts" setup>
import { onMounted } from "vue";
import AppShell from "../layouts/AppShell.vue";
import PasswordPrompt from "../components/PasswordPrompt.vue";
import FolderPicker from "../components/FolderPicker.vue";
import StorageCorsModal from "../components/StorageCorsModal.vue";
import ClipPreviewModal from "../components/ClipPreviewModal.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import FolderSettingsDialog from "../components/folders/FolderSettingsDialog.vue";
import Spinner from "../components/ui/Spinner.vue";
import Brand from "../components/shell/Brand.vue";
import { useAuthUser } from "../stores/auth.store";
import { refreshAuthData } from "../services/auth.service";
import { getFolders } from "../stores/tabs.store";
import { isDev } from "../config";

const authUser = useAuthUser();

onMounted(async () => {
  await refreshAuthData(authUser);
  if (authUser.isLogged) getFolders();
});
</script>

<template>
  <div v-if="!authUser.isLogged" class="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg text-muted">
    <Brand />
    <div class="flex items-center gap-2 text-sm"><Spinner size="sm" /> Signing you in</div>
  </div>

  <AppShell v-else>
    <template #banner>
      <div
        v-if="!authUser.data!.plan && $route.name !== 'pricing'"
        class="flex items-center justify-center gap-3 border-b border-warn/30 bg-warn-soft px-4 py-2 text-center text-sm text-warn"
      >
        <span>You haven't chosen a plan yet.</span>
        <RouterLink :to="{ name: 'pricing' }" class="font-medium underline underline-offset-4">Choose a plan</RouterLink>
      </div>
    </template>

    <router-view />

    <PasswordPrompt />
    <FolderPicker />
    <FolderSettingsDialog />
    <StorageCorsModal />
    <ClipPreviewModal />
    <ConfirmDialog />
    <DebugDock v-if="isDev" />
  </AppShell>
</template>
