"use client";

import { motion, useAnimation } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import type { HomePageSettings } from "@/lib/home-customization";

export const WovenLightHero = ({
  hero,
}: {
  hero: HomePageSettings["hero"];
}) => {
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    textControls.start((i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.04,
        duration: 0.9,
        ease: [0.2, 0.65, 0.3, 0.9],
      },
    }));

    buttonControls.start({
      opacity: 1,
      transition: { delay: 0.35, duration: 0.8 },
    });

    return () => {
      document.head.removeChild(link);
    };
  }, [textControls, buttonControls]);

  const headline = hero.title || "Artist Kashi Studio";
  const headlineWords = headline.split(" ");

  return (
    <section className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden select-none">
      <WovenCanvas />
      <div className="absolute inset-0 z-[1] bg-linear-to-b from-dark/72 via-dark/62 to-dark/88 lg:from-dark/80 lg:via-dark/74 lg:to-dark/92" />
      <div className="relative z-10 px-4 text-center">
        <h1
          className="text-5xl text-text-main md:text-7xl lg:text-8xl"
          style={{
            textShadow: "0 10px 35px rgba(10, 10, 10, 0.9)",
          }}
        >
          {headlineWords.map((word, i) => (
            <span key={word + i} className="inline-block">
              {word.split("").map((char, j) => (
                <motion.span
                  key={char + j}
                  custom={i * 5 + j}
                  initial={{ opacity: 0, y: 50 }}
                  animate={textControls}
                  style={{ display: "inline-block" }}
                >
                  {char}
                </motion.span>
              ))}
              {i < headlineWords.length - 1 && <span>&nbsp;</span>}
            </span>
          ))}
        </h1>
        <motion.p
          custom={headline.length}
          initial={{ opacity: 0, y: 30 }}
          animate={textControls}
          className="mx-auto mt-6 max-w-2xl text-base text-text-main/90 md:text-lg"
        >
          {hero.subtitle}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={buttonControls}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          {hero.primaryBtnText && (
            <Link href={hero.primaryBtnLink}>
              <button
                type="button"
                className="w-56 cursor-pointer rounded-full border-2 border-gold bg-gold px-8 py-3 font-semibold text-dark backdrop-blur-sm transition-all hover:opacity-90"
              >
                {hero.primaryBtnText}
              </button>
            </Link>
          )}
          {hero.ghostBtnText && (
            <Link href={hero.ghostBtnLink}>
              <button
                type="button"
                className="w-56 cursor-pointer rounded-full border-2 border-gold/50 bg-gold/10 px-8 py-3 font-semibold text-gold backdrop-blur-sm transition-all hover:bg-gold/20"
              >
                {hero.ghostBtnText}
              </button>
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
};

const WovenCanvas = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountNode.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2(0, 0);
    let isMobile = window.innerWidth < 768;
    let pointerActive = false;
    const timer = new THREE.Timer();
    timer.connect(document);
    const mouseWorld = new THREE.Vector3();
    const currentPos = new THREE.Vector3();
    const originalPos = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const returnForce = new THREE.Vector3();

    const particleCount = 32000;
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const geometry = new THREE.BufferGeometry();
    const paletteColors = [
      new THREE.Color("#f59e0b"),
      new THREE.Color("#ef4444"),
      new THREE.Color("#22c55e"),
      new THREE.Color("#3b82f6"),
      new THREE.Color("#a855f7"),
    ];
    const paintBlobCenters = [
      new THREE.Vector2(-1.05, 0.7),
      new THREE.Vector2(-0.2, 1.05),
      new THREE.Vector2(0.75, 0.85),
      new THREE.Vector2(1.2, 0.15),
      new THREE.Vector2(0.2, -0.95),
    ];

    for (let i = 0; i < particleCount; i++) {
      let x = 0;
      let y = 0;
      let z = 0;
      const isPaintBlob = Math.random() < 0.28;

      if (isPaintBlob) {
        const blobIndex = Math.floor(Math.random() * paintBlobCenters.length);
        const center = paintBlobCenters[blobIndex];
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * 0.34;
        x = center.x + Math.cos(angle) * radius * 1.15;
        y = center.y + Math.sin(angle) * radius;
        z = (Math.random() - 0.5) * 0.45 + 0.15;

        const blobColor = paletteColors[blobIndex];
        colors[i * 3] = blobColor.r;
        colors[i * 3 + 1] = blobColor.g;
        colors[i * 3 + 2] = blobColor.b;
      } else {
        // Build an artist palette silhouette (ellipse minus thumb hole).
        while (true) {
          const candidateX = (Math.random() * 2 - 1) * 2.25;
          const candidateY = (Math.random() * 2 - 1) * 1.8;
          const inPalette =
            (candidateX * candidateX) / (2.25 * 2.25) +
              (candidateY * candidateY) / (1.8 * 1.8) <=
            1;
          const dx = candidateX - 0.9;
          const dy = candidateY + 0.3;
          const inThumbHole = dx * dx + dy * dy <= 0.4 * 0.4;
          if (inPalette && !inThumbHole) {
            x = candidateX;
            y = candidateY;
            break;
          }
        }

        z = (Math.random() - 0.5) * 0.3;
        const neutralTone = new THREE.Color();
        neutralTone.setHSL(0.58, 0.08, 0.8 + (Math.random() - 0.5) * 0.12);
        colors[i * 3] = neutralTone.r;
        colors[i * 3 + 1] = neutralTone.g;
        colors[i * 3 + 2] = neutralTone.b;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.012 : 0.024,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: isMobile ? 0.86 : 0.36,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const handleMouseMove = (event: MouseEvent) => {
      pointerActive = true;
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      pointerActive = true;
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    };
    const resetPointer = () => {
      pointerActive = false;
      mouse.set(0, 0);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", resetPointer, { passive: true });
    window.addEventListener("touchcancel", resetPointer, { passive: true });

    let animationFrameId = 0;
    const animate = (timestamp?: number) => {
      animationFrameId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const elapsedTime = timer.getElapsed();

      mouseWorld.set(mouse.x * 3, mouse.y * 3, 0);
      const interactionRadius = isMobile ? 1.2 : 1.5;
      const interactionForce = isMobile ? 0.008 : 0.01;
      const settleForce = isMobile ? 0.0024 : 0.0012;
      const damping = isMobile ? 0.88 : 0.94;

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        currentPos.set(positions[ix], positions[iy], positions[iz]);
        originalPos.set(
          originalPositions[ix],
          originalPositions[iy],
          originalPositions[iz]
        );
        velocity.set(velocities[ix], velocities[iy], velocities[iz]);

        const dist = currentPos.distanceTo(mouseWorld);
        if (pointerActive && dist < interactionRadius) {
          const force = (interactionRadius - dist) * interactionForce;
          direction.subVectors(currentPos, mouseWorld).normalize();
          velocity.add(direction.multiplyScalar(force));
        }

        returnForce
          .subVectors(originalPos, currentPos)
          .multiplyScalar(settleForce);
        velocity.add(returnForce);
        velocity.multiplyScalar(damping);

        positions[ix] += velocity.x;
        positions[iy] += velocity.y;
        positions[iz] += velocity.z;

        velocities[ix] = velocity.x;
        velocities[iy] = velocity.y;
        velocities[iz] = velocity.z;
      }

      geometry.attributes.position.needsUpdate = true;
      points.rotation.x = Math.sin(elapsedTime * 0.2) * 0.06;
      points.rotation.y = elapsedTime * 0.16;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      isMobile = window.innerWidth < 768;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.size = isMobile ? 0.012 : 0.024;
      material.opacity = isMobile ? 0.56 : 0.36;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", resetPointer);
      window.removeEventListener("touchcancel", resetPointer);
      scene.remove(points);
      timer.disconnect();
      timer.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mountNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
};
