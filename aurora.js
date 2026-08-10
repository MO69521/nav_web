import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';

const vertexShader = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentShader = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
    permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(0.5 - vec3(
    dot(x0, x0),
    dot(x12.xy, x12.xy),
    dot(x12.zw, x12.zw)
  ), 0.0);
  m *= m;
  m *= m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  int index = uv.x < 0.5 ? 0 : 1;
  ColorStop currentColor = colors[index];
  ColorStop nextColor = colors[index + 1];
  float factor = (uv.x - currentColor.position) / (nextColor.position - currentColor.position);
  vec3 rampColor = mix(currentColor.color, nextColor.color, factor);

  float wave = snoise(vec2(uv.x * 2.15 + uTime * 0.11, uTime * 0.24));
  float height = exp(wave * 0.5 * uAmplitude);
  height = uv.y * 2.0 - height + 0.18;
  float intensity = 0.62 * height;
  float alpha = smoothstep(0.20 - uBlend * 0.5, 0.20 + uBlend * 0.5, intensity);
  vec3 color = intensity * rampColor;

  fragColor = vec4(color * alpha, alpha);
}`;

const hexToColor = (hex) => {
  const color = new Color(hex);
  return [color.r, color.g, color.b];
};

export function initAurora(container) {
  if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const renderer = new Renderer({
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5)
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) delete geometry.attributes.uv;

  const program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uAmplitude: { value: 1.08 },
      uColorStops: { value: ['#050a16', '#176eff', '#6eb8ff'].map(hexToColor) },
      uResolution: { value: [1, 1] },
      uBlend: { value: 0.68 }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });
  container.appendChild(gl.canvas);

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height);
    program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  let frameId = 0;
  let running = true;
  const render = (time) => {
    if (!running) return;
    program.uniforms.uTime.value = time * 0.00085;
    renderer.render({ scene: mesh });
    frameId = requestAnimationFrame(render);
  };

  const syncRunningState = () => {
    running = !document.hidden && !document.body.classList.contains('light-theme');
    cancelAnimationFrame(frameId);
    if (running) frameId = requestAnimationFrame(render);
  };

  const themeObserver = new MutationObserver(syncRunningState);
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', syncRunningState);
  syncRunningState();

  return () => {
    running = false;
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    themeObserver.disconnect();
    document.removeEventListener('visibilitychange', syncRunningState);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    gl.canvas.remove();
  };
}
