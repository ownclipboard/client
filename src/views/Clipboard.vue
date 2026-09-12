<script lang="ts" setup>
import PasteBoard from "../components/PasteBoard.vue";
import OpenFolders from "../components/OpenFolders.vue";
import Clips from "../components/Clips.vue";
import Folders from "../components/Folders.vue";
</script>

<template>
  <section>
    <PasteBoard />
  </section>

  <section class="my-5">
    <Folders />
  </section>

  <section class="mt-10 mb-3">
    <OpenFolders />
  </section>

  <section>
    <Clips />
  </section>
</template>
