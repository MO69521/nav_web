<template>
  <div ref="containerRef" class="circular-gallery-stage" />
</template>

<script setup lang="ts">
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import { onMounted, onUnmounted, ref, watch } from 'vue';

interface GalleryItem {
  image: string;
  text: string;
}

interface CircularGalleryProps {
  items?: GalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
}

const props = withDefaults(defineProps<CircularGalleryProps>(), {
  items: () => [],
  bend: 3,
  textColor: '#ffffff',
  borderRadius: 0.05,
  font: '600 24px sans-serif',
  scrollSpeed: 2,
  scrollEase: 0.05
});

type GL = Renderer['gl'];
type Viewport = { width: number; height: number };
type Screen = { width: number; height: number };

const containerRef = ref<HTMLDivElement | null>(null);
let gallery: CircularGalleryApp | null = null;
let mounted = false;

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function fontSize(font: string) {
  return Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] || 24);
}

function textTexture(gl: GL, text: string, font: string, color: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('CircularGallery: canvas context is unavailable');
  context.font = font;
  const size = fontSize(font);
  const width = Math.ceil(context.measureText(text).width) + 28;
  const height = Math.ceil(size * 1.35) + 16;
  canvas.width = width;
  canvas.height = height;
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width, height };
}

class GalleryMedia {
  extra = 0;
  width = 0;
  totalWidth = 0;
  x = 0;
  plane: Mesh;
  title: Mesh;
  program: Program;
  private titleAspect = 1;

  scaleLoopOffset(factor: number) {
    this.extra *= factor;
  }

  constructor(
    private gl: GL,
    geometry: Plane,
    private scene: Transform,
    private item: GalleryItem,
    private index: number,
    private count: number,
    private bend: number,
    private textColor: string,
    private borderRadius: number,
    private font: string
  ) {
    const texture = new Texture(gl, { generateMipmaps: true });
    this.program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += (sin(p.x * 4.0 + uTime) + cos(p.y * 2.0 + uTime)) * (0.045 + min(abs(uSpeed), 1.0) * 0.22);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform float uBorderRadius;
        varying vec2 vUv;
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vUv * ratio + (1.0 - ratio) * 0.5;
          vec4 color = texture2D(tMap, uv);
          float distance = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float alpha = 1.0 - smoothstep(-0.003, 0.003, distance);
          gl_FragColor = vec4(color.rgb, color.a * alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uImageSizes: { value: [1, 1] },
        uPlaneSizes: { value: [1, 1] },
        uBorderRadius: { value: borderRadius },
        uTime: { value: Math.random() * 100 },
        uSpeed: { value: 0 }
      }
    });
    this.plane = new Mesh(gl, { geometry, program: this.program });
    this.plane.setParent(scene);

    const label = textTexture(gl, item.text, font, textColor);
    this.titleAspect = label.width / label.height;
    this.title = new Mesh(gl, {
      geometry: new Plane(gl),
      program: new Program(gl, {
        depthTest: false,
        depthWrite: false,
        transparent: true,
        vertex: `
          attribute vec3 position;
          attribute vec2 uv;
          uniform mat4 modelViewMatrix;
          uniform mat4 projectionMatrix;
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragment: `
          precision highp float;
          uniform sampler2D tMap;
          varying vec2 vUv;
          void main() { vec4 color = texture2D(tMap, vUv); if (color.a < 0.08) discard; gl_FragColor = color; }
        `,
        uniforms: { tMap: { value: label.texture } }
      })
    });
    this.title.setParent(this.plane);

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      texture.image = image;
      this.program.uniforms.uImageSizes.value = [image.naturalWidth, image.naturalHeight];
    };
    image.src = item.image;
  }

  resize(screen: Screen, viewport: Viewport) {
    const scale = Math.max(screen.height, 1) / 920;
    this.plane.scale.y = (viewport.height * (560 * scale)) / Math.max(screen.height, 1);
    this.plane.scale.x = (viewport.width * (500 * scale)) / Math.max(screen.width, 1);
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    const relativeTitleHeight = 0.12;
    const planeAspectCorrection = this.plane.scale.y / this.plane.scale.x;
    this.title.scale.set(relativeTitleHeight * this.titleAspect * planeAspectCorrection, relativeTitleHeight, 1);
    this.title.position.y = -0.64;
    const padding = Math.max(0.75, viewport.width * 0.035);
    this.width = this.plane.scale.x + padding;
    this.totalWidth = this.width * this.count;
    this.x = this.width * this.index;
  }

  update(scroll: { current: number; last: number }, direction: 'left' | 'right', viewport: Viewport) {
    this.plane.position.x = this.x - scroll.current - this.extra;
    const x = this.plane.position.x;
    const halfWidth = viewport.width / 2;
    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const bend = Math.abs(this.bend);
      const radius = (halfWidth * halfWidth + bend * bend) / (2 * bend);
      const effectiveX = Math.min(Math.abs(x), halfWidth);
      const arc = radius - Math.sqrt(Math.max(0, radius * radius - effectiveX * effectiveX));
      this.plane.position.y = this.bend > 0 ? -arc : arc;
      this.plane.rotation.z = (this.bend > 0 ? -1 : 1) * Math.sign(x) * Math.asin(effectiveX / radius);
    }
    const speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.035;
    this.program.uniforms.uSpeed.value = speed;
    const planeOffset = this.plane.scale.x / 2;
    if (direction === 'right' && this.plane.position.x + planeOffset < -halfWidth) this.extra -= this.totalWidth;
    if (direction === 'left' && this.plane.position.x - planeOffset > halfWidth) this.extra += this.totalWidth;
  }
}

class CircularGalleryApp {
  private renderer: Renderer;
  private gl: GL;
  private camera: Camera;
  private scene = new Transform();
  private medias: GalleryMedia[] = [];
  private screen: Screen = { width: 1, height: 1 };
  private viewport: Viewport = { width: 1, height: 1 };
  private frame = 0;
  private resizeObserver: ResizeObserver;
  private down = false;
  private startX = 0;
  private startScroll = 0;
  private scroll = { current: 0, target: 0, last: 0 };
  private settleTimer = 0;
  private active = false;

  constructor(
    private container: HTMLElement,
    private options: Required<Omit<CircularGalleryProps, 'items'>> & { items: GalleryItem[] }
  ) {
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.canvas.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.gl.canvas);
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
    const geometry = new Plane(this.gl, { widthSegments: 80, heightSegments: 40 });
    const source = options.items.length ? options.items : [];
    const repeated = source.length ? [...source, ...source] : [];
    this.medias = repeated.map((item, index) => new GalleryMedia(
      this.gl,
      geometry,
      this.scene,
      item,
      index,
      repeated.length,
      options.bend,
      options.textColor,
      options.borderRadius,
      options.font
    ));
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    this.addListeners();
    this.update();
  }

  private resize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width < 2 || height < 2) {
      this.active = false;
      return;
    }
    const previousMediaWidth = this.medias[0]?.width || 0;
    this.screen = {
      width,
      height
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = this.camera.fov * Math.PI / 180;
    const viewportHeight = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.viewport = { width: viewportHeight * this.camera.aspect, height: viewportHeight };
    this.medias.forEach(media => media.resize(this.screen, this.viewport));
    const nextMediaWidth = this.medias[0]?.width || 0;
    if (previousMediaWidth && nextMediaWidth) {
      const factor = nextMediaWidth / previousMediaWidth;
      this.scroll.current *= factor;
      this.scroll.target *= factor;
      this.scroll.last *= factor;
      this.medias.forEach(media => media.scaleLoopOffset(factor));
    }
    this.active = true;
  };

  private settle = () => {
    const width = this.medias[0]?.width;
    if (!width) return;
    this.scroll.target = Math.round(this.scroll.target / width) * width;
  };

  private pointerDown = (event: PointerEvent) => {
    if (!this.active || event.button !== 0) return;
    this.down = true;
    this.startX = event.clientX;
    this.startScroll = this.scroll.target;
    this.container.setPointerCapture?.(event.pointerId);
  };

  private pointerMove = (event: PointerEvent) => {
    if (!this.down) return;
    this.scroll.target = this.startScroll + (this.startX - event.clientX) * this.options.scrollSpeed * 0.015;
  };

  private pointerUp = () => {
    if (!this.down) return;
    this.down = false;
    this.settle();
  };

  private wheel = (event: WheelEvent) => {
    if (!this.active) return;
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    this.scroll.target += Math.sign(delta || 1) * this.options.scrollSpeed * 0.42;
    window.clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(this.settle, 140);
  };

  private addListeners() {
    this.container.addEventListener('pointerdown', this.pointerDown);
    this.container.addEventListener('pointermove', this.pointerMove);
    this.container.addEventListener('pointerup', this.pointerUp);
    this.container.addEventListener('pointercancel', this.pointerUp);
    this.container.addEventListener('wheel', this.wheel, { passive: false });
  }

  private update = () => {
    if (!this.active) {
      this.frame = requestAnimationFrame(this.update);
      return;
    }
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.options.scrollEase);
    const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
    this.medias.forEach(media => media.update(this.scroll, direction, this.viewport));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.frame = requestAnimationFrame(this.update);
  };

  destroy() {
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.settleTimer);
    this.resizeObserver.disconnect();
    this.container.removeEventListener('pointerdown', this.pointerDown);
    this.container.removeEventListener('pointermove', this.pointerMove);
    this.container.removeEventListener('pointerup', this.pointerUp);
    this.container.removeEventListener('pointercancel', this.pointerUp);
    this.container.removeEventListener('wheel', this.wheel);
    this.gl.canvas.remove();
  }
}

function mountGallery() {
  if (!mounted || !containerRef.value) return;
  gallery?.destroy();
  gallery = new CircularGalleryApp(containerRef.value, {
    items: props.items,
    bend: props.bend,
    textColor: props.textColor,
    borderRadius: props.borderRadius,
    font: props.font,
    scrollSpeed: props.scrollSpeed,
    scrollEase: props.scrollEase
  });
}

onMounted(() => {
  mounted = true;
  mountGallery();
});

watch(() => [props.items, props.bend, props.textColor, props.borderRadius, props.font, props.scrollSpeed, props.scrollEase], mountGallery, { deep: true });

onUnmounted(() => {
  mounted = false;
  gallery?.destroy();
  gallery = null;
});
</script>
