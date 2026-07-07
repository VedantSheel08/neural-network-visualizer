"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ThreeEvent } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@/lib/store";
import {
  ARCH,
  PALETTES,
  RUN_MS,
  STAGES,
  STEP_CHECKPOINTS,
  stageProgress,
  type Mode,
} from "@/lib/theme";

/*
 * The network: 784 -> 64 -> 48 -> 32 -> 16 -> 10, laid out left to right.
 * The input is the drawn 28x28 image on a plane; every other layer is
 * instanced spheres; every connection is an instanced cylinder whose radius
 * and brightness come from |weight x upstream activation|, with a wavefront
 * traveling source -> target during its stage. Dark mode glows (additive),
 * light mode inks (normal blending). All of it reads live values only.
 */

const LAYER_SIZES = ARCH.slice(1); // [64, 48, 32, 16, 10]
const N_LAYERS = LAYER_SIZES.length;
const LAYER_OFFSETS = LAYER_SIZES.reduce<number[]>((acc, _, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + LAYER_SIZES[i - 1]);
  return acc;
}, []);
const NODE_COUNT = LAYER_SIZES.reduce((a, b) => a + b, 0); // 170

const LAYER_X = [-9, -5.4, -1.8, 1.8, 5.4, 9];
const PLANE_SIZE = 3.2;

// rows x cols grid per hidden layer (output is a column)
const GRIDS = [
  { r: 8, c: 8, dy: 0.72, dz: 0.72 },
  { r: 6, c: 8, dy: 0.78, dz: 0.72 },
  { r: 4, c: 8, dy: 0.9, dz: 0.72 },
  { r: 4, c: 4, dy: 1.0, dz: 1.0 },
];

function nodeLayer(k: number): number {
  for (let l = N_LAYERS - 1; l >= 0; l--) if (k >= LAYER_OFFSETS[l]) return l;
  return 0;
}

function nodePos(layer: number, i: number): THREE.Vector3 {
  const x = LAYER_X[layer + 1];
  if (layer === N_LAYERS - 1) return new THREE.Vector3(x, (9 - i * 2) * 0.31, 0);
  const g = GRIDS[layer];
  const row = Math.floor(i / g.c);
  const col = i % g.c;
  return new THREE.Vector3(
    x,
    ((g.r - 1) / 2 - row) * g.dy,
    (col - (g.c - 1) / 2) * g.dz
  );
}

function anchorPos(cell: number): THREE.Vector3 {
  const r = Math.floor(cell / 4);
  const c = cell % 4;
  return new THREE.Vector3(LAYER_X[0] + (-1.2 + c * 0.8), 1.2 - r * 0.8, 0);
}

const NODE_R = [0.13, 0.14, 0.15, 0.18, 0.22];

interface Seg {
  a: THREE.Vector3;
  b: THREE.Vector3;
}

interface SegGroup {
  segs: Seg[];
  /** index of each drawn fiber into the full per-run edge-value array */
  map: number[];
}

/**
 * Drawing all 6,304 connections is an unreadable hairball, so the view keeps
 * only each neuron's strongest incoming connections (by |weight|; for the
 * input bundles, by total |weight| of the region). The math still uses every
 * connection; `map` ties each drawn fiber back to its true value.
 */
const KEEP_REGIONS = 6; // of 16 input regions per layer-1 neuron
const KEEP_IN = 10; // strongest incoming weights per deeper neuron

function buildSegments(model: import("@/lib/inference").ModelWeights | null): SegGroup[] {
  if (!model) return Array.from({ length: N_LAYERS }, () => ({ segs: [], map: [] }));
  const groups: SegGroup[] = [];

  // input regions -> layer 1: keep regions where this neuron's weights are big
  const w0 = model.layers[0].weights;
  const g0: SegGroup = { segs: [], map: [] };
  for (let i = 0; i < LAYER_SIZES[0]; i++) {
    const regionMass = Array.from({ length: 16 }, (_, cell) => {
      let sum = 0;
      for (let py = 0; py < 28; py++) {
        for (let px = 0; px < 28; px++) {
          const r = Math.floor(py / 7);
          const c = Math.floor(px / 7);
          if (r * 4 + c === cell) sum += Math.abs(w0[i][py * 28 + px]);
        }
      }
      return { cell, sum };
    });
    regionMass.sort((a, b) => b.sum - a.sum);
    for (const { cell } of regionMass.slice(0, KEEP_REGIONS)) {
      g0.segs.push({ a: anchorPos(cell), b: nodePos(0, i) });
      g0.map.push(cell * LAYER_SIZES[0] + i);
    }
  }
  groups.push(g0);

  for (let t = 1; t < N_LAYERS; t++) {
    const nIn = LAYER_SIZES[t - 1];
    const nOut = LAYER_SIZES[t];
    const W = model.layers[t].weights;
    const g: SegGroup = { segs: [], map: [] };
    for (let i = 0; i < nOut; i++) {
      const order = Array.from({ length: nIn }, (_, j) => j).sort(
        (a, b) => Math.abs(W[i][b]) - Math.abs(W[i][a])
      );
      for (const j of order.slice(0, KEEP_IN)) {
        g.segs.push({ a: nodePos(t - 1, j), b: nodePos(t, i) });
        g.map.push(i * nIn + j);
      }
    }
    groups.push(g);
  }
  return groups;
}

// ---- signal-fiber shader ----------------------------------------------------

const fiberVertex = /* glsl */ `
  attribute float aIntensity;
  attribute float aSign;
  varying float vAlong;
  varying float vIntensity;
  varying float vSign;
  void main() {
    vAlong = position.y + 0.5;
    vIntensity = aIntensity;
    vSign = aSign;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fiberFragment = /* glsl */ `
  uniform vec3 uSignal;
  uniform vec3 uHot;
  uniform vec3 uNeg;
  uniform float uPulse;
  uniform float uGain;
  uniform float uLight;
  varying float vAlong;
  varying float vIntensity;
  varying float vSign;
  void main() {
    float head = exp(-pow((vAlong - uPulse) * 6.0, 2.0));
    float passed = smoothstep(vAlong - 0.08, vAlong, uPulse);
    float energy = vIntensity * (0.32 * passed + head * 1.1) * uGain;
    energy *= mix(0.55, 1.0, step(0.0, vSign)); // inhibitory fibers stay quieter
    if (energy < 0.004) discard;
    vec3 tint = mix(uNeg, uSignal, step(0.0, vSign));
    vec3 col = mix(tint, uHot, head * vIntensity);
    if (uLight > 0.5) {
      gl_FragColor = vec4(col, min(energy * 0.7, 1.0)); // ink into paper
    } else {
      gl_FragColor = vec4(col * energy, energy);        // glowing filament
    }
  }
`;

function makeFiberGroup(segments: Seg[], radialSegments: number, gain: number, mode: Mode) {
  const p = PALETTES[mode];
  const geometry = new THREE.CylinderGeometry(1, 1, 1, radialSegments, 1, true);
  const count = segments.length;
  geometry.setAttribute("aIntensity", new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
  geometry.setAttribute("aSign", new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1));
  const light = mode === "light";
  const neg = light
    ? new THREE.Color(p.graphite).multiplyScalar(0.8)
    : new THREE.Color(p.graphite).multiplyScalar(1.7);
  const material = new THREE.ShaderMaterial({
    vertexShader: fiberVertex,
    fragmentShader: fiberFragment,
    uniforms: {
      uSignal: { value: new THREE.Color(p.copper) },
      uHot: { value: new THREE.Color(p.ember) },
      uNeg: { value: neg },
      uPulse: { value: -0.5 },
      uGain: { value: gain },
      uLight: { value: light ? 1 : 0 },
    },
    transparent: true,
    blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const setMatrices = (intensity: Float32Array | null) => {
    for (let k = 0; k < count; k++) {
      const { a, b } = segments[k];
      dir.subVectors(b, a);
      const len = dir.length();
      mid.addVectors(a, b).multiplyScalar(0.5);
      q.setFromUnitVectors(up, dir.normalize());
      const r = 0.01 + 0.045 * (intensity ? intensity[k] : 0);
      m.compose(mid, q, new THREE.Vector3(r, len, r));
      mesh.setMatrixAt(k, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  setMatrices(null);
  return { mesh, material, setMatrices };
}

function applyEdgeValues(
  group: ReturnType<typeof makeFiberGroup>,
  values: Float32Array,
  map: number[]
) {
  // normalize against the full value array so hidden edges don't skew scale
  let max = 0;
  for (let k = 0; k < values.length; k++) {
    const v = Math.abs(values[k]);
    if (v > max) max = v;
  }
  const n = map.length;
  const intensity = new Float32Array(n);
  const aIntensity = group.mesh.geometry.getAttribute("aIntensity") as THREE.InstancedBufferAttribute;
  const aSign = group.mesh.geometry.getAttribute("aSign") as THREE.InstancedBufferAttribute;
  for (let k = 0; k < n; k++) {
    const v = values[map[k]];
    intensity[k] = max > 0 ? Math.sqrt(Math.abs(v) / max) : 0;
    aIntensity.setX(k, intensity[k]);
    aSign.setX(k, v >= 0 ? 1 : -1);
  }
  aIntensity.needsUpdate = true;
  aSign.needsUpdate = true;
  group.setMatrices(intensity);
}

// ---- text sprites -------------------------------------------------------------

function makeTextSprite(text: string, px: number, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(128, Math.ceil(text.length * px * 0.68));
  canvas.height = px * 2;
  const draw = () => {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `500 ${px}px ui-monospace, Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  };
  draw();
  const map = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
  sprite.scale.set((scale * canvas.width) / canvas.height, scale, 1);
  return sprite;
}

// ---- the network ------------------------------------------------------------

// gain per group compensates additive overdraw (fiber counts after filtering)
const GROUP_GAINS = [0.6, 0.55, 0.6, 0.7, 0.85];
const INTRO_MS = 2100;

interface NetworkProps {
  scrollT?: MotionValue<number>;
}

function Network({ scrollT }: NetworkProps) {
  const mode = useApp((s) => s.mode);
  const lowPower = useApp((s) => s.lowPower);
  const input = useApp((s) => s.input);
  const run = useApp((s) => s.run);
  const model = useApp((s) => s.model);
  const p = PALETTES[mode];

  const segments = useMemo(() => buildSegments(model), [model]);
  const fiberGroups = useMemo(
    () => segments.map((s, i) => makeFiberGroup(s.segs, lowPower ? 3 : 4, GROUP_GAINS[i], mode)),
    [segments, lowPower, mode]
  );

  const dormantLines = useMemo(() => {
    const pts: number[] = [];
    for (const group of segments) for (const { a, b } of group.segs) pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(p.graphite),
        transparent: true,
        opacity: 0,
      })
    );
  }, [segments, p.graphite]);
  const lineTargetOpacity = mode === "light" ? 0.2 : 0.16;

  const nodePositions = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    for (let l = 0; l < N_LAYERS; l++)
      for (let i = 0; i < LAYER_SIZES[l]; i++) arr.push(nodePos(l, i));
    return arr;
  }, []);

  const { nodeMesh, haloMesh, setNodeScales } = useMemo(() => {
    const sphere = new THREE.SphereGeometry(1, lowPower ? 10 : 16, lowPower ? 10 : 16);
    const nodeMesh = new THREE.InstancedMesh(sphere, new THREE.MeshBasicMaterial({ toneMapped: false }), NODE_COUNT);
    const haloMesh = new THREE.InstancedMesh(
      sphere,
      new THREE.MeshBasicMaterial({
        toneMapped: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      NODE_COUNT
    );
    haloMesh.visible = mode === "dark";
    haloMesh.raycast = () => {};
    const m = new THREE.Matrix4();
    const setNodeScales = (perLayer: number[]) => {
      for (let k = 0; k < NODE_COUNT; k++) {
        const l = nodeLayer(k);
        const r = NODE_R[l] * perLayer[l];
        const pos = nodePositions[k];
        m.makeScale(r, r, r).setPosition(pos);
        nodeMesh.setMatrixAt(k, m);
        m.makeScale(r * 2.3, r * 2.3, r * 2.3).setPosition(pos);
        haloMesh.setMatrixAt(k, m);
      }
      nodeMesh.instanceMatrix.needsUpdate = true;
      haloMesh.instanceMatrix.needsUpdate = true;
    };
    setNodeScales(new Array(N_LAYERS).fill(1));
    const dormant = new THREE.Color(PALETTES[mode].graphite);
    for (let k = 0; k < NODE_COUNT; k++) {
      nodeMesh.setColorAt(k, dormant);
      haloMesh.setColorAt(k, new THREE.Color(0, 0, 0));
    }
    return { nodeMesh, haloMesh, setNodeScales };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodePositions, lowPower, mode]);

  const digitSprites = useMemo(() => {
    return Array.from({ length: 10 }, (_, d) => {
      const s = makeTextSprite(String(d), 84, 0.4);
      s.position.set(LAYER_X[N_LAYERS] + 0.8, nodePos(N_LAYERS - 1, d).y, 0);
      return s;
    });
  }, []);

  const captionSprites = useMemo(() => {
    const caps = ["your drawing", "64 neurons", "48 neurons", "32 neurons", "16 neurons", "10 digits"];
    return caps.map((text, i) => {
      const gridHalf =
        i === 0 ? 2.2 : i === N_LAYERS ? 3.4 : ((GRIDS[i - 1].r - 1) / 2) * GRIDS[i - 1].dy + 0.8;
      const s = makeTextSprite(text, 44, 0.28);
      s.position.set(LAYER_X[i], -gridHalf - 0.5, 0);
      return s;
    });
  }, []);

  const { planeMesh, planeTexture } = useMemo(() => {
    const data = new Uint8Array(28 * 28 * 4);
    const tex = new THREE.DataTexture(data, 28, 28, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE), mat);
    mesh.position.set(LAYER_X[0], 0, 0);
    return { planeMesh: mesh, planeTexture: tex };
  }, []);

  const planeFrame = useMemo(() => {
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(p.graphite), transparent: true, opacity: 0.8 })
    );
    frame.position.set(LAYER_X[0], 0, 0);
    return frame;
  }, [p.graphite]);

  // drawn digit -> plane texture (texture row 0 is the image's bottom row)
  useEffect(() => {
    const data = planeTexture.image.data as Uint8Array;
    const copper = new THREE.Color(p.copper);
    const bg = new THREE.Color(p.paper);
    for (let row = 0; row < 28; row++) {
      for (let col = 0; col < 28; col++) {
        const v = input ? input[row * 28 + col] : 0;
        const o = ((27 - row) * 28 + col) * 4;
        const c = bg.clone().lerp(copper, Math.min(1, v * 1.2));
        data[o] = Math.round(c.r * 255);
        data[o + 1] = Math.round(c.g * 255);
        data[o + 2] = Math.round(c.b * 255);
        data[o + 3] = v > 0.02 ? 255 : mode === "light" ? 60 : 40;
      }
    }
    planeTexture.needsUpdate = true;
  }, [input, planeTexture, p.copper, p.paper, mode]);

  // load run values into fibers (also re-applies after a mode rebuild)
  useEffect(() => {
    if (!run) return;
    for (let g = 0; g < N_LAYERS; g++)
      applyEdgeValues(fiberGroups[g], run.edges[g], segments[g].map);
  }, [run, fiberGroups, segments]);

  // ---- pointer interaction ----
  const setHover = useApp((s) => s.setHover);
  const select = useApp((s) => s.select);

  const onNodeMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const k = e.instanceId;
    if (k === undefined) return;
    const l = nodeLayer(k);
    const i = k - LAYER_OFFSETS[l];
    const st = useApp.getState();
    const acts = st.run?.result.layers[l];
    const isOut = l === N_LAYERS - 1;
    setHover({
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      title: isOut ? `the "${i}" output` : `layer ${l + 1}, neuron ${i}`,
      lines: [
        `activation: ${acts ? acts.a[i].toFixed(3) : "run something first"}`,
        isOut
          ? `probability: ${acts ? (acts.a[i] * 100).toFixed(1) + "%" : "?"}`
          : `weighted sum: ${acts ? acts.z[i].toFixed(3) : "?"}`,
        "click to open it up",
      ],
    });
  };
  const onNodeClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const k = e.instanceId;
    if (k === undefined) return;
    const l = nodeLayer(k);
    select({ kind: "node", layer: l + 1, index: k - LAYER_OFFSETS[l] });
  };
  const onFiberMove = (t: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const k = e.instanceId;
    if (k === undefined) return;
    const st = useApp.getState();
    if (!st.model) return;
    const orig = segments[t].map[k];
    if (orig === undefined) return;
    if (t === 0) {
      const cell = Math.floor(orig / LAYER_SIZES[0]);
      const i = orig % LAYER_SIZES[0];
      const flow = st.run?.edges[0][orig];
      setHover({
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
        title: `image region ${cell} → neuron ${i}`,
        lines: [`signal through here: ${flow !== undefined ? flow.toFixed(3) : "?"}`],
      });
      return;
    }
    const nIn = LAYER_SIZES[t - 1];
    const i = Math.floor(orig / nIn);
    const j = orig % nIn;
    const w = st.model.layers[t].weights[i][j];
    const flow = st.run?.edges[t][orig];
    setHover({
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      title: `a single weight`,
      lines: [
        `w = ${w.toFixed(3)}`,
        `carrying: ${flow !== undefined ? flow.toFixed(3) : "?"}`,
        "click for the full story",
      ],
    });
  };
  const onFiberClick = (t: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const k = e.instanceId;
    if (k === undefined || t === 0) return;
    const orig = segments[t].map[k];
    if (orig === undefined) return;
    const nIn = LAYER_SIZES[t - 1];
    select({ kind: "edge", transition: t, from: orig % nIn, to: Math.floor(orig / nIn) });
  };
  const clearHover = () => setHover(null);

  // ---- per-frame animation ----
  const { camera, controls } = useThree();
  const focusTarget = useMemo(() => new THREE.Vector3(), []);
  const focusPos = useMemo(() => new THREE.Vector3(), []);
  const groupRef = useRef<THREE.Group>(null);
  const tRef = useRef(0);
  const lastRunId = useRef(0);
  const introStart = useRef<number | null>(null);
  const introDone = useRef(false);

  const colors = useMemo(() => {
    const light = mode === "light";
    return {
      dormant: light
        ? new THREE.Color(p.card).lerp(new THREE.Color(p.graphite), 0.75)
        : new THREE.Color(p.graphite).multiplyScalar(0.85),
      copper: new THREE.Color(p.copper),
      ember: new THREE.Color(p.ember),
      gold: new THREE.Color(p.gold),
      inkDim: new THREE.Color(p.ink).multiplyScalar(light ? 1 : 0.55),
      faint: new THREE.Color(p.faint),
    };
  }, [mode, p]);
  const tmp = useMemo(() => new THREE.Color(), []);
  const tmp2 = useMemo(() => new THREE.Color(), []);
  const ramp = (out: THREE.Color, v: number) => {
    if (v <= 0.65) out.lerpColors(colors.dormant, colors.copper, v / 0.65);
    else out.lerpColors(colors.copper, colors.ember, Math.min(1, (v - 0.65) / 0.35));
  };

  useFrame(({ clock }, delta) => {
    const st = useApp.getState();

    // assembly intro: layers scale in left to right
    let introT = 1;
    if (!introDone.current) {
      if (st.reducedMotion) {
        introDone.current = true;
      } else {
        if (introStart.current === null) introStart.current = clock.elapsedTime;
        introT = Math.min(1, ((clock.elapsedTime - introStart.current) * 1000) / INTRO_MS);
        const w = (l: number) => stageProgress([0.08 + l * 0.13, 0.34 + l * 0.13], introT);
        setNodeScales(Array.from({ length: N_LAYERS }, (_, l) => w(l)));
        (planeMesh.material as THREE.MeshBasicMaterial).opacity = w(-0.5);
        dormantLines.material.opacity = lineTargetOpacity * introT;
        if (introT >= 1) introDone.current = true;
      }
    }
    if (introDone.current && dormantLines.material.opacity !== lineTargetOpacity) {
      dormantLines.material.opacity = lineTargetOpacity;
      setNodeScales(new Array(N_LAYERS).fill(1));
    }

    // run progress: monotonic, speed-scaled, capped by step checkpoints
    const run = st.run;
    if (run) {
      if (run.id !== lastRunId.current) {
        lastRunId.current = run.id;
        tRef.current = run.instant ? 1 : 0;
      }
      if (st.settled || run.instant) {
        tRef.current = 1;
      } else {
        const cap = st.stepMode ? STEP_CHECKPOINTS[st.stepIndex] : 1;
        if (tRef.current < cap) {
          tRef.current = Math.min(cap, tRef.current + (delta * 1000 * st.speed) / RUN_MS);
        }
        if (tRef.current >= 1) st.markSettled();
      }
    }
    const t = run ? tRef.current : 0;

    for (let g = 0; g < N_LAYERS; g++) {
      const sp = run ? stageProgress(STAGES.edges[g], t) : 0;
      fiberGroups[g].material.uniforms.uPulse.value = run ? -0.2 + sp * 1.5 : -0.5;
    }

    const layers = run?.result.layers;
    const gates = STAGES.nodes.map((w) => (run ? stageProgress(w, t) : 0));
    const norm = (arr: Float32Array | undefined, i: number) => {
      if (!arr) return 0;
      let max = 0;
      for (let k = 0; k < arr.length; k++) if (arr[k] > max) max = arr[k];
      return max > 0 ? arr[i] / max : 0;
    };

    const lastL = N_LAYERS - 1;
    for (let k = 0; k < NODE_COUNT; k++) {
      const l = nodeLayer(k);
      const i = k - LAYER_OFFSETS[l];
      let v = 0;
      let isWinner = false;
      let settleP = 0;
      if (l < lastL) {
        v = norm(layers?.[l].a, i) * gates[l];
      } else {
        const prob = layers ? layers[lastL].a[i] : 0;
        settleP = gates[lastL];
        v = prob * settleP;
        isWinner = !!run && i === run.result.prediction;
      }
      ramp(tmp, v);
      if (isWinner) tmp.lerp(colors.gold, settleP * 0.9);
      nodeMesh.setColorAt(k, tmp);
      const haloStrength = isWinner ? v * 0.3 + settleP * 0.4 : v * 0.3;
      tmp2.copy(isWinner ? colors.gold : colors.copper).multiplyScalar(haloStrength);
      haloMesh.setColorAt(k, tmp2);
    }
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
    if (haloMesh.instanceColor) haloMesh.instanceColor.needsUpdate = true;

    for (let d = 0; d < 10; d++) {
      const mat = digitSprites[d].material;
      if (run && d === run.result.prediction && gates[lastL] > 0.5) {
        mat.color.copy(colors.gold);
        mat.opacity = 1;
      } else {
        mat.color.copy(colors.inkDim);
        mat.opacity = 0.85;
      }
    }
    for (const cap of captionSprites) {
      cap.material.color.copy(colors.faint);
      cap.material.opacity = 0.9 * (introDone.current ? 1 : introT);
    }

    if (introDone.current) {
      (planeMesh.material as THREE.MeshBasicMaterial).opacity = 1;
    }

    // scroll response: the graph leans and closes in as you read on
    if (groupRef.current && scrollT) {
      const s = st.reducedMotion ? 0 : scrollT.get();
      groupRef.current.rotation.y = s * 0.45;
      groupRef.current.position.z = s * 2.2;
      groupRef.current.position.y = s * -0.6;
    }

    // "look closer" buttons: fly the camera to a layer; a manual drag or
    // "back out" hands control back
    const orbit = controls as OrbitControlsImpl | null;
    if (orbit) {
      orbit.autoRotate = !st.reducedMotion && st.focus === null;
      if (st.focus !== null) {
        const overview = st.focus === -1;
        const fx = overview ? 0 : LAYER_X[st.focus] - 0.7;
        focusTarget.set(overview ? 0 : fx, 0, 0);
        focusPos.set(
          overview ? 3.2 : fx + 1.2,
          overview ? 2 : 0.8,
          overview ? (st.lowPower ? 26 : 20) : st.focus === 0 ? 6.5 : st.focus === 5 ? 10 : 9.5
        );
        const ease = st.reducedMotion ? 1 : 0.07;
        orbit.target.lerp(focusTarget, ease);
        camera.position.lerp(focusPos, ease);
        if (overview && camera.position.distanceTo(focusPos) < 0.15) {
          st.setFocus(null);
        }
      }
    }
  });

  return (
    // nudged left so the output column clears the right-side panels at rest
    <group ref={groupRef} position={[-0.7, 0, 0]}>
      <primitive object={dormantLines} />
      {fiberGroups.map((g, i) => (
        <primitive
          key={i}
          object={g.mesh}
          onPointerMove={onFiberMove(i)}
          onPointerOut={clearHover}
          onClick={onFiberClick(i)}
        />
      ))}
      <primitive
        object={nodeMesh}
        onPointerMove={onNodeMove}
        onPointerOut={clearHover}
        onClick={onNodeClick}
      />
      <primitive object={haloMesh} />
      <primitive object={planeMesh} />
      <primitive object={planeFrame} />
      {digitSprites.map((s, i) => (
        <primitive key={`d${i}`} object={s} />
      ))}
      {captionSprites.map((s, i) => (
        <primitive key={`c${i}`} object={s} />
      ))}
    </group>
  );
}

export default function NetworkScene({ scrollT }: NetworkProps) {
  const mode = useApp((s) => s.mode);
  const reducedMotion = useApp((s) => s.reducedMotion);
  const lowPower = useApp((s) => s.lowPower);
  const p = PALETTES[mode];
  return (
    <Canvas
      camera={{ position: lowPower ? [2.6, 1.8, 26] : [3.2, 2, 20], fov: 40 }}
      dpr={lowPower ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="!absolute inset-0"
    >
      <color attach="background" args={[p.paper]} />
      <fog attach="fog" args={lowPower ? [p.paper, 28, 50] : [p.paper, 21, 40]} />
      <Network scrollT={scrollT} />
      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.2}
        minDistance={4}
        maxDistance={32}
        maxPolarAngle={Math.PI * 0.85}
        onStart={() => useApp.getState().setFocus(null)}
      />
    </Canvas>
  );
}
