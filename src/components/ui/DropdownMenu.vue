<script setup lang="ts">
import { computed } from "vue";
import { Menu, MenuButton, MenuItems } from "@headlessui/vue";

const props = defineProps({
  align: { type: String as () => "left" | "right", default: "right" },
  width: { type: String, default: "w-48" },
  /** Open the panel below (default) or above the trigger. */
  placement: { type: String as () => "bottom" | "top", default: "bottom" },
  /** Let the trigger fill its container instead of shrinking to its content. */
  block: { type: Boolean, default: false }
});

const panelPosition = computed(() =>
  props.placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
);

// Full class names on purpose: Tailwind only picks up literals it can see.
const panelOrigin = computed(() => {
  if (props.placement === "top") {
    return props.align === "right" ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left";
  }
  return props.align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left";
});
</script>

<template>
  <Menu as="div" :class="['relative text-left', block ? 'block w-full' : 'inline-block']">
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
          'absolute z-40 rounded-lg border border-line bg-raised p-1 shadow-pop focus:outline-none',
          panelPosition,
          panelOrigin,
          width
        ]"
      >
        <slot />
      </MenuItems>
    </transition>
  </Menu>
</template>
