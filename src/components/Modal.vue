<script lang="ts">
export default {
  name: "Modal",
  emits: ["closeModal"],
  props: {
    maxSize: { type: String, default: "max-w-3xl" },
    modalContentClass: { type: [String, Object], default: "rounded" }
  }
};
</script>

<template>
  <div>
    <div class="modal" style="z-index: 101">
      <div :class="`model-container ${maxSize}`">
        <!--content-->
        <div class="modal-content" :class="modalContentClass">
          <div class="relative">
            <button @click="$emit('closeModal')" class="absolute right-0">
              <i class="fa fa-times mx-3 my-2 text-lg"></i>
            </button>
            <slot></slot>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-bg" style="z-index: 100"></div>
  </div>
</template>

<style lang="scss">
.modal {
  @apply overflow-x-hidden overflow-y-auto fixed
  inset-0 z-50 outline-none focus:outline-none
  justify-center items-center flex min-h-screen;

  .modal-content {
    @apply border-0 shadow-lg
    relative w-full bg-gray-700
    outline-none focus:outline-none;
  }

  .model-container:not(.ignoreModelContainer) {
    @apply relative w-full my-6 mx-auto mx-1;
  }
}

.modal-bg {
  @apply opacity-50 fixed inset-0 z-40 bg-black;
}
</style>
