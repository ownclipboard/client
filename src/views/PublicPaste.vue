<script setup lang="ts">
import { computed, onMounted, ref, reactive, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { $http, alertRequestError } from "../http";
import { OwnClip, OwnFolder } from "../types/models.types";
import Intro from "../components/Intro.vue";
import { $localStorage } from "../stores/native";

const folder = ref<OwnFolder>();
const isPasting = ref(false);
const [$route, $router] = [useRoute(), useRouter()];
const pasteId = computed<string>(() => $route.params.pasteId as string);

const thisDeviceClips = reactive<Record<string, string[]>>($localStorage.getObject("public-clips", {}));

watch(thisDeviceClips, (clips) => {
    $localStorage.setObject("public-clips", clips || {});
}, { immediate: true });

// Add clip uuid to this device's clips if not exists
function addToThisDeviceClips(clipUuid: string) {
    if (!thisDeviceClips[clipUuid])
        thisDeviceClips[pasteId.value] = [];


    if (!thisDeviceClips[pasteId.value].includes(clipUuid)) {
        thisDeviceClips[pasteId.value].push(clipUuid);
    }
}

// get folder details on mount
onMounted(getFolderByPublicId);

async function getFolderByPublicId() {
    if (!pasteId.value) return;

    try {
        const { folder: $folder } = await $http.get<any, { folder: OwnFolder }>(`/folders/public/${pasteId.value}`);
        folder.value = $folder;

        // load this device's clips
        await loadThisDeviceClips();
    } catch (e) {
        alertRequestError(e);
    }
}

async function loadThisDeviceClips() {
    const ids = thisDeviceClips[pasteId.value];
    
    if (!ids || (ids && ids.length < 1)) return;

    console.log(ids);

}

// Paste to server.
async function paste() {
    isPasting.value = true;

    // get content from clipboard
    const content = await navigator.clipboard.readText();

    try {
        const { clip } = await $http.post<any, { clip: OwnClip }>(`/clips/paste/${pasteId.value}`, {
            content: content
        });

        addToThisDeviceClips(clip.uuid);
    } catch (e) {
        alertRequestError(e);
    } finally {
        isPasting.value = false;
    }
}
</script>

<template>
    <Intro />
    <section v-if="folder" class="flex mt-5">
        <div
            @click.prevent="paste"
            class="p-32 bg-gray-900 hover:bg-gray-700 w-full max-w-4xl mx-auto rounded cursor-pointer"
        >
            <div v-if="isPasting" class="text-center">
                <i class="fa fa-spin fa-spinner fa-2x text-green-300"></i>
                <br />
                <h6 class="text-center text-gray-500 mt-2">Pasting...</h6>
            </div>
            <template v-else>
                <h1 class="text-3xl text-center text-gray-800">
                    <span class="text-gray-500 font-light">"{{ folder.name }}"</span>
                    <br />PUBLIC PASTE
                </h1>
                <h6 class="text-center text-gray-400 font-light mt-2">Click to paste TEXT or IMAGE</h6>
            </template>
        </div>
    </section>
</template>