<script lang="ts" setup>
import { useRoute } from "vue-router";
import { watch } from "vue";
import { useTitle } from "@vueuse/core";
import config from "./config";

const route = useRoute();

// Page title from route meta, falling back to the app name.
watch(
  () => route.name,
  () => {
    const title = (route.meta.title || config.name) as string;
    useTitle(title);
  }
);
</script>

<template>
  <Toaster />
  <router-view />
</template>
