<script lang="ts" setup>import config from '../config';
const props = defineProps({
    marginTop: {
        type: String,
        default: "mt-24"
    },
})
</script>

<template>
    <div :class="{
        [props.marginTop]: true,
    }" class="text-center">
        <router-link :to="{name: 'index'}">
            <h1 class="text-5xl lg:text-6xl font-bold text-gray-300">{{ config.name }}</h1>
            <h5 class="font-light">Create, Copy, Paste or Send Documents across devices</h5>
        </router-link>
    </div>
</template>