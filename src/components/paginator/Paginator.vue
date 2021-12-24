<script lang="ts">
import { computed, defineComponent, onMounted, toRefs } from "vue";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
  emits: ["onPageChange"],

  props: {
    // page: { type: Number, default: 1 },
    data: {
      type: Object,
      default: () => ({})
    },
    name: {
      type: String,
      default: "page"
    }
  },

  setup(props, { emit }) {
    const { data, name } = toRefs(props);
    const [$route, $router] = [useRoute(), useRouter()];

    const pagesArray = computed(() => {
      const lists: any[] = [];

      let lastPage = Number(data.value.lastPage);
      if (lastPage >= 5) lastPage = 4;

      let i = 0;

      while (i < lastPage) {
        lists[i] = i + 1;
        i++;
      }

      return lists;
    });

    function openPage(page: number) {
      if (page >= 1) {
        const query = { ...$route.query, [name.value]: page };
        $router
          .push({ name: $route.name!, query })
          .then(() => emit("onPageChange", page));
      }
    }

    onMounted(() => {
      // Check if query has name of pagination
      if ($route.query[name.value]) {
        const pageFromProp = Number(data.value.page);
        const pageFromQuery = Number($route.query[name.value] || 0);

        if (!!pageFromQuery && !!pageFromProp && pageFromProp !== pageFromQuery)
          emit("onPageChange", pageFromQuery);
      }
    });

    return { data, name, pagesArray, openPage };
  }
});
</script>

<template>
  <section class="Paginator" v-if="data.total > data.perPage">
    <nav class="pagination" role="navigation" aria-label="pagination">
      <div class="space-x-2 float-right">
        <button
          title="Previous Page"
          :disabled="data.page === 1"
          @click.prevent="openPage(data.page - 1)"
          class="pagination-previous"
        >
          <svg
            class="w-6 h-6 inline"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16l-4-4m0 0l4-4m-4 4h18"
            ></path>
          </svg>
        </button>
        <button
          title="Next Page"
          :disabled="data.page === data.lastPage"
          @click.prevent="openPage(data.page + 1)"
          class="pagination-next"
        >
          <svg
            class="w-6 h-6 inline"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            ></path>
          </svg>
        </button>
      </div>
      <div class="pagination-list float-left space-x-2">
        <template v-if="data.page > 3">
          <button @click.prevent="openPage(1)" class="pagination-link">1</button>
          <span class="pagination-ellipsis">&hellip;</span>
          <button @click.prevent="openPage(data.page - 1)" class="pagination-link">
            {{ data.page - 1 }}
          </button>
          <template v-if="data.page !== data.lastPage">
            <button
              @click.prevent="openPage(data.page)"
              class="pagination-link is-current"
              aria-current="page"
            >
              {{ data.page }}
            </button>
          </template>
          <template v-if="data.page + 1 < data.lastPage">
            <button @click.prevent="openPage(data.page + 1)" class="pagination-link">
              {{ data.page + 1 }}
            </button>
          </template>
        </template>
        <template v-else>
          <template v-for="(pageIndex, pID) in pagesArray" :key="pID">
            <button
              @click.prevent="openPage(pageIndex)"
              :class="'pagination-link' + (data.page === pageIndex ? ' is-current' : '')"
              aria-label="Goto page 1"
            >
              {{ pageIndex }}
            </button>
          </template>
        </template>
        <template v-if="data.lastPage >= 5 || data.page === 4">
          <span class="pagination-ellipsis">&hellip;</span>
          <button
            @click.prevent="openPage(data.lastPage)"
            :class="
              (
                'pagination-link ' + (data.lastPage === data.page ? 'is-current' : '')
              ).trim()
            "
          >
            {{ data.lastPage }}
          </button>
        </template>
      </div>
      <div class="clear-both"></div>
    </nav>
  </section>
</template>
