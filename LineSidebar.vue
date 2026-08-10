<script setup lang="ts">
type Falloff = 'linear' | 'smooth' | 'sharp';
type SidebarItem = {
  label: string;
  level?: number;
  hasChildren?: boolean;
  collapsed?: boolean;
  outlineIndex?: number;
};

const props = withDefaults(defineProps<{
  items?: SidebarItem[];
  activeIndex?: number | null;
  accentColor?: string;
  textColor?: string;
  markerColor?: string;
  proximityRadius?: number;
  maxShift?: number;
  falloff?: Falloff;
  markerLength?: number;
  tickScale?: number;
  itemGap?: number;
  smoothing?: number;
}>(), {
  items: () => [],
  activeIndex: null,
  accentColor: '#6ea8fe',
  textColor: '#7f8896',
  markerColor: 'rgba(255,255,255,.18)',
  proximityRadius: 92,
  maxShift: 14,
  falloff: 'smooth',
  markerLength: 28,
  tickScale: .48,
  itemGap: 13,
  smoothing: 110
});

const emit = defineEmits<{
  itemClick: [index: number, item: SidebarItem];
  itemToggle: [index: number, item: SidebarItem];
}>();

</script>

<template>
  <p v-if="!items.length" class="line-sidebar-empty">添加标题后，将在这里生成目录。</p>
  <nav
    v-else
    class="line-sidebar"
    :style="{
      '--accent-color': accentColor,
      '--text-color': textColor,
      '--marker-color': markerColor,
      '--marker-length': `${markerLength}px`,
      '--max-shift': `${maxShift}px`,
      '--tick-scale': tickScale,
      '--item-gap': `${itemGap}px`
    }"
    aria-label="当前文档目录"
  >
    <ul>
      <li
        v-for="(item, index) in items"
        :key="`${item.outlineIndex}-${item.label}`"
        :class="[`level-${item.level || 1}`, { active: activeIndex === index }]"
        :style="{ '--level-indent': `${Math.max(0, (item.level || 1) - 1) * 8}px` }"
        :aria-current="activeIndex === index ? 'location' : undefined"
      >
        <button
          v-if="item.hasChildren"
          class="line-sidebar-toggle"
          :class="{ collapsed: item.collapsed }"
          type="button"
          :aria-label="item.collapsed ? '展开章节' : '折叠章节'"
          @click.stop="emit('itemToggle', index, item)"
        >▾</button>
        <span v-else class="line-sidebar-toggle-placeholder" aria-hidden="true" />
        <button class="line-sidebar-label" type="button" :title="item.label" @click="emit('itemClick', index, item)">
          <span class="line-sidebar-text">{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.line-sidebar { min-width:0; }
.line-sidebar ul { display:flex; flex-direction:column; gap:var(--item-gap); margin:0; padding:8px 0 18px; list-style:none; }
.line-sidebar li { position:relative; min-width:0; min-height:28px; display:flex; align-items:center; padding-left:var(--level-indent); }
.line-sidebar-label { min-width:0; flex:1; display:flex; align-items:center; padding:5px 0; overflow:hidden; border:0; background:transparent; color:var(--text-color); text-align:left; cursor:pointer; transition:color .12s ease; }
.line-sidebar-text { min-width:0; overflow:hidden; font-size:14px; font-weight:560; line-height:1.45; text-overflow:ellipsis; white-space:nowrap; }
.line-sidebar li.level-2 .line-sidebar-text { font-size:13.5px; }
.line-sidebar li.level-3 .line-sidebar-text,.line-sidebar li.level-4 .line-sidebar-text,.line-sidebar li.level-5 .line-sidebar-text { font-size:13px; }
.line-sidebar li.active .line-sidebar-label,
.line-sidebar li.active .line-sidebar-toggle { color:var(--accent-color); }
.line-sidebar li:not(.active):hover .line-sidebar-label,
.line-sidebar li:not(.active):hover .line-sidebar-toggle { color:#fff; }
.line-sidebar-toggle { flex:0 0 30px; width:30px; height:30px; display:grid; place-items:center; margin-right:7px; padding:0; border:0; border-radius:8px; background:transparent; color:var(--text-color); font-size:18px; font-weight:700; line-height:1; cursor:pointer; transform-origin:center; transition:background .15s,color .12s ease,transform .15s; }
.line-sidebar-toggle-placeholder { flex:0 0 30px; width:30px; height:30px; margin-right:7px; }
.line-sidebar-toggle:hover { background:rgba(110,168,254,.12); }
.line-sidebar-toggle.collapsed { transform:rotate(-90deg); }
.line-sidebar-empty { margin:0; padding:8px 2px; color:#59616e; font-size:13px; line-height:1.7; }
</style>
