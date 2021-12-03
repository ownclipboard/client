<script setup lang="ts">
import config from "../config";
</script>

<template>
  <div class="pl-5 pt-5">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-gray-300 mt-24">{{ config.name }}</h1>
      <h5 class="font-light">Create, Copy, Paste or Send Documents across devices</h5>
    </div>

    <!-- login Form  -->
    <div class="flex mt-20">
      <div class="m-auto max-w-md w-full p-5 rounded">
        <form action="">
          <div>
            <input type="text" id="check_username" placeholder="Username" />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../assets/scss/var";

label {
  @apply block;
}

input[type="text"] {
  background-color: var.$darker;
  @apply block;
  @apply w-full;
  @apply p-2;
  @apply border;
  @apply border-gray-600;
  @apply rounded;
  @apply outline-none;
  @apply focus:bg-white;
  @apply focus:text-gray-900;
}
</style>
