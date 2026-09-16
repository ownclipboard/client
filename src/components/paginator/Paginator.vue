<script lang="ts">
import { computed, defineComponent, onMounted, PropType, toRefs } from "vue";
import { useRoute, useRouter } from "vue-router";

export type Pagination<T = any> = {
  total: number;
  perPage: number;
  page: number;
  lastPage: number;
  data: T[];
};

export function Pagination<T = any>(): Pagination<T> {
  return { total: 0, page: 1, perPage: 0, lastPage: 1, data: [] };
}

export default defineComponent({
  emits: ["onPageChange"],

  props: {
    data: { type: Object as PropType<any>, default: () => ({}) },
    name: { type: String, default: "page" }
  },

  setup(props, { emit }) {
    const { data, name } = toRefs(props);
    const [$route, $router] = [useRoute(), useRouter()];

    /** Page numbers to show: first, last, and a window around the current page. */
    const pages = computed<(number | "…")[]>(() => {
      const last = Number(data.value.lastPage) || 1;
      const current = Number(data.value.page) || 1;
      const set = new Set<number>([1, last, current - 1, current, current + 1]);
      const list = [...set].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
      const out: (number | "…")[] = [];
      list.forEach((p, i) => {
        if (i && p - (list[i - 1] as number) > 1) out.push("…");
        out.push(p);
      });
      return out;
    });

    const from = computed(() => (data.value.total ? (data.value.page - 1) * data.value.perPage + 1 : 0));
    const to = computed(() => Math.min(data.value.page * data.value.perPage, data.value.total));

    function openPage(page: number) {
      if (page < 1 || page > data.value.lastPage) return;
      const query = { ...$route.query, [name.value]: page };
      $router.push({ name: $route.name!, query }).then(() => emit("onPageChange", page));
    }

    onMounted(() => {
      if ($route.query[name.value]) {
        const pageFromProp = Number(data.value.page);
        const pageFromQuery = Number($route.query[name.value] || 0);
        if (!!pageFromQuery && !!pageFromProp && pageFromProp !== pageFromQuery) emit("onPageChange", pageFromQuery);
      }
    });

    return { data, pages, from, to, openPage };
  }
});
</script>

<template>
  <nav v-if="data.total > data.perPage" class="flex items-center justify-between gap-3 pt-2 text-xs text-muted" aria-label="Pagination">
    <span class="tabular-nums">{{ from }}–{{ to }} of {{ data.total }}</span>
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="h-7 rounded-md border border-line bg-surface px-2 hover:border-line-strong hover:text-fg disabled:opacity-40"
        :disabled="data.page <= 1"
        @click="openPage(data.page - 1)"
      >
        Prev
      </button>
      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === '…'" class="px-1 text-faint">…</span>
        <button
          v-else
          type="button"
          :class="[
            'h-7 min-w-[28px] rounded-md border px-1.5 tabular-nums',
            p === data.page ? 'border-transparent bg-accent-soft font-semibold text-accent' : 'border-line bg-surface hover:border-line-strong hover:text-fg'
          ]"
          :aria-current="p === data.page ? 'page' : undefined"
          @click="openPage(p as number)"
        >
          {{ p }}
        </button>
      </template>
      <button
        type="button"
        class="h-7 rounded-md border border-line bg-surface px-2 hover:border-line-strong hover:text-fg disabled:opacity-40"
        :disabled="data.page >= data.lastPage"
        @click="openPage(data.page + 1)"
      >
        Next
      </button>
    </div>
  </nav>
</template>
