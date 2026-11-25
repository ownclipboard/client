<script setup lang="ts">
/**
 * Download a file, choosing the name it saves as.
 *
 * Both entries are always offered. The api is what names the file — `title`
 * slugifies the clip's title and gives it the file's real extension, falling
 * back to the stored name when there is no title worth using — so the two can
 * resolve to the same name, and deciding that here would only risk disagreeing
 * with it.
 *
 * The trigger is a slot because the same menu hangs off a full button in a
 * dialog footer and off a small icon button on a file tile.
 */
import { DocumentIcon, TagIcon } from "@heroicons/vue/20/solid";
import DropdownMenu from "../ui/DropdownMenu.vue";
import DropdownItem from "../ui/DropdownItem.vue";

withDefaults(defineProps<{ disabled?: boolean; align?: "left" | "right"; placement?: "bottom" | "top" }>(), {
  disabled: false,
  align: "right",
  placement: "bottom"
});

const emit = defineEmits<{ (e: "download", name: "title" | "filename"): void }>();
</script>

<template>
  <DropdownMenu :align="align" :placement="placement" width="w-44">
    <template #trigger><slot name="trigger" /></template>

    <p class="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-faint">Save as</p>
    <DropdownItem :disabled="disabled" @click="emit('download', 'title')">
      <template #icon><TagIcon /></template>Title
    </DropdownItem>
    <DropdownItem :disabled="disabled" @click="emit('download', 'filename')">
      <template #icon><DocumentIcon /></template>Filename
    </DropdownItem>
  </DropdownMenu>
</template>
