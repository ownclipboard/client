<script setup lang="ts">
import { currentTab, openTabs } from "../stores/tabs.store";

/**
 * Change tab and sort current tab to first position
 * @param tab
 */
function changeTab(tab: string) {
  const tabIndex = openTabs.findIndex((t) => t.slug === tab)!;
  const tabData = openTabs[tabIndex];

  // delete tabIndex from openTabs
  openTabs.splice(tabIndex, 1);
  openTabs.unshift(tabData);

  currentTab.value = tab;
}
</script>

<template>
  <div>
    <div class="overflow-x-auto">
      <div class="border-b border-gray-600">
        <nav class="-mb-px flex space-x-3" aria-label="Tabs">
          <template v-for="tab in openTabs" :key="tab.slug">
            <a
              @click.prevent="changeTab(tab.slug)"
              :class="[
                tab.slug === currentTab
                  ? 'border-green-500 text-green-600 bg-gray-900 rounded-t-md'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-green-500',
                'whitespace-nowrap flex py-3 px-4 border-b-2 font-medium text-sm'
              ]"
              :aria-current="tab.slug === currentTab ? 'page' : undefined"
            >
              {{ tab.name }}
              <small v-if="tab.count" class="ml-2 text-gray-200">({{ tab.count }})</small>
            </a>
          </template>
        </nav>
      </div>
    </div>
  </div>
</template>
