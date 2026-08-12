<template>
  <div class="elastic-slider" :class="className">
    <span class="elastic-slider-icon" :style="{ transform: `translateX(${leftOffset}px) scale(${leftScale})` }" aria-hidden="true">
      <slot name="left-icon"><svg viewBox="0 0 20 20"><rect x="5.5" y="5.5" width="9" height="9" rx="2" /></svg></slot>
    </span>
    <div
      ref="sliderRef"
      class="elastic-slider-control"
      role="slider"
      tabindex="0"
      :aria-label="ariaLabel"
      :aria-valuemin="startingValue"
      :aria-valuemax="maxValue"
      :aria-valuenow="Math.round(value)"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <span class="elastic-slider-track" :style="trackStyle"><i :style="{ width: `${percentage}%` }" /></span>
    </div>
    <span class="elastic-slider-icon large" :style="{ transform: `translateX(${rightOffset}px) scale(${rightScale})` }" aria-hidden="true">
      <slot name="right-icon"><svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="3" /></svg></slot>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const MAX_OVERFLOW = 34;
const props = withDefaults(defineProps<{
  defaultValue?: number;
  startingValue?: number;
  maxValue?: number;
  className?: string;
  isStepped?: boolean;
  stepSize?: number;
  ariaLabel?: string;
}>(), {
  defaultValue: 3,
  startingValue: 1,
  maxValue: 5,
  className: '',
  isStepped: true,
  stepSize: 1,
  ariaLabel: '调节图片大小'
});

const emit = defineEmits<{ change: [value: number] }>();
const sliderRef = ref<HTMLElement | null>(null);
const value = ref(props.defaultValue);
const overflow = ref(0);
const side = ref<'left' | 'middle' | 'right'>('middle');
const active = ref(false);
const leftScale = ref(1);
const rightScale = ref(1);

watch(() => props.defaultValue, next => { value.value = next; });

const percentage = computed(() => ((value.value - props.startingValue) / (props.maxValue - props.startingValue)) * 100);
const leftOffset = computed(() => side.value === 'left' ? -overflow.value : 0);
const rightOffset = computed(() => side.value === 'right' ? overflow.value : 0);
const trackStyle = computed(() => ({
  transform: `scaleX(${1 + overflow.value / 150}) scaleY(${active.value ? 1.55 : 1})`,
  transformOrigin: side.value === 'left' ? 'right' : side.value === 'right' ? 'left' : 'center'
}));

function decay(input: number) {
  return (2 * (1 / (1 + Math.exp(-(input / MAX_OVERFLOW))) - .5)) * MAX_OVERFLOW;
}

function setValue(next: number) {
  const stepped = props.isStepped ? Math.round(next / props.stepSize) * props.stepSize : next;
  value.value = Math.min(props.maxValue, Math.max(props.startingValue, stepped));
  emit('change', value.value);
}

function updateFromPointer(event: PointerEvent) {
  const element = sliderRef.value;
  if (!element) return;
  const rect = element.getBoundingClientRect();
  setValue(props.startingValue + ((event.clientX - rect.left) / rect.width) * (props.maxValue - props.startingValue));
  if (event.clientX < rect.left) {
    side.value = 'left';
    overflow.value = decay(rect.left - event.clientX);
    leftScale.value = 1.22;
  } else if (event.clientX > rect.right) {
    side.value = 'right';
    overflow.value = decay(event.clientX - rect.right);
    rightScale.value = 1.22;
  } else {
    side.value = 'middle';
    overflow.value = 0;
  }
}

function onPointerDown(event: PointerEvent) {
  active.value = true;
  sliderRef.value?.setPointerCapture(event.pointerId);
  updateFromPointer(event);
}

function onPointerMove(event: PointerEvent) {
  if (active.value) updateFromPointer(event);
}

function onPointerUp() {
  active.value = false;
  overflow.value = 0;
  side.value = 'middle';
  leftScale.value = 1;
  rightScale.value = 1;
}

function onKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  setValue(value.value + (event.key === 'ArrowRight' ? props.stepSize : -props.stepSize));
}
</script>

<style scoped>
.elastic-slider { width:190px; height:36px; display:flex; align-items:center; gap:10px; color:var(--muted); user-select:none; }
.elastic-slider-icon { flex:0 0 20px; width:20px; height:20px; display:grid; place-items:center; transition:transform .2s ease-out,color .2s; }
.elastic-slider-icon.large { flex-basis:23px; width:23px; height:23px; }
.elastic-slider-icon svg { width:100%; height:100%; fill:none; stroke:currentColor; stroke-width:1.45; }
.elastic-slider-control { flex:1; height:34px; display:flex; align-items:center; outline:0; cursor:grab; touch-action:none; }
.elastic-slider-control:active { cursor:grabbing; }
.elastic-slider-control:focus-visible { border-radius:8px; box-shadow:0 0 0 2px rgba(110,168,254,.28); }
.elastic-slider-track { width:100%; height:5px; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.15); transition:transform .18s cubic-bezier(.2,.8,.2,1); }
.elastic-slider-track i { display:block; height:100%; border-radius:inherit; background:var(--accent); box-shadow:0 0 12px rgba(110,168,254,.48); transition:width .12s ease; }
.elastic-slider:hover { color:var(--text); }
</style>
