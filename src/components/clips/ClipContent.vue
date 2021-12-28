<script  lang="ts" setup>
import { strLimitWordsByLength } from '@trapcode/js-toolbox/string/limit';
import { inject } from 'vue';
import { OwnClip } from '../../types/models.types';

const clip = inject<OwnClip>('clip');
</script>
<template>
    <template v-if="clip">
        <p
            v-if="clip.type === 'text'"
            class="break-words"
            v-text="strLimitWordsByLength(clip.context, 250, '...')"
        ></p>
        <a
            v-else-if="clip.type === 'url'"
            :href="clip.context"
            target="_blank"
            class="text-green-400 hover:text-green-500"
            v-text="clip.context"
        ></a>
    </template>
</template>