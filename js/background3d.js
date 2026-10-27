/* ── Cinematic Three.js background: constellation field + focal wireframe ── */
import * as THREE from "three";

const canvas = document.getElementById("bgCanvas");
if (canvas && window.WebGLRenderingContext) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 14;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // ── Constellation particle field ──────────────────────────────────
  const COUNT = 170;
  const pts = [];
  for (let i = 0; i < COUNT; i++) {
    const r = 7 + Math.random() * 9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pts.push(new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * 0.6,
      r * Math.cos(phi)
    ));
  }

  const particleGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const colors = new Float32Array(COUNT * 3);
  const teal = new THREE.Color(0x36d6c6);
  const violet = new THREE.Color(0x8b7bf7);
  for (let i = 0; i < COUNT; i++) {
    const c = teal.clone().lerp(violet, Math.random());
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.09, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);

  // connect nearby particles once (field rotates as a rigid group, so
  // connections computed at init stay geometrically valid every frame)
  const linePositions = [];
  const MAX_DIST = 3.6;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (pts[i].distanceTo(pts[j]) < MAX_DIST) {
        linePositions.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x36d6c6, transparent: true, opacity: 0.08 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);

  const field = new THREE.Group();
  field.add(particles, lines);
  field.rotation.x = 0.2;
  scene.add(field);

  // ── Focal wireframe object (sits roughly under the hero's empty side) ──
  const focal = new THREE.Group();
  const icoGeo = new THREE.IcosahedronGeometry(2.1, 1);
  const icoWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(icoGeo),
    new THREE.LineBasicMaterial({ color: 0x36d6c6, transparent: true, opacity: 0.55 })
  );
  const icoCore = new THREE.Mesh(
    icoGeo,
    new THREE.MeshBasicMaterial({ color: 0x8b7bf7, transparent: true, opacity: 0.05 })
  );
  focal.add(icoWire, icoCore);
  focal.position.set(4.6, 1.2, -2);
  scene.add(focal);

  // subtle ambient + point light so the core catches a glow (MeshBasicMaterial
  // ignores lights, but kept for any future lit material additions)
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  // ── Mouse parallax ──────────────────────────────────────────────────
  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // The focal wireframe is positioned at a fixed point in the viewport (it's
  // part of a fixed-background canvas), so without this it would sit on top
  // of whatever section happens to be scrolled under it. Fade it out once
  // the hero is scrolled past so it never competes with body text.
  const heroEl = document.getElementById("top");
  function focalOpacityForScroll() {
    if (!heroEl) return 1;
    const heroBottom = heroEl.getBoundingClientRect().bottom;
    const fadeRange = 260; // px of scroll over which it fades out
    return Math.max(0, Math.min(1, heroBottom / fadeRange));
  }

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    field.rotation.y = t * 0.025;
    focal.rotation.y = t * 0.12;
    focal.rotation.x = Math.sin(t * 0.3) * 0.15;

    const op = focalOpacityForScroll();
    icoWire.material.opacity = 0.55 * op;
    icoCore.material.opacity = 0.05 * op;

    camera.position.x += (mouseX * 1.2 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 0.8 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
}
