"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function makeTextTexture(text, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 620;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 440px Georgia, 'Times New Roman', serif";
  ctx.shadowColor = options.glow || "#e9b957";
  ctx.shadowBlur = 55;
  ctx.fillStyle = options.color || "#fff0bd";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 10);
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 10);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const ocean = ctx.createLinearGradient(0, 0, 0, 1024);
  ocean.addColorStop(0, "#123b67");
  ocean.addColorStop(.5, "#17639a");
  ocean.addColorStop(1, "#061b38");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 2048, 1024);

  // Stylised continent silhouettes painted onto a spherical texture.
  ctx.fillStyle = "#397d62";
  ctx.beginPath();
  ctx.moveTo(180,260); ctx.lineTo(300,180); ctx.lineTo(470,205); ctx.lineTo(540,300);
  ctx.lineTo(475,390); ctx.lineTo(430,500); ctx.lineTo(350,545); ctx.lineTo(290,430);
  ctx.lineTo(220,390); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(500,560); ctx.lineTo(610,600); ctx.lineTo(650,730); ctx.lineTo(600,880);
  ctx.lineTo(540,820); ctx.lineTo(510,690); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(900,220); ctx.lineTo(1080,170); ctx.lineTo(1190,250); ctx.lineTo(1150,370);
  ctx.lineTo(1040,420); ctx.lineTo(970,350); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1030,440); ctx.lineTo(1190,460); ctx.lineTo(1260,600); ctx.lineTo(1180,810);
  ctx.lineTo(1090,760); ctx.lineTo(1020,600); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1260,240); ctx.lineTo(1450,180); ctx.lineTo(1660,250); ctx.lineTo(1770,370);
  ctx.lineTo(1640,470); ctx.lineTo(1480,420); ctx.lineTo(1390,520); ctx.lineTo(1280,420);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1570,590); ctx.lineTo(1690,620); ctx.lineTo(1730,760); ctx.lineTo(1650,850);
  ctx.lineTo(1570,760); ctx.closePath(); ctx.fill();

  // Soft cloud bands.
  ctx.globalAlpha = .2;
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const w = 30 + Math.random() * 150;
    ctx.fillStyle = "#d7efff";
    ctx.beginPath();
    ctx.ellipse(x, y, w, 5 + Math.random() * 12, -.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function CinematicIntro() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer;
    let frame = 0;
    let disposed = false;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000106);
      scene.fog = new THREE.FogExp2(0x00030b, 0.00045);

      const camera = new THREE.PerspectiveCamera(52, 1, .1, 1200);
      camera.position.set(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      host.appendChild(renderer.domElement);

      const resize = () => {
        const width = host.clientWidth || window.innerWidth;
        const height = host.clientHeight || window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      resize();
      window.addEventListener("resize", resize);

      scene.add(new THREE.AmbientLight(0x779ac7, .65));
      const keyLight = new THREE.PointLight(0xffd28a, 950, 260);
      keyLight.position.set(-12, 15, 30);
      scene.add(keyLight);
      const blueLight = new THREE.PointLight(0x258dff, 1400, 300);
      blueLight.position.set(18, -18, -35);
      scene.add(blueLight);

      // Deep-space star volume.
      const starCount = 3200;
      const starPositions = new Float32Array(starCount * 3);
      const starSizes = new Float32Array(starCount);
      for (let i = 0; i < starCount; i++) {
        starPositions[i * 3] = (Math.random() - .5) * 260;
        starPositions[i * 3 + 1] = (Math.random() - .5) * 170;
        starPositions[i * 3 + 2] = -Math.random() * 720;
        starSizes[i] = .35 + Math.random() * 1.8;
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      starGeometry.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
      const starMaterial = new THREE.PointsMaterial({
        color: 0xd8eaff, size: .75, transparent: true, opacity: .82,
        sizeAttenuation: true, depthWrite: false,
      });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // Earth: a real sphere with a painted surface and luminous atmosphere.
      const earthGroup = new THREE.Group();
      earthGroup.position.set(0, -23, -48);
      scene.add(earthGroup);
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(22, 96, 64),
        new THREE.MeshPhongMaterial({
          map: makeEarthTexture(),
          shininess: 22,
          specular: new THREE.Color(0x5ca9df),
        })
      );
      earth.rotation.z = -.12;
      earthGroup.add(earth);

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(22.8, 96, 64),
        new THREE.MeshBasicMaterial({
          color: 0x3eafff, transparent: true, opacity: .2,
          side: THREE.BackSide, blending: THREE.AdditiveBlending,
        })
      );
      earthGroup.add(atmosphere);

      const cloudGlow = new THREE.PointLight(0x4caeff, 1800, 100);
      cloudGlow.position.set(0, 8, 16);
      earthGroup.add(cloudGlow);

      // A² is a textured 3D plane in the scene, not a DOM element dropping over a background.
      const logoTexture = makeTextTexture("A²");
      const logoMaterial = new THREE.MeshBasicMaterial({
        map: logoTexture, transparent: true, toneMapped: false,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(13, 4.5), logoMaterial);
      logo.position.set(0, 1.5, -180);
      logo.scale.setScalar(.035);
      scene.add(logo);

      const logoGlow = new THREE.PointLight(0xffc76a, 0, 90);
      logoGlow.position.set(0, 1.5, -12);
      scene.add(logoGlow);

      // Impact rings expand across the scene when the mark reaches the planet.
      const rings = [];
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(3 + i * 1.5, .055, 12, 128),
          new THREE.MeshBasicMaterial({
            color: i === 1 ? 0x65caff : 0xffd58a,
            transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
          })
        );
        ring.position.set(0, -8, -29);
        ring.rotation.x = Math.PI / 2.35;
        scene.add(ring);
        rings.push(ring);
      }

      const flash = new THREE.Mesh(
        new THREE.PlaneGeometry(240, 150),
        new THREE.MeshBasicMaterial({
          color: 0xffe6b2, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      flash.position.set(0, -7, -5);
      scene.add(flash);

      const titleCanvas = document.createElement("canvas");
      titleCanvas.width = 1800;
      titleCanvas.height = 420;
      const titleCtx = titleCanvas.getContext("2d");
      titleCtx.textAlign = "center";
      titleCtx.textBaseline = "middle";
      titleCtx.font = "700 112px Georgia, 'Times New Roman', serif";
      titleCtx.fillStyle = "#f5dfad";
      titleCtx.shadowColor = "#d7a94f";
      titleCtx.shadowBlur = 28;
      titleCtx.fillText("A²  PRESENTS", 900, 120);
      titleCtx.font = "900 190px Georgia, 'Times New Roman', serif";
      titleCtx.fillStyle = "#fff3d4";
      titleCtx.shadowBlur = 38;
      titleCtx.fillText("AYneetPYQ+", 900, 315);
      const titleTexture = new THREE.CanvasTexture(titleCanvas);
      titleTexture.colorSpace = THREE.SRGBColorSpace;
      const title = new THREE.Mesh(
        new THREE.PlaneGeometry(9.2, 2.15),
        new THREE.MeshBasicMaterial({
          map: titleTexture, transparent: true, opacity: 0,
          toneMapped: false, depthWrite: false,
        })
      );
      title.position.set(0, 1.1, -8);
      scene.add(title);

      const start = performance.now();
      const duration = reduced ? 1800 : 12400;
      const ease = (x) => x * x * (3 - 2 * x);
      const smooth = (a, b, x) => ease(THREE.MathUtils.clamp((x - a) / (b - a), 0, 1));

      const animate = (now) => {
        if (disposed) return;
        const t = Math.min((now - start) / 1000, duration / 1000);
        const u = t / (duration / 1000);

        if (reduced) {
          camera.position.set(0, 0, 48);
          title.material.opacity = 1;
          logo.visible = false;
          earthGroup.visible = true;
        } else {
          // Keep the camera framed like a cinema shot: the object, planet and title stay in view.
          camera.position.set(0, 0, 0);
          camera.rotation.set(0, 0, 0);

          // First: almost-empty infinity. Then the star field rushes past the lens.
          const speed = smooth(1.8, 5.1, t);
          const positions = starGeometry.attributes.position.array;
          for (let i = 0; i < starCount; i++) {
            const idx = i * 3 + 2;
            positions[idx] += speed * (2.8 + starSizes[i] * 3.4);
            if (positions[idx] > 8) {
              positions[idx] = -520 - Math.random() * 260;
              positions[i * 3] = (Math.random() - .5) * 260;
              positions[i * 3 + 1] = (Math.random() - .5) * 170;
            }
          }
          starGeometry.attributes.position.needsUpdate = true;
          stars.rotation.z = t * .012;

          // A² is visible as a tiny distant mark, then grows as it rockets toward camera.
          const approach = smooth(1.7, 5.25, t);
          const dive = smooth(5.0, 5.8, t);
          const scale = .035 + approach * .48;
          logo.scale.setScalar(scale);
          logo.position.z = -180 + approach * 166 - dive * 18;
          logo.position.y = 1.5 - dive * 9.5;
          logo.position.x = Math.sin(t * 1.9) * approach * .45;
          logo.rotation.z = Math.sin(t * 2.8) * approach * .045;
          logoMaterial.opacity = t < 1.7 ? 0 : (t < 5.75 ? 1 : 1 - smooth(5.75, 6.1, t));
          logoGlow.position.copy(logo.position);
          logoGlow.intensity = approach * (1 - dive) * 1250;

          // Earth rises into a clear, unmistakable view before impact.
          const earthReveal = smooth(3.5, 5.0, t);
          earthGroup.position.y = -23 + earthReveal * 1.5;
          earthGroup.rotation.y = t * .025;

          // The mark dives into the upper horizon; rings and an expanding fireball sell the hit.
          const impact = smooth(5.25, 5.72, t);
          const hit = impact * (1 - smooth(6.0, 6.8, t));
          rings.forEach((ring, i) => {
            const ringProgress = THREE.MathUtils.clamp((t - 5.48 - i * .12) / 1.35, 0, 1);
            ring.scale.setScalar(.18 + ringProgress * (7 + i * 2));
            ring.material.opacity = hit * (1 - ringProgress) * .98;
          });
          flash.material.opacity = Math.max(0, 1 - Math.abs(t - 5.72) * 2.1) * .95;

          const reveal = smooth(7.0, 8.35, t);
          title.material.opacity = reveal;
          title.position.y = 1.1 + (1 - reveal) * -1.0;
          title.scale.setScalar(.9 + reveal * .1);

          // Hold the title long enough to read, then reveal the homepage.
          if (t > 10.6) host.style.opacity = String(1 - smooth(10.6, 12.4, t));
        }

        renderer.render(scene, camera);
        if (t < duration / 1000) frame = requestAnimationFrame(animate);
        else host.style.display = "none";
      };

      frame = requestAnimationFrame(animate);

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          }
        });
        renderer.dispose();
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      };
    } catch (error) {
      console.error("3D intro could not start:", error);
      host.style.display = "none";
      return undefined;
    }
  }, []);

  return (
    <div
      ref={hostRef}
      aria-label="A squared launches through deep space and arrives at Earth, presenting AYneetPYQ plus"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        width: "100%",
        height: "100vh",
        height: "100dvh",
        overflow: "hidden",
        background: "#000106",
        opacity: 1,
        transition: "opacity 1.4s ease",
        pointerEvents: "none",
      }}
    />
  );
}
