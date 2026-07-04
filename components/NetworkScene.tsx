"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import type { ForwardResult } from "@/lib/inference";
import { PALETTE, RUN_MS, STAGES, stageProgress } from "@/lib/theme";

/** Everything the scene needs for one inference run — all real numbers. */
export interface RunState {
  id: number;
  result: ForwardResult;
  /**
   * Signed signal per edge, one array per edge group:
   * [0] input regions -> h1 (16 cells x 16 nodes), [1] h1 -> h2 (16x16),
   * [2] h2 -> out (10x16). Values are w * upstream-activation sums.
   */
  edges: [Float32Array, Float32Array, Float32Array];
}

interface NetworkSceneProps {
  input: Float32Array | null;
  run: RunState | null;
  reducedMotion: boolean;
  lowPower: boolean;
}

// ---- static geometry of the network ----------------------------------------

const LAYER_X = { input: -6, h1: -2, h2: 2, out: 6 };
const PLANE_SIZE = 3.2;

function hiddenPos(x: number, i: number): THREE.Vector3 {
  const r = Math.floor(i / 4);
  const c = i % 4;
  return new THREE.Vector3(x, 1.65 - r * 1.1, -1.65 + c * 1.1);
}

function outputPos(i: number): THREE.Vector3 {
  return new THREE.Vector3(LAYER_X.out, 3.06 - i * 0.68, 0);
}

/** Center of input-region cell (4x4 partition of the drawn image plane). */
function anchorPos(cell: number): THREE.Vector3 {
  const r = Math.floor(cell / 4);
  const c = cell % 4;
  return new THREE.Vector3(LAYER_X.input + (-1.2 + c * 0.8), 1.2 - r * 0.8, 0);
}

interface Seg {
  a: THREE.Vector3;
  b: THREE.Vector3;
}

function buildSegments(): [Seg[], Seg[], Seg[]] {
  const h1 = Array.from({ length: 16 }, (_, i) => hiddenPos(LAYER_X.h1, i));
  const h2 = Array.from({ length: 16 }, (_, i) => hiddenPos(LAYER_X.h2, i));
  const out = Array.from({ length: 10 }, (_, i) => outputPos(i));
  const g1: Seg[] = [];
  for (let cell = 0; cell < 16; cell++)
    for (let i = 0; i < 16; i++) g1.push({ a: anchorPos(cell), b: h1[i] });
  const g2: Seg[] = [];
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 16; j++) g2.push({ a: h1[j], b: h2[i] });
  const g3: Seg[] = [];
  for (let i = 0; i < 10; i++)
    for (let j = 0; j < 16; j++) g3.push({ a: h2[j], b: out[i] });
  return [g1, g2, g3];
}

// ---- signal-fiber shader ----------------------------------------------------
// The signature element: each connection is an instanced cylinder whose
// radius and brightness come from |weight x upstream activation|, with a
// white-hot wavefront (uPulse) traveling source -> target during its stage.

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
  uniform vec3 uCore;
  uniform vec3 uTrace;
  uniform float uPulse;
  uniform float uGain;
  varying float vAlong;
  varying float vIntensity;
  varying float vSign;
  void main() {
    float head = exp(-pow((vAlong - uPulse) * 6.0, 2.0));
    float passed = smoothstep(vAlong - 0.08, vAlong, uPulse);
    float energy = vIntensity * (0.32 * passed + head * 1.1) * uGain;
    if (energy < 0.004) discard;
    vec3 tint = mix(uTrace * 1.7, uSignal, step(0.0, vSign));
    vec3 col = mix(tint, uCore, head * vIntensity);
    gl_FragColor = vec4(col * energy, energy);
  }
`;

function makeFiberGroup(segments: Seg[], radialSegments: number, gain: number) {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, radialSegments, 1, true);
  const count = segments.length;
  geometry.setAttribute(
    "aIntensity",
    new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
  );
  geometry.setAttribute(
    "aSign",
    new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1)
  );
  const material = new THREE.ShaderMaterial({
    vertexShader: fiberVertex,
    fragmentShader: fiberFragment,
    uniforms: {
      uSignal: { value: new THREE.Color(PALETTE.signal) },
      uCore: { value: new THREE.Color(PALETTE.core) },
      uTrace: { value: new THREE.Color(PALETTE.trace) },
      uPulse: { value: -0.5 },
      uGain: { value: gain },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
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
      const r = 0.015 + 0.06 * (intensity ? intensity[k] : 0);
      m.compose(mid, q, new THREE.Vector3(r, len, r));
      mesh.setMatrixAt(k, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  setMatrices(null);
  return { mesh, material, setMatrices };
}

/** Normalize signed edge values into [0,1] intensity (sqrt to lift mids) + sign. */
function applyEdgeValues(
  group: ReturnType<typeof makeFiberGroup>,
  values: Float32Array
) {
  const n = values.length;
  let max = 0;
  for (let k = 0; k < n; k++) {
    const v = Math.abs(values[k]);
    if (v > max) max = v;
  }
  const intensity = new Float32Array(n);
  const geo = group.mesh.geometry;
  const aIntensity = geo.getAttribute("aIntensity") as THREE.InstancedBufferAttribute;
  const aSign = geo.getAttribute("aSign") as THREE.InstancedBufferAttribute;
  for (let k = 0; k < n; k++) {
    intensity[k] = max > 0 ? Math.sqrt(Math.abs(values[k]) / max) : 0;
    aIntensity.setX(k, intensity[k]);
    aSign.setX(k, values[k] >= 0 ? 1 : -1);
  }
  aIntensity.needsUpdate = true;
  aSign.needsUpdate = true;
  group.setMatrices(intensity);
}

// ---- the network ------------------------------------------------------------

const EDGE_STAGES = [STAGES.edges1, STAGES.edges2, STAGES.edges3] as const;

function Network({ input, run, reducedMotion, lowPower }: NetworkSceneProps) {
  const segments = useMemo(buildSegments, []);
  // Per-group gain compensates for additive overdraw: the 256-fiber
  // h1->h2 bundle would white out at the same gain as the sparser groups.
  const fiberGroups = useMemo(
    () =>
      segments.map((s, i) => makeFiberGroup(s, lowPower ? 3 : 5, [0.9, 0.5, 0.85][i])),
    [segments, lowPower]
  );

  // Dormant architecture: every connection as a faint hairline.
  const dormantLines = useMemo(() => {
    const pts: number[] = [];
    for (const group of segments)
      for (const { a, b } of group) pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(PALETTE.trace),
        transparent: true,
        opacity: 0.22,
      })
    );
  }, [segments]);

  // Nodes (16 + 16 + 10) + additive halos.
  const nodePositions = useMemo(
    () => [
      ...Array.from({ length: 16 }, (_, i) => hiddenPos(LAYER_X.h1, i)),
      ...Array.from({ length: 16 }, (_, i) => hiddenPos(LAYER_X.h2, i)),
      ...Array.from({ length: 10 }, (_, i) => outputPos(i)),
    ],
    []
  );
  const { nodeMesh, haloMesh } = useMemo(() => {
    const sphere = new THREE.SphereGeometry(1, lowPower ? 12 : 20, lowPower ? 12 : 20);
    const nodeMesh = new THREE.InstancedMesh(
      sphere,
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      42
    );
    const haloMesh = new THREE.InstancedMesh(
      sphere,
      new THREE.MeshBasicMaterial({
        toneMapped: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      42
    );
    const m = new THREE.Matrix4();
    nodePositions.forEach((p, k) => {
      const r = k >= 32 ? 0.2 : 0.16;
      m.makeScale(r, r, r).setPosition(p);
      nodeMesh.setMatrixAt(k, m);
      m.makeScale(r * 2.4, r * 2.4, r * 2.4).setPosition(p);
      haloMesh.setMatrixAt(k, m);
    });
    const dormant = new THREE.Color(PALETTE.trace).multiplyScalar(0.85);
    for (let k = 0; k < 42; k++) {
      nodeMesh.setColorAt(k, dormant);
      haloMesh.setColorAt(k, new THREE.Color(0, 0, 0));
    }
    return { nodeMesh, haloMesh };
  }, [nodePositions, lowPower]);

  // Digit labels beside the output column, as canvas sprites (self-contained,
  // no remote font fetch for the 3D text).
  const labels = useMemo(() => {
    const sprites: THREE.Sprite[] = [];
    for (let d = 0; d < 10; d++) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const draw = () => {
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, 128, 128);
        ctx.font = "600 84px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(d), 64, 68);
      };
      draw();
      const map = new THREE.CanvasTexture(canvas);
      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(() => {
          draw();
          map.needsUpdate = true;
        });
      }
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false })
      );
      sprite.position.set(LAYER_X.out + 0.85, outputPos(d).y, 0);
      sprite.scale.setScalar(0.42);
      sprites.push(sprite);
    }
    return sprites;
  }, []);

  // Input plane: the drawn 28x28 image, tinted signal, entering the network.
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
    mesh.position.set(LAYER_X.input, 0, 0);
    return { planeMesh: mesh, planeTexture: tex };
  }, []);

  const planeFrame = useMemo(() => {
    const geo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE));
    const frame = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.trace), transparent: true, opacity: 0.7 })
    );
    frame.position.set(LAYER_X.input, 0, 0);
    return frame;
  }, []);

  // Ambient "marine snow" for depth; drifts only when motion is allowed.
  const snow = useMemo(() => {
    const n = lowPower ? 80 : 180;
    const pts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pts[i * 3] = (Math.random() - 0.5) * 30;
      pts[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pts[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: new THREE.Color(PALETTE.trace),
        size: 0.06,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
  }, [lowPower]);

  // Write the drawn digit into the plane texture (rows flipped: MNIST row 0
  // is the top of the image, texture row 0 is the bottom).
  useEffect(() => {
    const data = planeTexture.image.data as Uint8Array;
    const tint = new THREE.Color(PALETTE.signal);
    for (let row = 0; row < 28; row++) {
      for (let col = 0; col < 28; col++) {
        const v = input ? input[row * 28 + col] : 0;
        const o = ((27 - row) * 28 + col) * 4;
        const boost = Math.min(1, v * 1.35);
        data[o] = Math.round(255 * (tint.r * boost + (1 - boost) * 0.02));
        data[o + 1] = Math.round(255 * (tint.g * boost + (1 - boost) * 0.04));
        data[o + 2] = Math.round(255 * (tint.b * boost + (1 - boost) * 0.08));
        data[o + 3] = v > 0.02 ? 255 : 40;
      }
    }
    planeTexture.needsUpdate = true;
  }, [input, planeTexture]);

  // Load a new run's real numbers into the fibers.
  const runRef = useRef<RunState | null>(null);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    runRef.current = run;
    startRef.current = null;
    if (!run) return;
    for (let g = 0; g < 3; g++) applyEdgeValues(fiberGroups[g], run.edges[g]);
  }, [run, fiberGroups]);

  // Per-frame animation: one clock drives edge pulses, node glow, labels.
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const tmpColor2 = useMemo(() => new THREE.Color(), []);
  const ramp = useMemo(() => {
    const dormant = new THREE.Color(PALETTE.trace).multiplyScalar(0.85);
    const signal = new THREE.Color(PALETTE.signal);
    const core = new THREE.Color(PALETTE.core);
    return (out: THREE.Color, v: number) => {
      if (v <= 0.65) out.lerpColors(dormant, signal, v / 0.65);
      else out.lerpColors(signal, core, Math.min(1, (v - 0.65) / 0.35));
    };
  }, []);
  const verdictColor = useMemo(() => new THREE.Color(PALETTE.verdict), []);
  const signalColor = useMemo(() => new THREE.Color(PALETTE.signal), []);
  const coreDim = useMemo(() => new THREE.Color(PALETTE.core).multiplyScalar(0.5), []);

  useFrame(({ clock }, delta) => {
    const active = runRef.current;
    let t = 0;
    if (active) {
      if (reducedMotion) {
        t = 1;
      } else {
        if (startRef.current === null) startRef.current = clock.elapsedTime;
        t = Math.min(1, ((clock.elapsedTime - startRef.current) * 1000) / RUN_MS);
      }
    }

    for (let g = 0; g < 3; g++) {
      const sp = active ? stageProgress(EDGE_STAGES[g], t) : 0;
      fiberGroups[g].material.uniforms.uPulse.value = active ? -0.2 + sp * 1.5 : -0.5;
    }

    const gates = [
      active ? stageProgress(STAGES.hidden1, t) : 0,
      active ? stageProgress(STAGES.hidden2, t) : 0,
      active ? stageProgress(STAGES.output, t) : 0,
    ];
    const layers = active?.result.layers;
    const norm = (arr: Float32Array | undefined, i: number) => {
      if (!arr) return 0;
      let max = 0;
      for (let k = 0; k < arr.length; k++) if (arr[k] > max) max = arr[k];
      return max > 0 ? arr[i] / max : 0;
    };

    for (let k = 0; k < 42; k++) {
      let v = 0;
      let isWinner = false;
      let settle = 0;
      if (k < 16) v = norm(layers?.[0].a, k) * gates[0];
      else if (k < 32) v = norm(layers?.[1].a, k - 16) * gates[1];
      else {
        const d = k - 32;
        const p = layers ? layers[2].a[d] : 0;
        settle = gates[2];
        v = p * settle;
        isWinner = !!active && d === active.result.prediction;
      }
      ramp(tmpColor, v);
      if (isWinner) tmpColor.lerp(verdictColor, settle * 0.9);
      nodeMesh.setColorAt(k, tmpColor);

      const haloStrength = isWinner ? v * 0.35 + settle * 0.45 : v * 0.35;
      tmpColor2.copy(isWinner ? verdictColor : signalColor).multiplyScalar(haloStrength);
      haloMesh.setColorAt(k, tmpColor2);
    }
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
    if (haloMesh.instanceColor) haloMesh.instanceColor.needsUpdate = true;

    for (let d = 0; d < 10; d++) {
      const mat = labels[d].material;
      if (active && d === active.result.prediction && gates[2] > 0.5) {
        mat.color.copy(verdictColor);
        mat.opacity = 1;
      } else {
        mat.color.copy(coreDim);
        mat.opacity = 0.8;
      }
    }

    (planeMesh.material as THREE.MeshBasicMaterial).opacity = input ? 1 : 0.5;

    if (!reducedMotion) snow.rotation.y += delta * 0.008;
  });

  return (
    // Shifted left so the output column clears the readout panel overlay.
    <group position={[-0.9, 0, 0]}>
      <primitive object={dormantLines} />
      {fiberGroups.map((g, i) => (
        <primitive key={i} object={g.mesh} />
      ))}
      <primitive object={nodeMesh} />
      <primitive object={haloMesh} />
      <primitive object={planeMesh} />
      <primitive object={planeFrame} />
      {labels.map((s, i) => (
        <primitive key={i} object={s} />
      ))}
      <primitive object={snow} />
    </group>
  );
}

function SceneSetup() {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(new THREE.Color(PALETTE.abyss));
  }, [gl]);
  return (
    <>
      <fog attach="fog" args={[PALETTE.abyss, 16, 30]} />
    </>
  );
}

export default function NetworkScene(props: NetworkSceneProps) {
  return (
    <Canvas
      camera={{ position: props.lowPower ? [3, 2, 19] : [3.6, 2.3, 13.6], fov: 40 }}
      dpr={props.lowPower ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="!absolute inset-0"
    >
      <SceneSetup />
      <Network {...props} />
      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate={!props.reducedMotion}
        autoRotateSpeed={0.25}
        minDistance={6}
        maxDistance={22}
        maxPolarAngle={Math.PI * 0.85}
      />
    </Canvas>
  );
}
