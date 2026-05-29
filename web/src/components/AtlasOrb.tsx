"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

/** Atlas hero artifact — a navigator's orb:
 *  - solid gradient core (deep violet → pink, light-emissive)
 *  - clean wireframe icosphere shell (violet hairline)
 *  - 3 orbiting nodes on offset rings (mint, pink, violet)
 *  - subtle particle dust drifting through the volume
 *  Reads as a brand-aligned compass/atlas rather than a generic blob. */

function GradientCore() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.18;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.3) * 0.2;
  });
  return (
    <mesh ref={ref} scale={1.05}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhysicalMaterial
        color="#6B5BE6"
        emissive="#3D2EA8"
        emissiveIntensity={0.55}
        roughness={0.25}
        metalness={0.4}
        clearcoat={0.8}
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
}

function WireShell() {
  const ref = useRef<THREE.LineSegments>(null);
  const geom = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(1.55, 2);
    return new THREE.EdgesGeometry(ico);
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = clock.elapsedTime * 0.08;
    ref.current.rotation.y = -clock.elapsedTime * 0.12;
  });
  return (
    <lineSegments ref={ref} geometry={geom}>
      <lineBasicMaterial color="#6B5BE6" transparent opacity={0.55} />
    </lineSegments>
  );
}

interface RingNodeProps {
  radius: number;
  speed: number;
  phase: number;
  color: string;
  tilt: [number, number, number];
}

function RingNode({ radius, speed, phase, color, tilt }: RingNodeProps) {
  const ref = useRef<THREE.Group>(null);
  const nodeRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || !nodeRef.current) return;
    const t = clock.elapsedTime * speed + phase;
    nodeRef.current.position.x = Math.cos(t) * radius;
    nodeRef.current.position.z = Math.sin(t) * radius;
  });
  return (
    <group ref={ref} rotation={tilt}>
      {/* ring track */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.012, radius + 0.012, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      {/* node */}
      <mesh ref={nodeRef}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* halo */}
      <mesh ref={nodeRef} scale={2.6}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const N = 220;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 1.8 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.04;
    ref.current.rotation.x = clock.elapsedTime * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#6B5BE6" size={0.025} sizeAttenuation transparent opacity={0.6} />
    </points>
  );
}

function Scene() {
  return (
    <Float speed={0.9} rotationIntensity={0.25} floatIntensity={0.6}>
      <group>
        <GradientCore />
        <WireShell />
        <RingNode radius={1.95} speed={0.6} phase={0} color="#1FB89A" tilt={[0.1, 0, 0.4]} />
        <RingNode radius={2.25} speed={-0.45} phase={Math.PI / 2} color="#E5478F" tilt={[-0.5, 0.3, 0]} />
        <RingNode radius={2.6} speed={0.35} phase={Math.PI} color="#6B5BE6" tilt={[0.6, -0.2, 0.1]} />
        <Dust />
      </group>
    </Float>
  );
}

export function AtlasOrb({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.65} />
        <pointLight position={[3, 3, 4]} intensity={3} color="#E5478F" />
        <pointLight position={[-4, -2, 2]} intensity={2.5} color="#1FB89A" />
        <pointLight position={[0, 4, -2]} intensity={2.2} color="#6B5BE6" />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-12 -z-10 rounded-full blur-3xl bg-violet-glow/20" />
    </div>
  );
}
