import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const C = { cream: 0xfff7ed, mint: 0xbfe3d0, pink: 0xf4c8d4, yellow: 0xf6e3a3, purple: 0xd9ccf1, blue: 0xc9e3f2, ink: 0x3f4a45, wood: 0xcaa181, bark: 0x997d69 };
const GROUND = 0.24;

// Every visible asset is original procedural geometry; no downloaded models.
export function createCampScene(container, callbacks = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf9f2e9);
  scene.fog = new THREE.Fog(0xf9f2e9, 30, 78);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', '可以旋转和布置的三维露营场景');
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 120);
  camera.position.set(14, 13, 19);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 10;
  controls.maxDistance = 36;
  controls.minPolarAngle = 0.24;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.maxTargetRadius = 3;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

  const materials = new Set();
  const geometries = new Set();
  const m = (color, extra = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, ...extra });
    materials.add(material);
    return material;
  };
  const mat = { cream: m(C.cream), mint: m(C.mint), pink: m(C.pink), yellow: m(C.yellow), purple: m(C.purple), blue: m(C.blue), wood: m(C.wood), bark: m(C.bark), dark: m(C.ink), sand: m(0xe4cdb2), earth: m(0xd9bda3), water: m(0xa6cfdf, { roughness: 0.32, metalness: 0.05 }), leaves: m(0x9dc9ad), leavesLight: m(0xd7e9bd), stone: m(0xc7c4c3), coral: m(0xe9adad) };
  const own = geometry => { geometries.add(geometry); return geometry; };
  function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const obj = new THREE.Mesh(own(geometry), material);
    obj.position.set(x, y, z);
    obj.castShadow = true;
    obj.receiveShadow = true;
    parent.add(obj);
    return obj;
  }
  const box = (parent, material, w, h, d, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
  const ball = (parent, material, r, x, y, z, detail = 0) => mesh(new THREE.IcosahedronGeometry(r, detail), material, parent, x, y, z);
  function beam(parent, material, a, b, radius = 0.035, sides = 7) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const obj = mesh(new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), sides), material, parent);
    obj.position.copy(from).add(to).multiplyScalar(0.5);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
    return obj;
  }
  function panel(parent, material, vertices) {
    material.side = THREE.DoubleSide;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return mesh(geometry, material, parent);
  }
  function diskShape(rx, rz, wobble = 0.025, count = 72) {
    const shape = new THREE.Shape();
    for (let i = 0; i <= count; i++) {
      const a = i / count * Math.PI * 2;
      const f = 1 + wobble * Math.sin(a * 5 + 1) + wobble * 0.5 * Math.cos(a * 7);
      const x = Math.cos(a) * rx * f, z = Math.sin(a) * rz * f;
      if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
    }
    return shape;
  }
  function shapedGround(shape, material, depth, height, parent) {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.09, bevelThickness: 0.07, bevelSegments: 2, steps: 1, curveSegments: 48 });
    const obj = mesh(geometry, material, parent);
    obj.rotation.x = -Math.PI / 2;
    obj.position.y = height;
    return obj;
  }
  const world = new THREE.Group();
  scene.add(world);
  const floor = mesh(new THREE.PlaneGeometry(200, 200), m(0xeee4db), world, 0, -0.95, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  shapedGround(diskShape(8.6, 6.45, 0.022), mat.earth, 0.68, -0.66, world);
  shapedGround(diskShape(8.4, 6.25, 0.025), mat.sand, 0.1, -0.015, world);
  shapedGround(diskShape(8.0, 5.98, 0.027), mat.mint, 0.08, 0.09, world);

  // The lake remains entirely outside the buildable x <= 4 area.
  const lakeGroup = new THREE.Group();
  lakeGroup.position.set(5.93, 0.233, 0.8);
  world.add(lakeGroup);
  const lakeShape = diskShape(1.42, 3.12, 0.035, 60);
  const shore = mesh(new THREE.ShapeGeometry(diskShape(1.56, 3.28, 0.03)), mat.sand, lakeGroup);
  shore.rotation.x = -Math.PI / 2;
  const lake = mesh(new THREE.ShapeGeometry(lakeShape, 56), mat.water, lakeGroup, 0, 0.015, 0);
  lake.rotation.x = -Math.PI / 2;
  lake.castShadow = false;
  const rippleMaterial = m(0xe8f4f6, { transparent: true, opacity: 0.45, depthWrite: false });
  const ripples = [];
  for (let i = 0; i < 7; i++) {
    const ring = mesh(new THREE.TorusGeometry(0.17 + i % 3 * 0.08, 0.012, 4, 36, Math.PI * 1.4), rippleMaterial, lakeGroup, -0.8 + (i % 3) * 0.66, 0.033, -2.1 + i * 0.66);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.set(1.6, 0.64, 1);
    ring.castShadow = false;
    ripples.push(ring);
  }
  // A small landing dock adds a recognizable lakeside silhouette.
  for (let i = 0; i < 7; i++) box(world, mat.wood, 1.42, 0.09, 0.22, 4.82, 0.36, 1.8 + i * 0.24);
  for (const z of [1.78, 3.28]) for (const x of [4.23, 5.4]) beam(world, mat.bark, [x, 0.02, z], [x, 0.71, z], 0.055);

  let seed = 46819;
  function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  const movingTrees = [];
  function tree(x, z, scale, kind = 0) {
    const group = new THREE.Group();
    group.position.set(x, GROUND, z);
    group.scale.setScalar(scale);
    world.add(group);
    beam(group, mat.bark, [0, 0, 0], [0, 2, 0], 0.12, 7);
    const crown = new THREE.Group();
    crown.position.y = 1.25;
    group.add(crown);
    if (kind === 0) {
      for (let level = 0; level < 3; level++) {
        mesh(new THREE.ConeGeometry(1.0 - level * 0.23, 1.48 - level * 0.18, 7), level === 1 ? mat.leavesLight : mat.leaves, crown, 0, level * 0.63, 0);
      }
    } else {
      const a = ball(crown, mat.leaves, 1.03, 0, 0.7, 0, 1);
      a.scale.set(1.05, 1.2, 0.9);
      ball(crown, mat.leavesLight, 0.67, -0.57, 0.56, 0.2, 1);
      ball(crown, mat.mint, 0.68, 0.5, 0.38, -0.1, 1);
    }
    movingTrees.push({ group: crown, phase: random() * 6 });
  }
  [[-6.5, -2.5, 1.17, 0], [-5.7, -4.1, 1.3, 1], [-3.7, -4.7, 1.25, 0], [-1.9, -5, 1.1, 0], [0.1, -5, 0.9, 1], [2.1, -4.8, 1.15, 0], [3.8, -4.5, 1.0, 1], [5.3, -3.8, 1.1, 0], [-7.1, 0, 0.85, 1], [-6.7, 1.8, 1.1, 0], [-5.8, 3.7, 0.8, 1], [0.4, 5.3, 0.57, 0], [2.8, 4.9, 0.68, 1], [6.9, -1.8, 0.72, 0]].forEach(t => tree(...t));
  // Soft far mountains, kept behind the camp instead of obstructing it.
  for (let i = 0; i < 5; i++) {
    const mountain = mesh(new THREE.ConeGeometry(1.5 + random(), 2.1 + random() * 1.2, 5), i % 2 ? mat.purple : mat.blue, world, -3.4 + i * 1.65, 0.55, -5.15);
    mountain.rotation.y = random() * Math.PI;
    mountain.scale.z = 0.65;
  }
  function stone(x, z, size, material = mat.stone) {
    const rock = ball(world, material, size, x, GROUND + size * 0.28, z, 0);
    rock.scale.set(1.3, 0.65, 0.84);
    rock.rotation.set(random() * 0.5, random() * 3, random() * 0.3);
  }
  for (let i = 0; i < 29; i++) {
    const a = random() * Math.PI * 2;
    stone(Math.cos(a) * (7.1 + random() * 0.35), Math.sin(a) * (5.2 + random() * 0.25), 0.16 + random() * 0.24, i % 5 === 0 ? mat.purple : mat.stone);
  }
  for (let i = 0; i < 13; i++) {
    const a = i / 12 * Math.PI + Math.PI * 0.6;
    stone(5.93 + Math.cos(a) * 1.51, 0.8 + Math.sin(a) * 3.22, 0.11 + random() * 0.11);
  }
  // Flowers and grass are restricted to the perimeter, preserving an open play area.
  for (let i = 0; i < 78; i++) {
    const a = random() * Math.PI * 2;
    const x = Math.cos(a) * (6.2 + random() * 1.25), z = Math.sin(a) * (4.6 + random() * 0.65);
    if (x > 4.35 && z > -2.8 && z < 4.2) continue;
    const h = 0.13 + random() * 0.18;
    if (i % 3 === 0) {
      beam(world, mat.leaves, [x, GROUND, z], [x, GROUND + h, z], 0.012, 4);
      ball(world, i % 2 ? mat.yellow : mat.pink, 0.075, x, GROUND + h, z);
      ball(world, mat.cream, 0.032, x, GROUND + h + 0.035, z + 0.03);
    } else {
      const tuft = mesh(new THREE.ConeGeometry(0.085, h, 3), i % 2 ? mat.leaves : mat.leavesLight, world, x, GROUND + h / 2, z);
      tuft.rotation.z = (random() - 0.5) * 0.45;
    }
  }
  // Decorative stepping stones stay along the front edge.
  for (let i = 0; i < 7; i++) {
    const step = mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.065, 7), mat.cream, world, -4.2 + i * 0.77, GROUND + 0.018, 4.1 + Math.sin(i * 0.9) * 0.23);
    step.rotation.y = i * 0.7;
  }

  const hemisphere = new THREE.HemisphereLight(0xfff6e6, 0x9cae9c, 2.5);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffefdb, 3.4);
  sun.position.set(-7, 15, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 45 });
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0001;
  sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd3e3f9, 1.0);
  fill.position.set(7, 8, -10);
  scene.add(fill);

  const campObjects = new THREE.Group();
  scene.add(campObjects);
  const itemGroups = new Map();
  const fireGroups = new Set();
  const lanternGroups = new Set();
  const glowMat = m(0xffe9a1, { emissive: 0xffd16c, emissiveIntensity: 1.4 });
  const fireMat = m(0xffc574, { emissive: 0xff9d44, emissiveIntensity: 1.7 });
  const fireCoreMat = m(0xffefac, { emissive: 0xffd56c, emissiveIntensity: 2 });
  function makeTent(group) {
    const roofMat = mat.pink;
    panel(group, roofMat, [-1.18, 0.05, -1.35, 0, 1.82, -1.35, 0, 1.82, 1.35, -1.18, 0.05, -1.35, 0, 1.82, 1.35, -1.18, 0.05, 1.35]);
    panel(group, mat.coral, [1.18, 0.05, 1.35, 0, 1.82, 1.35, 0, 1.82, -1.35, 1.18, 0.05, 1.35, 0, 1.82, -1.35, 1.18, 0.05, -1.35]);
    panel(group, roofMat, [-1.18, 0.05, -1.35, 1.18, 0.05, -1.35, 0, 1.82, -1.35]);
    // A cream triangular entry and smaller dark recess make the door legible.
    panel(group, mat.cream, [-1.18, 0.05, 1.355, 0, 1.82, 1.355, 1.18, 0.05, 1.355]);
    panel(group, mat.dark, [-0.62, 0.07, 1.365, 0, 1.31, 1.365, 0.62, 0.07, 1.365]);
    panel(group, mat.pink, [-0.62, 0.07, 1.376, 0, 1.31, 1.376, -0.15, 0.09, 1.38]);
    box(group, mat.cream, 2.45, 0.08, 2.82, 0, 0.04, 0);
    for (const z of [-1.36, 1.36]) {
      beam(group, mat.cream, [-1.2, 0.07, z], [0, 1.84, z], 0.035);
      beam(group, mat.cream, [1.2, 0.07, z], [0, 1.84, z], 0.035);
      for (const side of [-1, 1]) {
        beam(group, mat.cream, [side * 0.88, 0.5, z], [side * 1.65, 0.03, z * 1.23], 0.012, 4);
        beam(group, mat.wood, [side * 1.65, 0.015, z * 1.23], [side * 1.65, 0.16, z * 1.23], 0.025);
      }
    }
    beam(group, mat.cream, [0, 1.85, -1.4], [0, 1.85, 1.4], 0.03);
    const bed = box(group, mat.purple, 0.73, 0.1, 1.52, 0.23, 0.12, 0.15);
    bed.rotation.y = 0.04;
    box(group, mat.yellow, 0.59, 0.1, 0.3, 0.23, 0.18, -0.43);
  }
  function makeCanopy(group) {
    const creamCloth = mat.cream;
    const points = [[-1.6, 2.25, -1.5], [1.6, 2.25, -1.5], [1.6, 2.25, 1.5], [-1.6, 2.25, 1.5]];
    for (let i = 0; i < 4; i++) {
      const a = points[i], b = points[(i + 1) % 4];
      panel(group, creamCloth, [...a, 0, 2.64, 0, ...b]);
      beam(group, mat.wood, [a[0], 0, a[2]], a, 0.038);
      beam(group, mat.cream, a, [a[0] * 1.22, 0.02, a[2] * 1.22], 0.012, 4);
      beam(group, mat.wood, [a[0] * 1.22, 0, a[2] * 1.22], [a[0] * 1.22, 0.14, a[2] * 1.22], 0.023);
      beam(group, mat.cream, a, b, 0.028);
    }
    for (let i = 0; i < 7; i++) {
      const x = -1.32 + i * 0.44;
      const y = 2.15 - Math.sin(i / 6 * Math.PI) * 0.18;
      ball(group, glowMat, 0.045, x, y, 1.5);
      if (i < 6) beam(group, mat.bark, [x, y + 0.045, 1.5], [x + 0.44, 2.195 - Math.sin((i + 1) / 6 * Math.PI) * 0.18, 1.5], 0.008, 4);
    }
  }
  function makeChair(group) {
    box(group, mat.cream, 0.9, 0.11, 0.86, 0, 0.67, 0);
    const back = box(group, mat.pink, 0.91, 0.73, 0.1, 0, 1.03, -0.39);
    back.rotation.x = -0.16;
    for (const x of [-0.41, 0.41]) {
      beam(group, mat.wood, [x, 0.03, -0.51], [x, 0.75, 0.43], 0.045);
      beam(group, mat.wood, [x, 0.03, 0.51], [x, 1.4, -0.5], 0.045);
      beam(group, mat.wood, [x, 0.94, -0.38], [x, 0.94, 0.44], 0.045);
    }
    beam(group, mat.wood, [-0.43, 0.1, 0.48], [0.43, 0.1, 0.48], 0.03);
  }
  function makeTable(group) {
    for (let i = 0; i < 5; i++) box(group, i % 2 ? mat.cream : mat.wood, 1.65, 0.09, 0.22, 0, 0.9, -0.48 + i * 0.24);
    for (const x of [-0.65, 0.65]) for (const z of [-0.4, 0.4]) beam(group, mat.wood, [x * 1.11, 0.02, z * 1.11], [x, 0.9, z], 0.045);
    const cup = mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.18, 12), mat.pink, group, -0.42, 1.03, 0.12);
    mesh(new THREE.TorusGeometry(0.06, 0.017, 5, 12), mat.pink, group, -0.3, 1.03, 0.12).rotation.y = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.205, 0.2, 0.025, 18), mat.cream, group, 0.25, 0.97, -0.05);
    box(group, mat.yellow, 0.23, 0.07, 0.19, 0.25, 1.015, -0.05);
    cup.castShadow = true;
  }
  function makeLantern(group) {
    mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.1, 12), mat.wood, group, 0, 0.08, 0);
    mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.1, 12), mat.yellow, group, 0, 0.2, 0);
    const glass = mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.42, 12), glowMat, group, 0, 0.46, 0);
    mesh(new THREE.ConeGeometry(0.28, 0.16, 12), mat.yellow, group, 0, 0.75, 0);
    for (const x of [-0.16, 0.16]) for (const z of [-0.11, 0.11]) beam(group, mat.bark, [x, 0.23, z], [x, 0.73, z], 0.018);
    const handle = mesh(new THREE.TorusGeometry(0.16, 0.018, 5, 16, Math.PI), mat.bark, group, 0, 0.82, 0);
    handle.rotation.z = 0;
    const light = new THREE.PointLight(0xffd38a, 0, 5, 2);
    light.position.y = 0.52;
    group.add(light);
    group.userData.lamp = { light, glass };
    lanternGroups.add(group);
  }
  function makeCampfire(group) {
    mesh(new THREE.CylinderGeometry(0.62, 0.56, 0.16, 12), mat.dark, group, 0, 0.12, 0);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      const rock = ball(group, i % 3 ? mat.stone : mat.purple, 0.16, Math.cos(a) * 0.63, 0.2, Math.sin(a) * 0.63);
      rock.scale.y = 0.75;
    }
    for (let i = 0; i < 4; i++) {
      const angle = i / 4 * Math.PI;
      beam(group, mat.bark, [-Math.cos(angle) * 0.43, 0.25, -Math.sin(angle) * 0.43], [Math.cos(angle) * 0.43, 0.31, Math.sin(angle) * 0.43], 0.09);
    }
    const flames = new THREE.Group();
    flames.position.y = 0.31;
    group.add(flames);
    for (let i = 0; i < 5; i++) {
      const flame = mesh(new THREE.ConeGeometry(i === 0 ? 0.28 : 0.16, i === 0 ? 0.86 : 0.6, 5), i % 2 ? fireCoreMat : fireMat, flames, Math.sin(i * 2.4) * 0.18, i === 0 ? 0.38 : 0.24, Math.cos(i * 2.4) * 0.18);
      flame.rotation.z = Math.sin(i) * 0.17;
      flame.castShadow = false;
    }
    const light = new THREE.PointLight(0xffba67, 5, 7, 2);
    light.position.y = 0.8;
    group.add(light);
    group.userData.fire = { flames, light };
    fireGroups.add(group);
  }
  const makers = { tent: makeTent, canopy: makeCanopy, chair: makeChair, table: makeTable, lantern: makeLantern, campfire: makeCampfire };
  function makeItem(item, preview = false) {
    const group = new THREE.Group();
    const builder = makers[item.type];
    if (!builder) return group;
    builder(group);
    group.userData.id = item.id;
    group.userData.type = item.type;
    group.position.set(Number(item.x) || 0, GROUND, Number(item.z) || 0);
    group.rotation.y = Number(item.rotation) || 0;
    if (preview) {
      fireGroups.delete(group);
      lanternGroups.delete(group);
      group.traverse(obj => {
        if (obj.isLight) obj.visible = false;
        if (obj.isMesh) {
          const material = obj.material.clone();
          materials.add(material);
          material.transparent = true;
          material.opacity = 0.58;
          material.depthWrite = false;
          obj.material = material;
          obj.castShadow = false;
        }
      });
    }
    return group;
  }
  function discard(group, disposeMaterials = false) {
    fireGroups.delete(group);
    lanternGroups.delete(group);
    group.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        geometries.delete(obj.geometry);
        if (disposeMaterials) {
          obj.material.dispose();
          materials.delete(obj.material);
        }
      }
    });
    group.removeFromParent();
  }
  let preview = null;
  let mode = 'observe';
  let env = { hour: 16, weather: 'clear', fireLit: true, quality: 'high', reducedMotion: false };

  const rainGeometry = own(new THREE.BufferGeometry());
  const rainCount = 560;
  const rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const j = i * 6, x = (random() - 0.5) * 19, y = random() * 13 + 0.4, z = (random() - 0.5) * 15;
    rainPositions.set([x, y, z, x - 0.055, y + 0.24, z], j);
  }
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xc9dcea, transparent: true, opacity: 0.45 });
  materials.add(rainMat);
  const rain = new THREE.LineSegments(rainGeometry, rainMat);
  rain.visible = false;
  rain.frustumCulled = false;
  scene.add(rain);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND);
  const hitPoint = new THREE.Vector3();
  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }
  function groundHit() {
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return null;
    if (hitPoint.x < -5 || hitPoint.x > 4 || hitPoint.z < -3.8 || hitPoint.z > 3.8) return null;
    return { x: hitPoint.x, z: hitPoint.z };
  }
  let down = null;
  function onDown(e) {
    if (!e.isPrimary) { down = null; return; }
    if (e.button === 0) down = { x: e.clientX, y: e.clientY };
  }
  function onUp(e) {
    if (!down || !e.isPrimary || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 7) return;
    updatePointer(e);
    if (mode !== 'place') {
      const hits = raycaster.intersectObjects(campObjects.children, true);
      if (hits.length) {
        let picked = hits[0].object;
        while (picked.parent && !picked.userData.id) picked = picked.parent;
        if (picked.userData.id) { callbacks.onSelect?.(picked.userData.id); return; }
      }
    }
    const point = groundHit();
    if (point) callbacks.onGround?.(point);
  }
  function onMove(e) {
    if (mode !== 'place') return;
    updatePointer(e);
    const point = groundHit();
    if (point) callbacks.onHoverGround?.(point);
  }
  const canvas = renderer.domElement;
  const cancelDown = () => { down = null; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointercancel', cancelDown);
  const contextMenu = event => event.preventDefault();
  canvas.addEventListener('contextmenu', contextMenu);

  function applyEnvironment() {
    const h = ((Number(env.hour) % 24) + 24) % 24;
    const day = THREE.MathUtils.smoothstep(Math.sin((h - 6) / 24 * Math.PI * 2), -0.18, 0.35);
    const wet = ['rain', 'rainy', 'storm'].includes(env.weather);
    const cloudy = wet || ['cloudy', 'overcast'].includes(env.weather);
    const dusk = day > 0.15 && day < 0.95;
    const background = new THREE.Color(day < 0.18 ? 0x7984a8 : cloudy ? 0xd4dcdf : dusk ? 0xe9cfd6 : 0xf9f2e9);
    scene.background.copy(background);
    scene.fog.color.copy(background);
    scene.fog.near = wet ? 23 : 30;
    scene.fog.far = wet ? 65 : 78;
    floor.material.color.copy(background);
    hemisphere.intensity = (0.9 + day * 1.45) * (cloudy ? 0.88 : 1);
    hemisphere.color.set(day < 0.18 ? 0xd2dcff : 0xfff6e6);
    sun.intensity = (0.32 + day * 2.7) * (cloudy ? 0.3 : 1);
    sun.color.set(dusk ? 0xffd2b2 : 0xffefdb);
    sun.position.set(-7 + (h - 12) * 0.4, 6 + day * 9, 8);
    fill.intensity = 0.45 + day * 0.55;
    renderer.toneMappingExposure = day < 0.2 ? 1.29 : 1.12;
    mat.mint.roughness = wet ? 0.65 : 0.88;
    mat.water.color.set(wet ? 0x96b9cf : 0xa6cfdf);
    rain.visible = wet;
    for (const group of lanternGroups) group.userData.lamp.light.intensity = 0.55 + (1 - day) * 3.0;
    for (const group of fireGroups) {
      group.userData.fire.flames.visible = Boolean(env.fireLit);
      group.userData.fire.light.visible = Boolean(env.fireLit);
    }
    const low = env.quality === 'low';
    const maxPixelRatio = low ? 1 : env.quality === 'medium' ? 1.4 : 1.8;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    if (renderer.getPixelRatio() !== pixelRatio) { renderer.setPixelRatio(pixelRatio); resize(); }
    renderer.shadowMap.enabled = !low;
    rain.geometry.setDrawRange(0, low ? 300 : rainCount * 2);
  }
  function resize() {
    const width = Math.max(container.clientWidth, 1), height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    // Preserve the island's horizontal framing on portrait screens instead of
    // cropping it with the desktop vertical field of view.
    camera.fov = camera.aspect < 1.1
      ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(39) / 2) * 1.1 / camera.aspect))
      : 39;
    if (camera.aspect < 1.1) camera.setViewOffset(width, height, 0, -height * 0.10, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  applyEnvironment();
  const clock = new THREE.Clock();
  let elapsed = 0, frame = 0, destroyed = false;
  function animate() {
    if (destroyed) return;
    frame = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    controls.update();
    if (!env.reducedMotion) {
      for (const tree of movingTrees) tree.group.rotation.z = Math.sin(elapsed * 0.63 + tree.phase) * 0.015;
      ripples.forEach((r, i) => { r.scale.x = 1.6 + Math.sin(elapsed * 0.7 + i) * 0.12; });
      for (const group of fireGroups) {
        const fire = group.userData.fire;
        fire.flames.scale.y = 0.94 + Math.sin(elapsed * 7.3) * 0.06 + Math.sin(elapsed * 11.5) * 0.035;
        fire.flames.rotation.y = Math.sin(elapsed * 0.9) * 0.14;
        fire.light.intensity = 4.5 + Math.sin(elapsed * 6.7) * 0.3;
      }
      if (rain.visible) {
        for (let i = 0; i < rainCount; i++) {
          const j = i * 6;
          rainPositions[j + 1] -= dt * 8;
          if (rainPositions[j + 1] < 0.3) rainPositions[j + 1] = 13;
          rainPositions[j + 4] = rainPositions[j + 1] + 0.24;
        }
        rainGeometry.attributes.position.needsUpdate = true;
      }
    }
    renderer.render(scene, camera);
  }
  animate();

  return {
    sync(items = []) {
      const keep = new Set();
      for (const item of items) {
        if (!makers[item.type] || !item.id) continue;
        keep.add(item.id);
        let group = itemGroups.get(item.id);
        if (group && group.userData.type !== item.type) { discard(group); itemGroups.delete(item.id); group = null; }
        if (!group) { group = makeItem(item); itemGroups.set(item.id, group); campObjects.add(group); }
        group.position.set(Number(item.x) || 0, GROUND, Number(item.z) || 0);
        group.rotation.y = Number(item.rotation) || 0;
      }
      for (const [id, group] of itemGroups) if (!keep.has(id)) { discard(group); itemGroups.delete(id); }
      applyEnvironment();
    },
    setPreview(itemOrNull, valid = true) {
      if (!itemOrNull) { if (preview) discard(preview, true); preview = null; return; }
      if (!preview || preview.userData.type !== itemOrNull.type) {
        if (preview) discard(preview, true);
        preview = makeItem(itemOrNull, true);
        scene.add(preview);
      }
      preview.position.set(Number(itemOrNull.x) || 0, GROUND + 0.035, Number(itemOrNull.z) || 0);
      preview.rotation.y = Number(itemOrNull.rotation) || 0;
      preview.traverse(obj => { if (obj.isMesh) { obj.material.opacity = valid ? 0.58 : 0.4; obj.material.emissive.set(valid ? 0x234b30 : 0xaa1728); obj.material.emissiveIntensity = valid ? 0.14 : 0.5; } });
    },
    setEnvironment(next) { env = { ...env, ...next }; applyEnvironment(); },
    setMode(next) {
      mode = next;
      controls.mouseButtons.LEFT = next === 'place' ? null : THREE.MOUSE.ROTATE;
      controls.touches.ONE = next === 'place' ? null : THREE.TOUCH.ROTATE;
      canvas.style.cursor = next === 'place' ? 'crosshair' : 'grab';
    },
    resetCamera() { camera.position.set(14, 13, 19); controls.target.set(0, 0.5, 0); controls.update(); },
    zoom(delta) {
      const offset = camera.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(offset.length() * Math.exp(Number(delta) * 0.12), controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(distance));
      controls.update();
    },
    screenshot() { renderer.render(scene, camera); return canvas.toDataURL('image/png'); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointercancel', cancelDown);
      canvas.removeEventListener('contextmenu', contextMenu);
      for (const g of geometries) g.dispose();
      for (const material of materials) material.dispose();
      renderer.dispose();
      canvas.remove();
    }
  };
}
