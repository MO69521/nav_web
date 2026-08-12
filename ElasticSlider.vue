<template>
  <div class="elastic-slider" :class="className">
    <div
      class="elastic-slider-row"
      :style="{ scale, opacity: sliderOpacity }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <button
        class="elastic-slider-icon"
        type="button"
        aria-label="缩小图片"
        :disabled="isAtMinimum"
        :style="{ transform: `translateX(${leftIconTranslateX}px) scale(${leftIconScale})` }"
        @click="nudgeValue(-1)"
      >
        <slot name="left-icon">
          <component :is="leftIcon" v-if="leftIcon && typeof leftIcon === 'object'" />
          <span v-else-if="leftIcon">{{ leftIcon }}</span>
          <span v-else>-</span>
        </slot>
      </button>

      <div
        ref="sliderRef"
        class="elastic-slider-control"
        role="slider"
        tabindex="0"
        :aria-label="ariaLabel"
        :aria-valuemin="startingValue"
        :aria-valuemax="maxValue"
        :aria-valuenow="Math.round(value)"
        @pointermove="handlePointerMove"
        @pointerdown="handlePointerDown"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
        @keydown="handleKeydown"
      >
        <div
          class="elastic-slider-stretch"
          :style="{
            transform: `scaleX(${sliderScaleX}) scaleY(${sliderScaleY})`,
            transformOrigin,
            height: `${sliderHeight}px`,
            marginTop: `${sliderMarginTop}px`,
            marginBottom: `${sliderMarginBottom}px`
          }"
        >
          <div class="elastic-slider-track">
            <div class="elastic-slider-range" :style="{ width: `${rangePercentage}%` }" />
            <i class="elastic-slider-thumb" :style="{ left: `${rangePercentage}%` }" />
          </div>
        </div>
      </div>

      <button
        class="elastic-slider-icon"
        type="button"
        aria-label="放大图片"
        :disabled="isAtMaximum"
        :style="{ transform: `translateX(${rightIconTranslateX}px) scale(${rightIconScale})` }"
        @click="nudgeValue(1)"
      >
        <slot name="right-icon">
          <component :is="rightIcon" v-if="rightIcon && typeof rightIcon === 'object'" />
          <span v-else-if="rightIcon">{{ rightIcon }}</span>
          <span v-else>+</span>
        </slot>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue';

const MAX_OVERFLOW = 50;
const props = withDefaults(defineProps<{
  defaultValue?: number;
  startingValue?: number;
  maxValue?: number;
  className?: string;
  isStepped?: boolean;
  stepSize?: number;
  leftIcon?: Component | string;
  rightIcon?: Component | string;
  ariaLabel?: string;
}>(), {
  defaultValue: 50,
  startingValue: 0,
  maxValue: 100,
  className: '',
  isStepped: false,
  stepSize: 1,
  leftIcon: '-',
  rightIcon: '+',
  ariaLabel: '调节图片大小'
});

const emit = defineEmits<{ change: [value: number] }>();
const sliderRef = ref<HTMLDivElement | null>(null);
const value = ref(props.defaultValue);
const region = ref<'left' | 'middle' | 'right'>('middle');
const clientX = ref(0);
const overflow = ref(0);
const scale = ref(1);
const leftIconScale = ref(1);
const rightIconScale = ref(1);
let scaleAnimation: number | null = null;
let overflowAnimation: number | null = null;

watch(() => props.defaultValue, newValue => { value.value = newValue; });
watch(value, next => emit('change', next));
watch(clientX, latest => {
  if (!sliderRef.value) return;
  const { left, right } = sliderRef.value.getBoundingClientRect();
  if (latest < left) {
    region.value = 'left';
    overflow.value = decay(left - latest, MAX_OVERFLOW);
  } else if (latest > right) {
    region.value = 'right';
    overflow.value = decay(latest - right, MAX_OVERFLOW);
  } else {
    region.value = 'middle';
    overflow.value = 0;
  }
});

const rangePercentage = computed(() => ((value.value - props.startingValue) / (props.maxValue - props.startingValue)) * 100);
const isAtMinimum = computed(() => value.value <= props.startingValue);
const isAtMaximum = computed(() => value.value >= props.maxValue);
const sliderScaleX = computed(() => sliderRef.value ? 1 + overflow.value / sliderRef.value.getBoundingClientRect().width : 1);
const sliderScaleY = computed(() => 1 + (overflow.value / MAX_OVERFLOW) * -.2);
const transformOrigin = computed(() => {
  if (!sliderRef.value) return 'center';
  const { left, width } = sliderRef.value.getBoundingClientRect();
  return clientX.value < left + width / 2 ? 'right' : 'left';
});
const hoverProgress = computed(() => (scale.value - 1) / .2);
const sliderHeight = computed(() => 6 + hoverProgress.value * 6);
const sliderMarginTop = computed(() => hoverProgress.value * -3);
const sliderMarginBottom = computed(() => hoverProgress.value * -3);
const sliderOpacity = computed(() => .7 + hoverProgress.value * .3);
const leftIconTranslateX = computed(() => region.value === 'left' ? -overflow.value / scale.value : 0);
const rightIconTranslateX = computed(() => region.value === 'right' ? overflow.value / scale.value : 0);

function decay(inputValue: number, max: number) {
  if (!max) return 0;
  return 2 * (1 / (1 + Math.exp(-(inputValue / max))) - .5) * max;
}

function animateValue(target: { value: number }, to: number, duration = 300) {
  const start = target.value;
  const diff = to - start;
  const startTime = performance.now();
  const frame = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);
    target.value = start + diff * (1 - Math.pow(1 - progress, 3));
    return progress < 1 ? requestAnimationFrame(frame) : null;
  };
  return requestAnimationFrame(frame);
}

function animateSpring(target: { value: number }, to: number, bounce = .5, duration = 600) {
  const start = target.value;
  const startTime = performance.now();
  const stiffness = 170;
  const damping = 26 * (1 - bounce);
  const dampingRatio = damping / (2 * Math.sqrt(stiffness));
  const angularFreq = Math.sqrt(stiffness);
  const dampedFreq = angularFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
  const frame = (now: number) => {
    const elapsed = now - startTime;
    const t = elapsed / 1000;
    const envelope = Math.exp(-dampingRatio * angularFreq * t);
    const displacement = dampingRatio < 1
      ? envelope * (Math.cos(dampedFreq * t) + (dampingRatio * angularFreq / dampedFreq) * Math.sin(dampedFreq * t))
      : Math.exp(-angularFreq * t);
    target.value = to + (start - to) * displacement;
    if (Math.abs(target.value - to) >= .01 && elapsed < duration * 3) return requestAnimationFrame(frame);
    target.value = to;
    return null;
  };
  return requestAnimationFrame(frame);
}

function animateIconScale(target: { value: number }) {
  animateValue(target, 1.4, 125);
  setTimeout(() => animateValue(target, 1, 125), 125);
}

watch(region, (next, previous) => {
  if (next === 'left' && previous !== 'left') animateIconScale(leftIconScale);
  if (next === 'right' && previous !== 'right') animateIconScale(rightIconScale);
});

function updateValue(event: PointerEvent) {
  if (!sliderRef.value) return;
  const { left, width } = sliderRef.value.getBoundingClientRect();
  let next = props.startingValue + ((event.clientX - left) / width) * (props.maxValue - props.startingValue);
  if (props.isStepped) next = Math.round(next / props.stepSize) * props.stepSize;
  value.value = Math.min(Math.max(next, props.startingValue), props.maxValue);
  clientX.value = event.clientX;
}

function handlePointerMove(event: PointerEvent) {
  if (event.buttons > 0) updateValue(event);
}
function handlePointerDown(event: PointerEvent) {
  updateValue(event);
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}
function handlePointerUp() {
  if (overflowAnimation) cancelAnimationFrame(overflowAnimation);
  overflowAnimation = animateSpring(overflow, 0, .4, 500);
}
function handleMouseEnter() {
  if (scaleAnimation) cancelAnimationFrame(scaleAnimation);
  scaleAnimation = animateValue(scale, 1.2, 200);
}
function handleMouseLeave() {
  if (scaleAnimation) cancelAnimationFrame(scaleAnimation);
  scaleAnimation = animateValue(scale, 1, 200);
}
function handleTouchStart() { handleMouseEnter(); }
function handleTouchEnd() { handleMouseLeave(); }
function handleKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  value.value = Math.min(props.maxValue, Math.max(props.startingValue, value.value + direction * props.stepSize));
}

function nudgeValue(direction: -1 | 1) {
  const increment = props.isStepped ? props.stepSize : (props.maxValue - props.startingValue) / 100;
  value.value = Math.min(props.maxValue, Math.max(props.startingValue, value.value + direction * increment));
  animateIconScale(direction < 0 ? leftIconScale : rightIconScale);
}

onMounted(() => { value.value = props.defaultValue; });
</script>

<style scoped>
.elastic-slider { position:relative; width:12rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; color:var(--muted); }
.elastic-slider-row { width:100%; display:flex; align-items:center; justify-content:center; gap:1rem; touch-action:none; user-select:none; }
.elastic-slider-icon { flex:0 0 auto; min-width:24px; min-height:24px; padding:0; border:0; border-radius:50%; color:var(--text); background:transparent; font:inherit; font-size:20px; line-height:1; text-align:center; cursor:pointer; transition:color .18s ease, background .18s ease, transform .2s ease-out; }
.elastic-slider-icon:hover:not(:disabled) { color:var(--accent); background:rgba(110,168,254,.12); }
.elastic-slider-icon:focus-visible { outline:2px solid rgba(110,168,254,.55); outline-offset:2px; }
.elastic-slider-icon:disabled { color:var(--muted); cursor:default; opacity:.42; }
.elastic-slider-control { position:relative; flex:1; width:100%; max-width:20rem; display:flex; align-items:center; padding:1rem 0; outline:0; cursor:grab; touch-action:none; user-select:none; }
.elastic-slider-control:active { cursor:grabbing; }
.elastic-slider-control:focus-visible { border-radius:8px; box-shadow:0 0 0 2px rgba(110,168,254,.28); }
.elastic-slider-stretch { flex:1; display:flex; }
.elastic-slider-track { position:relative; flex:1; height:100%; border-radius:999px; background:#9ca3af; }
.elastic-slider-range { position:absolute; inset:0 auto 0 0; overflow:hidden; border-radius:999px; background:var(--accent); box-shadow:0 0 12px rgba(110,168,254,.38); }
.elastic-slider-thumb { position:absolute; z-index:2; top:50%; width:15px; height:15px; border:3px solid var(--accent); border-radius:50%; background:#f5f8ff; box-shadow:0 2px 8px rgba(0,0,0,.32),0 0 0 3px rgba(110,168,254,.14); transform:translate(-50%,-50%); pointer-events:none; }
</style>
