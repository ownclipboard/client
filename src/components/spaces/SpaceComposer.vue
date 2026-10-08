<script setup lang="ts">
/** Inline form for writing a clip into a space. Cmd/Ctrl+Enter saves, Esc closes. */
import { nextTick, onMounted, reactive, ref } from "vue";
import { UsersIcon } from "@heroicons/vue/20/solid";
import type { ILoadingButton } from "revue-components/vues/component-types";
import { alertRequestError } from "../../http";
import Textarea from "../ui/Textarea.vue";
import Button from "../ui/Button.vue";
import Kbd from "../ui/Kbd.vue";

const props = defineProps<{
  folderName: string;
  save: (text: string, title?: string) => Promise<boolean>;
}>();

const emit = defineEmits<{ (e: "close"): void }>();

const form = reactive({ title: "", content: "" });
const body = ref<InstanceType<typeof Textarea>>();
const saveButton = ref<any>();

onMounted(async () => {
  await nextTick();
  body.value?.focus();
});

async function submit(btn: ILoadingButton) {
  if (!form.content.trim()) return btn.stopLoading(() => body.value?.focus());
  try {
    const created = await props.save(form.content, form.title.trim() || undefined);
    if (created) {
      form.title = "";
      form.content = "";
      emit("close");
    }
  } catch (e) {
    alertRequestError(e);
  } finally {
    btn.stopLoading();
  }
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    saveButton.value?.$el?.click();
  }
}
</script>

<template>
  <section
    class="animate-fade-up rounded-lg border border-accent/40 bg-surface shadow-card ring-4 ring-accent/10"
    @keydown.esc.prevent="emit('close')"
    @keydown="onKeydown"
  >
    <input
      v-model="form.title"
      type="text"
      placeholder="Title (optional)"
      class="block w-full border-b border-line bg-transparent px-4 py-2.5 text-sm font-medium text-fg placeholder:text-faint focus:outline-none"
    />
    <Textarea
      ref="body"
      v-model="form.content"
      :rows="6"
      placeholder="Type or paste the content of the clip"
      class="[&_textarea]:rounded-none [&_textarea]:border-0 [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:focus:ring-0"
    />
    <footer class="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2.5">
      <span class="flex items-center gap-1.5 text-xs text-muted">
        <UsersIcon class="h-3.5 w-3.5 text-faint" />
        Saving to <span class="font-medium text-fg">{{ folderName }}</span>. Everyone in the space sees it.
      </span>
      <span class="ml-auto hidden items-center gap-1 text-[11px] text-faint sm:flex"><Kbd>⌘</Kbd><Kbd>↵</Kbd> to save</span>
      <Button variant="ghost" size="sm" @click="emit('close')">Cancel</Button>
      <Button ref="saveButton" variant="primary" size="sm" :click="submit" message="Saving">Save clip</Button>
    </footer>
  </section>
</template>
