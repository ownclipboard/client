<script setup lang="ts">
import { currentTab, openTabs } from "../stores/tabs.store";
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const [$route, $router] = [useRoute(), useRouter()];
const page = computed(() => $route.query.page);

/**
 * Change tab
 * @param index
 */
async function changeTab(index: number) {
  // Remove pagination from query.
  if (page.value) await $router.push({
    name: $route.name!,
    query: { ...$route.query, page: undefined }
  });

  const tab = openTabs[index];
  if (tab.slug === currentTab.value) return;
  currentTab.value = tab.slug;
}

/**
 * Sort current tab to first position
 */
function sortCurrentTab() {
  // find current tab index
  const index = openTabs.findIndex((tab) => tab.slug === currentTab.value);
  // if index is less than 3, return
  if (index < 3) return;

  // get current tab data
  const tab = openTabs[index];

  // delete tabIndex from openTabs
  openTabs.splice(index, 1);
  openTabs.unshift(tab);
}

/**
 * Close Tab
 * @param index
 */
function closeTab(index: number) {
  const tab = openTabs[index];
  if (tab.slug === currentTab.value) {
    openTabs.splice(index, 1);
    currentTab.value = openTabs[0].slug;
  } else {
    openTabs.splice(index, 1);
  }
}

onMounted(sortCurrentTab);
</script>

<template>
  <div>
    <div class="overflow-x-auto">
      <div class="border-b border-gray-600">
        <nav class="-mb-px flex" aria-label="Tabs">
          <template v-for="(tab, index) in openTabs" :key="tab.slug">
            <div
              :class="[
                tab.slug === currentTab
                  ? 'border-green-500 text-green-300 bg-gray-900 rounded-t-md'
                  : 'border-transparent text-gray-500 hover:text-white hover:border-green-500',
                'flex whitespace-nowrap py-2 px-4 border-b-2 font-medium text-xs lg:text-sm cursor-pointer'
              ]"
              :aria-current="tab.slug === currentTab ? 'page' : undefined"
            >
              <a class="flex-auto" @click.prevent="changeTab(index)">
                {{ tab.name }}
                <span v-if="tab.contents" class="text-gray-200">({{ tab.contents }})</span>
              </a>
              <a
                v-if="openTabs.length > 1"
                @click.prevent="closeTab(index)"
                class="flex-initial ml-3 text-gray-600 hover:text-red-500"
              >
                <i class="fa fa-times"></i>
              </a>
            </div>
          </template>
        </nav>
      </div>
    </div>
  </div>
</template>
