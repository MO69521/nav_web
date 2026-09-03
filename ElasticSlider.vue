<template>
  <div class="elastic-slider" :class="className">
    <div
      ref="rowRef"
      class="elastic-slider-row"
      :style="{ scale: String(scale), opacity: sliderOpacity }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @touchstart="handleMouseEnter"
      @touchend="handleMouseLeave"
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
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
        @lostpointercapture="releaseStretch"
        @keydown="handleKeydown"
      >
        <div
          class="elastic-slider-stretch"
          :style="{
            transform: `scaleX(${sliderScaleX}) scaleY(${sliderScaleY})`,
            transformOrigin,
            height: `${sliderHeight}px`,
            marginTop: `${sliderMargin}px`,
            marginBottom: `${sliderMargin}px`
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
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component, type Ref } from 'vue';

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
const rowRef = ref<HTMLDivElement | null>(null);
const sliderRef = ref<HTMLDivElement | null>(null);
const value = ref(props.defaultValue);
const region = ref<'left' | 'middle' | 'right'>('middle');
const pointerX = ref(0);
const overflow = ref(0);
const scale = ref(1);
const leftIconScale = ref(1);
const rightIconScale = ref(1);
let isDragging = false;

type Animation = { stop: () => void };

/**
 * Each frame stores its own request id so a running loop can actually be
 * stopped; otherwise competing animations keep writing to the same value and
 * the slider stays stuck in its stretched state.
 */
function runFrames(step: (now: number) => boolean): Animation {
  let requestId = requestAnimationFrame(function loop(now) {
    if (step(now)) requestId = requestAnimationFrame(loop);
  });
  return { stop: () => cancelAnimationFrame(requestId) };
}

const animations = new Map<Ref<number>, Animation>();

function animate(target: Ref<number>, step: (now: number) => boolean) {
  animations.get(target)?.stop();
  const animation = runFrames(step);
  animations.set(target, animation);
  return animation;
}

function animateValue(target: Ref<number>, to: number, duration = 300) {
  const start = target.value;
  const startTime = performance.now();
  return animate(target, now => {
    const progress = Math.min((now - startTime) / duration, 1);
    target.value = start + (to - start) * (1 - Math.pow(1 - progress, 3));
    if (progress < 1) return true;
    target.value = to;
    return false;
  });
}

function animateSpring(target: Ref<number>, to: number, bounce = .5, duration = 600) {
  const start = target.value;
  const startTime = performance.now();
  const stiffness = 170;
  const dampingRatio = (26 * (1 - bounce)) / (2 * Math.sqrt(stiffness));
  const angularFreq = Math.sqrt(stiffness);
  const dampedFreq = angularFreq * Math.sqrt(Math.max(1 - dampingRatio * dampingRatio, 0));
  return animate(target, now => {
    const elapsed = now - startTime;
    const seconds = elapsed / 1000;
    const displacement = dampingRatio < 1
      ? Math.exp(-dampingRatio * angularFreq * seconds) * (Math.cos(dampedFreq * seconds) + (dampingRatio * angularFreq / dampedFreq) * Math.sin(dampedFreq * seconds))
      : Math.exp(-angularFreq * seconds);
    target.value = to + (start - to) * displacement;
    if (Math.abs(target.value - to) >= .01 && elapsed < duration) return true;
    target.value = to;
    return false;
  });
}

function animateIconPop(target: Ref<number>) {
  const startTime = performance.now();
  return animate(target, now => {
    const progress = Math.min((now - startTime) / 250, 1);
    const swing = progress < .5 ? progress / .5 : (1 - progress) / .5;
    target.value = 1 + .4 * (1 - Math.pow(1 - swing, 3));
    if (progress < 1) return true;
    target.value = 1;
    return false;
  });
}

watch(() => props.defaultValue, newValue => { value.value = newValue; });
watch(value, next => emit('change', next));
watch(region, (next, previous) => {
  if (next === 'left' && previous !== 'left') animateIconPop(leftIconScale);
  if (next === 'right' && previous !== 'right') animateIconPop(rightIconScale);
});

const rangePercentage = computed(() => ((value.value - props.startingValue) / (props.maxValue - props.startingValue)) * 100);
const isAtMinimum = computed(() => value.value <= props.startingValue);
const isAtMaximum = computed(() => value.value >= props.maxValue);
const sliderScaleX = computed(() => {
  const width = sliderRef.value?.getBoundingClientRect().width || 0;
  return width ? 1 + overflow.value / width : 1;
});
const sliderScaleY = computed(() => 1 + (overflow.value / MAX_OVERFLOW) * -.2);
const transformOrigin = computed(() => {
  const rect = sliderRef.value?.getBoundingClientRect();
  if (!rect) return 'center';
  return pointerX.value < rect.left + rect.width / 2 ? 'right' : 'left';
});
const hoverProgress = computed(() => (scale.value - 1) / .2);
const sliderHeight = computed(() => 6 + hoverProgress.value * 6);
const sliderMargin = computed(() => hoverProgress.value * -3);
const sliderOpacity = computed(() => .7 + hoverProgress.value * .3);
const leftIconTranslateX = computed(() => region.value === 'left' ? -overflow.value / scale.value : 0);
const rightIconTranslateX = computed(() => region.value === 'right' ? overflow.value / scale.value : 0);

function decay(inputValue: number, max: number) {
  if (!max) return 0;
  return 2 * (1 / (1 + Math.exp(-(inputValue / max))) - .5) * max;
}

function syncStretch(clientX: number) {
  pointerX.value = clientX;
  const rect = sliderRef.value?.getBoundingClientRect();
  if (!rect) return;
  if (clientX < rect.left) {
    region.value = 'left';
    overflow.value = decay(rect.left - clientX, MAX_OVERFLOW);
  } else if (clientX > rect.right) {
    region.value = 'right';
    overflow.value = decay(clientX - rect.right, MAX_OVERFLOW);
  } else {
    region.value = 'middle';
    overflow.value = 0;
  }
}

function clamp(next: number) {
  return Math.min(Math.max(next, props.startingValue), props.maxValue);
}

function updateValue(event: PointerEvent) {
  const rect = sliderRef.value?.getBoundingClientRect();
  if (!rect) return;
  let next = props.startingValue + ((event.clientX - rect.left) / rect.width) * (props.maxValue - props.startingValue);
  if (props.isStepped) next = Math.round(next / props.stepSize) * props.stepSize;
  value.value = clamp(next);
  syncStretch(event.clientX);
}

function releaseStretch() {
  if (!isDragging && overflow.value === 0) return;
  isDragging = false;
  region.value = 'middle';
  animations.get(overflow)?.stop();
  animateSpring(overflow, 0, .4, 500);
}

function isPointerOverRow(event: PointerEvent) {
  const rect = rowRef.value?.getBoundingClientRect();
  if (!rect) return false;
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

function handlePointerDown(event: PointerEvent) {
  isDragging = true;
  animations.get(overflow)?.stop();
  updateValue(event);
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging || event.buttons === 0) {
    if (isDragging) releaseStretch();
    return;
  }
  updateValue(event);
}

function handlePointerUp(event: PointerEvent) {
  releaseStretch();
  // Pointer capture suppresses mouseleave, so hover state is settled here.
  if (!isPointerOverRow(event)) animateValue(scale, 1, 200);
}

function handleMouseEnter() {
  animateValue(scale, 1.2, 200);
}

function handleMouseLeave() {
  if (isDragging) return;
  animateValue(scale, 1, 200);
}

function resetAll() {
  isDragging = false;
  region.value = 'middle';
  animations.forEach(animation => animation.stop());
  animations.clear();
  overflow.value = 0;
  scale.value = 1;
  leftIconScale.value = 1;
  rightIconScale.value = 1;
}

function handleWindowPointerUp() {
  if (isDragging) releaseStretch();
}

function handleVisibilityChange() {
  if (document.hidden) resetAll();
}

function handleKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  value.value = clamp(value.value + (event.key === 'ArrowRight' ? 1 : -1) * props.stepSize);
}

function nudgeValue(direction: -1 | 1) {
  const increment = props.isStepped ? props.stepSize : (props.maxValue - props.startingValue) / 100;
  value.value = clamp(value.value + direction * increment);
  animateIconPop(direction < 0 ? leftIconScale : rightIconScale);
}

onMounted(() => {
  value.value = props.defaultValue;
  window.addEventListener('pointerup', handleWindowPointerUp);
  window.addEventListener('pointercancel', handleWindowPointerUp);
  window.addEventListener('blur', resetAll);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onBeforeUnmount(() => {
  resetAll();
  window.removeEventListener('pointerup', handleWindowPointerUp);
  window.removeEventListener('pointercancel', handleWindowPointerUp);
  window.removeEventListener('blur', resetAll);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<style scoped>
.elastic-slider { position:relative; width:12rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; color:var(--muted); }
.elastic-slider-row { width:100%; display:flex; align-items:center; justify-content:center; gap:1rem; touch-action:none; user-select:none; }
.elastic-slider-icon { flex:0 0 auto; min-width:24px; min-height:24px; padding:0; border:0; border-radius:50%; color:var(--text); background:transparent; font:inherit; font-size:20px; line-height:1; text-align:center; cursor:pointer; transition:color .18s ease, background .18s ease; }
.elastic-slider-icon:hover:not(:disabled) { color:var(--accent); background:rgba(110,168,254,.12); }
.elastic-slider-icon:focus-visible { outline:2px solid rgba(110,168,254,.55); outline-offset:2px; }
.elastic-slider-icon:disabled { color:var(--muted); cursor:default; opacity:.42; }
.elastic-slider-control { position:relative; flex:1; width:100%; max-width:20rem; display:flex; align-items:center; padding:14px 0; outline:0; cursor:grab; touch-action:none; user-select:none; }
.elastic-slider-control:active { cursor:grabbing; }
.elastic-slider-stretch { flex:1; display:flex; }
.elastic-slider-track { position:relative; flex:1; height:100%; border-radius:999px; background:rgba(156,163,175,.78); }
.elastic-slider-range { position:absolute; inset:0 auto 0 0; overflow:hidden; border-radius:999px; background:var(--accent); box-shadow:0 0 12px rgba(110,168,254,.38); }
.elastic-slider-thumb { position:absolute; z-index:2; top:50%; width:15px; height:15px; border:3px solid var(--accent); border-radius:50%; background:#f5f8ff; box-shadow:0 2px 8px rgba(0,0,0,.32),0 0 0 3px rgba(110,168,254,.14); transform:translate(-50%,-50%); pointer-events:none; transition:box-shadow .18s ease; }
.elastic-slider-control:focus-visible .elastic-slider-thumb { box-shadow:0 2px 8px rgba(0,0,0,.32),0 0 0 5px rgba(110,168,254,.32); }
</style>
