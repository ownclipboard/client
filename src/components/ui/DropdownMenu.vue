<script setup lang="ts">
import { Menu, MenuButton, MenuItems } from "@headlessui/vue";

defineProps({
  align: { type: String as () => "left" | "right", default: "right" },
  width: { type: String, default: "w-48" }
});
</script>

<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton as="template">
      <slot name="trigger" />
    </MenuButton>
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <MenuItems
        :class="[
          'absolute z-40 mt-1 origin-top rounded-lg border border-line bg-raised p-1 shadow-pop focus:outline-none',
          align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
          width
        ]"
      >
        <slot />
      </MenuItems>
    </transition>
  </Menu>
</template>
