'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

/* ───────── helpers ───────── */

function createASCIITexture(asciiArt: string, color: string, glowColor: string, mood: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const lines = asciiArt.split('\n').filter(l => l.length > 0);
  const maxLen = Math.max(...lines.map(l => l.length));

  const fontSize = 18;
  const lineHeight = fontSize * 1.25;
  const padding = 30;

  canvas.width = maxLen * fontSize * 0.62 + padding * 2;
  canvas.height = lines.length * lineHeight + padding * 2;

  // Transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Glow layer
  ctx.save();
  ctx.font = `bold ${fontSize}px "Courier New", "JetBrains Mono", monospace`;
  ctx.textBaseline = 'top';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 25;
  ctx.fillStyle = color;
  lines.forEach((line, i) => {
    ctx.fillText(line, padding, padding + i * lineHeight);
  });
  ctx.restore();

  // Sharp layer on top
  ctx.save();
  ctx.font = `bold ${fontSize}px "Courier New", "JetBrains Mono", monospace`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  lines.forEach((line, i) => {
    ctx.fillText(line, padding, padding + i * lineHeight);
  });
  ctx.restore();

  return canvas;
}

/* ───────── Floating Particles ───────── */

function Particle({ position, color, speed, size }: { position: [number, number, number]; color: string; speed: number; size: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed;
    ref.current.position.y = position[1] + Math.sin(t + position[0]) * 0.6;
    ref.current.position.x = position[0] + Math.cos(t * 0.6 + position[2]) * 0.4;
    ref.current.rotation.x = t * 0.5;
    ref.current.rotation.z = t * 0.3;
    const s = 0.8 + Math.sin(t * 2) * 0.2;
    ref.current.scale.set(s, s, s);
  });

  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[size, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        transparent
        opacity={0.5}
      />
    </mesh>
  );
}

/* ───────── ASCII Pet Plane ───────── */

interface PetPlaneProps {
  asciiArt: string;
  color: string;
  glowColor: string;
  mood: string;
  actionPulse: number;
}

function PetPlane({ asciiArt, color, glowColor, mood, actionPulse }: PetPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    const canvas = createASCIITexture(asciiArt, color, glowColor, mood);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [asciiArt, color, glowColor, mood]);

  const moodScale = useMemo(() => {
    switch (mood) {
      case 'ecstatic': return 1.0;
      case 'happy': return 0.7;
      case 'neutral': return 0.4;
      case 'sad': return 0.2;
      case 'critical': return 0.1;
      default: return 0.4;
    }
  }, [mood]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Gentle floating
    meshRef.current.position.y = Math.sin(t * 1.2) * 0.12;
    meshRef.current.position.x = Math.cos(t * 0.8) * 0.06;

    // Subtle tilt
    meshRef.current.rotation.y = Math.sin(t * 0.4) * 0.03;
    meshRef.current.rotation.z = Math.sin(t * 0.6 + 1) * 0.015;

    // Action pulse
    if (actionPulse > 0) {
      const pulse = 1 + Math.sin(actionPulse * 10) * 0.04;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  if (!texture) return null;

  const aspect = texture.image.width / texture.image.height;
  const height = 2.8;
  const width = height * aspect;

  return (
    <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.25}>
      <mesh ref={meshRef}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={1}
          emissive={glowColor}
          emissiveIntensity={moodScale * 0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </Float>
  );
}

/* ───────── Scene ───────── */

interface SceneProps {
  asciiArt: string;
  color: string;
  glowColor: string;
  mood: string;
  actionPulse: number;
}

function Scene({ asciiArt, color, glowColor, mood, actionPulse }: SceneProps) {
  const particles = useMemo(() => {
    const result: { pos: [number, number, number]; color: string; speed: number; size: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const r = 2 + Math.random() * 2;
      result.push({
        pos: [Math.cos(angle) * r, (Math.random() - 0.5) * 3, -1.5 + Math.sin(angle) * r * 0.5],
        color: glowColor,
        speed: 0.2 + Math.random() * 0.4,
        size: 0.02 + Math.random() * 0.04,
      });
    }
    return result;
  }, [glowColor]);

  const moodBg = useMemo((): [number, number, number] => {
    switch (mood) {
      case 'ecstatic': return [0.06, 0.02, 0.1];
      case 'happy': return [0.02, 0.06, 0.06];
      case 'neutral': return [0.03, 0.03, 0.05];
      case 'sad': return [0.02, 0.02, 0.06];
      case 'critical': return [0.06, 0.02, 0.02];
      default: return [0.03, 0.03, 0.05];
    }
  }, [mood]);

  const lightIntensity = useMemo(() => {
    switch (mood) {
      case 'ecstatic': return 3.5;
      case 'happy': return 2.0;
      case 'neutral': return 1.2;
      case 'sad': return 0.6;
      case 'critical': return 0.3;
      default: return 1.2;
    }
  }, [mood]);

  return (
    <>
      <color attach="background" args={moodBg} />
      <fog attach="fog" args={[`rgb(${moodBg.map(v => Math.round(v * 255)).join(',')})`, 7, 18]} />

      <ambientLight intensity={0.15} />
      <pointLight position={[0, 2, 4]} color={glowColor} intensity={lightIntensity} distance={12} decay={2} />
      <pointLight position={[-4, -1, 2]} color="#3b82f6" intensity={0.2} distance={10} />
      <pointLight position={[4, -1, 2]} color="#f43f5e" intensity={0.15} distance={10} />

      <PetPlane
        asciiArt={asciiArt}
        color={color}
        glowColor={glowColor}
        mood={mood}
        actionPulse={actionPulse}
      />

      {particles.map((p, i) => (
        <Particle key={i} position={p.pos} color={p.color} speed={p.speed} size={p.size} />
      ))}

      <Stars radius={40} depth={40} count={600} factor={2.5} saturation={0} fade speed={0.8} />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          intensity={1.5}
          radius={0.8}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </EffectComposer>
    </>
  );
}

/* ───────── Exported Canvas Component ───────── */

interface ASCIIPetCanvasProps {
  asciiArt: string;
  color: string;
  glowColor: string;
  mood: string;
  actionPulse: number;
  className?: string;
}

export default function ASCIIPetCanvas({
  asciiArt, color, glowColor, mood, actionPulse, className = '',
}: ASCIIPetCanvasProps) {
  return (
    <div className={`w-full h-full overflow-hidden ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Scene
          asciiArt={asciiArt}
          color={color}
          glowColor={glowColor}
          mood={mood}
          actionPulse={actionPulse}
        />
      </Canvas>
    </div>
  );
}
