<script lang="ts" setup>
import { useRoute } from "vue-router";
import { watch } from "vue";
import { useTitle } from "@vueuse/core";
import config from "./config";

const route = useRoute();

/**
 * Update the page title based on the route meta
 * if no meta is found, use the default title i.e. config.name
 */
watch(
  () => route.name,
  () => {
    const title = (route.meta.title || config.name) as string;
    useTitle(title);
  }
);
</script>

<template>
  <WsAlert />
  <router-view />
</template>
