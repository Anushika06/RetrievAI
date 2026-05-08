"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * ThreeBackground renders an animated particle constellation field on a fixed canvas.
 *
 * Visual design: "Deep-space laboratory" — slow orbital drift, connection lines
 * between nearby particles, mouse parallax effect, and a subtle scale-pulse.
 *
 * Performance: Uses THREE.BufferGeometry with THREE.Points (GPU-instanced billboards)
 * rather than individual meshes, which keeps the renderer at 60fps even with
 * 180 particles + line drawing.
 *
 * This is a client-only component (dynamic import with ssr: false from page.tsx)
 * because Three.js requires browser APIs (WebGL, window, etc.).
 */
export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  // Expose a trigger for the upload success burst effect
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // ── Scene Setup ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // Perspective camera with a wide FOV for the "space" feeling
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.z = 400;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Transparent background — CSS handles the deep-navy bg
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Fully transparent
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // ── Particle System ──────────────────────────────────────────────────
    const PARTICLE_COUNT = 180;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT); // Unique drift phase per particle
    const speeds = new Float32Array(PARTICLE_COUNT); // Unique drift speed per particle

    // Indigo: #6366f1 → rgb(99,102,241)
    const indigoColor = new THREE.Color(0x6366f1);
    // Cyan: #22d3ee → rgb(34,211,238)
    const cyanColor = new THREE.Color(0x22d3ee);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random position in a 3D box: x/y ±500, z -200 to +200
      positions[i * 3 + 0] = (Math.random() - 0.5) * 1000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 700;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;

      // 60% indigo, 40% cyan
      const color = Math.random() < 0.6 ? indigoColor : cyanColor;
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Varying sizes: 0.8px – 2.5px
      sizes[i] = 0.8 + Math.random() * 1.7;

      // Unique phase and speed for independent orbital drift
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.2 + Math.random() * 0.4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Store initial positions for drift calculation
    const initialPositions = positions.slice();

    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending, // Particles add light where they overlap
      depthWrite: false, // Prevents z-fighting with connection lines
    });

    const particleSystem = new THREE.Points(geometry, particleMaterial);
    scene.add(particleSystem);

    // ── Connection Lines ─────────────────────────────────────────────────
    // Lines are drawn between particles closer than 140px.
    // We use a LineSegments object updated each frame.
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6);
    lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3)
    );

    const lineMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.3,
      color: 0x6366f1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    // ── Mouse Parallax ───────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const cameraTarget = { x: 0, y: 0 };

    const onMouseMove = (e: MouseEvent) => {
      // Normalize to -1..+1 range
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Upload Burst State ───────────────────────────────────────────────
    let burstActive = false;
    let burstProgress = 0; // 0 → 1 (scatter), 1 → 0 (reconverge) over 300ms

    const onUploadSuccess = () => {
      burstActive = true;
      burstProgress = 1;
    };
    window.addEventListener("upload-success", onUploadSuccess);

    // ── Animation Loop ───────────────────────────────────────────────────
    const clock = new THREE.Clock();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Camera parallax: lerp toward mouse position ±15px (0.05 factor)
      cameraTarget.x += (mouse.x * 15 - cameraTarget.x) * 0.05;
      cameraTarget.y += (mouse.y * 15 - cameraTarget.y) * 0.05;
      camera.position.x = cameraTarget.x;
      camera.position.y = cameraTarget.y;

      // Particle pulse: 3s sin cycle scales overall particle size 0.9→1.1
      const pulseScale = 0.9 + Math.sin(elapsed * (Math.PI * 2) / 3) * 0.1;
      particleMaterial.size = 2 * pulseScale;

      // Burst progress decay
      if (burstActive && burstProgress > 0) {
        burstProgress -= 0.016; // ~1/60 per frame → 1s total
        if (burstProgress <= 0) {
          burstProgress = 0;
          burstActive = false;
        }
      }

      // Update particle positions with orbital drift + optional burst scatter
      const pos = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const phase = phases[i];
        const speed = speeds[i];

        // Orbital drift: sin/cos offsets with unique phase, slow speed
        const driftX = Math.sin(elapsed * speed * 0.3 + phase) * 12;
        const driftY = Math.cos(elapsed * speed * 0.2 + phase * 1.3) * 8;

        // Burst: temporarily scatter particles radially from center
        const burstOffsetX = burstActive
          ? (initialPositions[ix] / 5) * burstProgress
          : 0;
        const burstOffsetY = burstActive
          ? (initialPositions[ix + 1] / 5) * burstProgress
          : 0;

        pos[ix] = initialPositions[ix] + driftX + burstOffsetX;
        pos[ix + 1] = initialPositions[ix + 1] + driftY + burstOffsetY;
        pos[ix + 2] = initialPositions[ix + 2];
      }
      geometry.attributes.position.needsUpdate = true;

      // ── Draw connection lines between nearby particles ──────────────────
      const linePos = lineGeometry.attributes.position.array as Float32Array;
      let lineIndex = 0;
      const MAX_DISTANCE = 140;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < MAX_DISTANCE && lineIndex + 5 < linePos.length) {
            linePos[lineIndex++] = pos[i * 3];
            linePos[lineIndex++] = pos[i * 3 + 1];
            linePos[lineIndex++] = pos[i * 3 + 2];
            linePos[lineIndex++] = pos[j * 3];
            linePos[lineIndex++] = pos[j * 3 + 1];
            linePos[lineIndex++] = pos[j * 3 + 2];

            // Opacity inversely proportional to distance
            lineMaterial.opacity = Math.max(
              0.05,
              0.3 * (1 - dist / MAX_DISTANCE)
            );
          }
        }
      }
      // Zero out unused slots
      for (; lineIndex < linePos.length; lineIndex++) {
        linePos[lineIndex] = 0;
      }
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.setDrawRange(0, lineIndex / 3);

      renderer.render(scene, camera);
    };

    animate();

    // ── Resize Handler ───────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("upload-success", onUploadSuccess);
      geometry.dispose();
      lineGeometry.dispose();
      particleMaterial.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
