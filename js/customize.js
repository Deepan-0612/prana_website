/*
 * PRANA — Bespoke 3D Jewellery Customization Studio
 * Luxury Interactive Studio Engine (Three.js WebGL + SVG Flat Lay Fallback)
 *
 * Capabilities:
 * - Real 3D interactive procedural bracelet generator
 * - Smooth manual rotation (drag to orbit/tilt, pinch/scroll to zoom)
 * - Auto-rotation with pause/resume toggle & view reset
 * - High-end PBR materials with realistic gemstone subsurface/glass/sheen
 * - Seamless integration with actual photographic stone textures
 * - Three-column luxury studio layout responsive on desktop, tablet, and mobile
 * - Dynamic bead selection, rearrangement (drag/swap/arrows), adding, removing, mirroring, reversing
 * - Smart wrist measurement (cm/inches) with snug/regular/loose fit calculations
 * - Real-time live design summary and accurate pricing
 * - "My Designs" persistence (save, name, reopen, duplicate, delete) using LocalStorage
 * - Seamless cart integration preserving existing checkout architecture
 */

const EASE_CM = { snug: 0.5, comfortable: 1.5, loose: 2.5 };
const BASE_PRICE = 799;
const SPACER_PRICE = 199;

// Connect to the centralized PRANA Asset Registry
function getGemRegistry() {
  if (typeof window !== 'undefined' && window.PRANA_ASSETS && typeof window.PRANA_ASSETS.getAllGems === 'function') {
    return window.PRANA_ASSETS.getAllGems();
  }
  return [
    {
      id: 'amethyst',
      name: 'Amethyst',
      category: 'Quartz',
      photo: 'assets/img/crystals/Amethyst.jpg',
      src: 'SVG/Amethyst.svg',
      price: 45,
      sizes: [6, 8, 10, 12],
      glow: '#C084FC',
      color: '#8b5cf6',
      gradStart: '#F3E8FF',
      gradMid: '#A855F7',
      gradDeep: '#581C87',
      tooltip: [
        'A beautiful purple variety of quartz.',
        'Known for its distinctive violet shades.',
        'Popular in jewelry and decorative pieces.',
        'Traditionally associated with calm and clarity.',
        'A timeless choice for crystal bracelets.'
      ]
    },
    {
      id: 'rose',
      name: 'Rose Quartz',
      category: 'Quartz',
      photo: 'assets/img/crystals/Rose Quartz.jpg',
      src: 'SVG/Rose Quartz.svg',
      price: 40,
      sizes: [6, 8, 10, 12],
      glow: '#F472B6',
      color: '#f472b6',
      gradStart: '#FFF1F5',
      gradMid: '#F472B6',
      gradDeep: '#9D174D',
      tooltip: [
        'A delicate pink variety of quartz.',
        'Recognized for its soft pink appearance.',
        'Popular in handmade crystal jewelry.',
        'Traditionally associated with love and compassion.',
        'A lovely choice for elegant bracelets.'
      ]
    },
    {
      id: 'clear',
      name: 'Clear Quartz',
      category: 'Quartz',
      photo: 'assets/img/crystals/Clear Quartz.jpg',
      src: 'SVG/Clear Quartz.svg',
      price: 35,
      sizes: [6, 8, 10, 12],
      glow: '#93C5FD',
      color: '#e0f2fe',
      gradStart: '#FFFFFF',
      gradMid: '#BAE6FD',
      gradDeep: '#0284C7',
      tooltip: [
        'A transparent and versatile variety of quartz.',
        'Known for its clear, glass-like appearance.',
        'Commonly used in crystal jewelry.',
        'Traditionally associated with clarity and balance.',
        'A classic addition to gemstone bracelets.'
      ]
    }
  ];
}

const gems = getGemRegistry();
const categories = [...new Set(gems.map(g => g.category))];
const THREE_LIB = typeof window !== 'undefined' ? window.THREE : undefined;
const SIGNATURE_STRAND = [
  'amethyst', 'clear', 'rose', 'clear', 'amethyst', 'rose', 'clear',
  'amethyst', 'clear', 'rose', 'clear', 'amethyst', 'rose', 'clear',
  'amethyst', 'clear', 'rose', 'clear', 'amethyst', 'rose', 'clear'
];
const CORD_LABELS = { clear: 'Clear elastic', lavender: 'Lavender silk', gold: 'Gold thread' };
const METAL_LABELS = { gold: 'Yellow gold', silver: 'Sterling silver', rosegold: 'Rose gold' };
const FIT_LABELS = { snug: 'Snug', comfortable: 'Regular', loose: 'Loose' };

// Studio Master State
let state = {
  beads: [],
  originalBeads: [], // Original configuration - immutable
  beadSize: 8,
  wristCm: 17,
  fit: 'comfortable',
  search: '',
  category: '',
  selectedCrystal: 'amethyst',
  isRotating: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  cordType: 'clear',
  metalAccent: 'gold',
  includeSpacers: false,
  viewMode: '3d', // '3d' or 'svg'
  previewSource: 'my', // 'my' | 'original'
  activeTab: 'gemstones',
  manualArrangeMode: true // Select & Arrange Manually mode
};

let history = [[]];
let histIdx = 0;
let activeTooltip = null;
let toastTimeout = null;
let gemInfoTimeout = null;

// Drag and drop & swap state
let dragState = {
  sourceIdx: null,
  targetIdx: null,
  selectedIdx: null,
  draggedGemId: null,
  isDragging: false
};

// Three.js 3D Studio Engine State
let threeStudio = {
  scene: null,
  camera: null,
  renderer: null,
  braceletGroup: null,
  beadMeshes: [],
  spacerMeshes: [],
  cordMesh: null,
  isInitialized: false,
  isDragging: false,
  previousMousePosition: { x: 0, y: 0 },
  targetRotation: { x: 0.35, y: 0 },
  currentRotation: { x: 0.35, y: 0 },
  zoomLevel: 1.0,
  minZoom: 0.6,
  maxZoom: 1.8,
  animFrameId: null,
  textureCache: {}
};

// Sizing & Pricing Computations
function easeCm() { return EASE_CM[state.fit] || EASE_CM.comfortable; }
function circumferenceMm() { return (state.wristCm + easeCm()) * 10; }
function recommendedCount() {
  if (state.wristCm <= 14) return 64;
  if (state.wristCm <= 16) return 66;
  if (state.wristCm <= 18) return 68;
  return 70;
}
function beadPrice(gemId) { const g = gems.find(x => x.id === gemId); return g ? g.price : 0; }
function beadsPrice() { return state.beads.reduce((sum, id) => sum + beadPrice(id), 0); }
function totalPrice() {
  return BASE_PRICE + beadsPrice() + (state.includeSpacers ? SPACER_PRICE : 0);
}

function gemById(id) {
  const g = gems.find(x => x.id === id);
  if (!g) return { id, name: 'Unknown', color: '#999', price: 0, gradStart: '#eee', gradMid: '#999', gradDeep: '#444' };
  if (!g.color) {
    const fallback = { amethyst: '#9B7ED9', rose: '#E8A5B8', clear: '#D9E2F3' };
    g.color = fallback[g.id] || '#999';
  }
  return g;
}

function gemPhotoSrc(g) {
  if (!g) return '';
  if (g.photo) return g.photo;
  const src = g.src || '';
  if (/\.(jpe?g|png|webp|avif)$/i.test(src)) return src;
  if (['amethyst', 'rose', 'clear'].includes(g.id)) return g.src || '';
  return '';
}

function previewBeads() {
  if (state.previewSource === 'original' && state.originalBeads.length) {
    return state.originalBeads;
  }
  return state.beads;
}

function fitLabel() {
  return FIT_LABELS[state.fit] || state.fit;
}

function gemImageMarkup(g, className, alt) {
  const src = gemPhotoSrc(g);
  if (src) {
    return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt || g.name)}" loading="lazy">`;
  }
  return `<div class="cz-photo-placeholder ${className}--placeholder" role="img" aria-label="${escapeHtml(`${g.name} photograph`)}"><span>Natural stone</span></div>`;
}

function selectedWristUnit() {
  return document.querySelector('input[name="czUnit"]:checked')?.value || 'cm';
}

function availableSizes() {
  if (state.beads.length === 0) return [6, 8, 10, 12, 14];
  let inter = null;
  for (const id of state.beads) {
    const s = new Set(gemById(id).sizes);
    inter = inter ? new Set([...inter].filter(x => s.has(x))) : s;
  }
  return inter ? [...inter].sort((a, b) => a - b) : [6, 8, 10, 12, 14];
}

function pushHistory() {
  history = history.slice(0, histIdx + 1);
  history.push([...state.beads]);
  histIdx = history.length - 1;
}
function canUndo() { return histIdx > 0; }
function canRedo() { return histIdx < history.length - 1; }

const els = {};
function $id(id) { return document.getElementById(id); }

function initRefs() {
  const ids = [
    'czGemSearch', 'czGemList', 'czCatFilters', 'czSelectedSpotlight',
    'czSize', 'czBeadSizeLabel', 'czBeadSizePills', 'czSvg', 'czSvgContainer',
    'cz3DStage', 'czCenterpiece', 'czRotateToggle', 'czRotateLabel',
    'czCount', 'czCountLabel', 'czRecCount', 'czCountPill', 'czStrand',
    'czBeadsPrice', 'czTotalPrice', 'czSummary', 'czWristCm', 'czWristSlider',
    'czFit', 'czReview', 'czToast', 'czSpotlightCard', 'czMiniStrand',
    'czZoomIn', 'czZoomOut', 'czResetView', 'czStageHint',
    'czMode3D', 'czModeSVG', 'czPriceBeadCount', 'czSpacerPriceLine',
    'czSpacerToggle',     'czSaveCurrentDesignBtn', 'czSavedDesignsList',
    'czArrangerCount', 'czFilteredCountNote',
    'czSummaryWristLine', 'czSummaryMaterials', 'czSummaryBeadTotal',
    'czSaveModal', 'czSaveNameInput', 'czSaveConfirm', 'czSaveCancel',
    'czGemInfoPop', 'czEditWristBtn', 'czLiveIndicator'
  ];
  ids.forEach(id => { els[id] = $id(id); });
}

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function showToast(message) {
  const toast = els.czToast || document.getElementById('czToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-shown');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('is-shown');
  }, 3200);
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/* =========================================================
   1. THREE_LIB.JS 3D PROCEDURAL BRACELET ENGINE
   ========================================================= */

function initThreeEngine() {
  const container = els.cz3DStage;
  if (!container || !THREE_LIB) {
    console.warn('Three.js library is not present; falling back to SVG renderer.');
    state.viewMode = 'svg';
    switchViewMode('svg');
    return;
  }

  // If already initialized, just handle resizing
  if (threeStudio.isInitialized && threeStudio.renderer) {
    onWindowResize();
    return;
  }

  try {
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 540;

    // 1. Scene
    const scene = new THREE_LIB.Scene();
    threeStudio.scene = scene;

    // 2. Camera: Centered framing and optimal jewellery FOV
    // Place camera elevated at Y=7, Z=19 and point target directly at (0, 0, 0)
    const camera = new THREE_LIB.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 7.5, 19.5);
    camera.lookAt(0, 0, 0);
    threeStudio.camera = camera;

    // 3. Renderer with high-DPI antialiasing & physical tone mapping
    const renderer = new THREE_LIB.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE_LIB.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE_LIB.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    threeStudio.renderer = renderer;

    // 4. Studio Lighting Rig (Key, Fill, Rim, Ambient)
    const ambientLight = new THREE_LIB.AmbientLight(0xfff6f9, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE_LIB.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(10, 16, 12);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE_LIB.DirectionalLight(0xe9d5ff, 1.3);
    fillLight.position.set(-12, 6, 8);
    scene.add(fillLight);

    const rimLight = new THREE_LIB.DirectionalLight(0xfef08a, 1.0);
    rimLight.position.set(0, -8, -12);
    scene.add(rimLight);

    // 5. Central Bracelet Group - Centered at (0, 0, 0)
    const braceletGroup = new THREE_LIB.Group();
    braceletGroup.position.set(0, 0, 0);
    braceletGroup.rotation.x = threeStudio.currentRotation.x;
    braceletGroup.rotation.y = threeStudio.currentRotation.y;
    scene.add(braceletGroup);
    threeStudio.braceletGroup = braceletGroup;

    // 6. Pedestal Contact Shadow Plane located right below bracelet
    const shadowGeo = new THREE_LIB.PlaneGeometry(28, 28);
    const shadowMat = new THREE_LIB.ShadowMaterial({ opacity: 0.16 });
    const shadowPlane = new THREE_LIB.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.8;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 7. Event Handlers for Orbit & Zoom
    attachThreeInteractionEvents(renderer.domElement);
    window.addEventListener('resize', onWindowResize);

    threeStudio.isInitialized = true;
    updateCameraFraming();
    animateThree();
  } catch (err) {
    console.error('Failed to initialize 3D WebGL studio:', err);
    switchViewMode('svg');
  }
}

function updateCameraFraming() {
  if (!threeStudio.camera || !threeStudio.renderer || !els.cz3DStage) return;
  const width = els.cz3DStage.clientWidth || 600;
  const height = els.cz3DStage.clientHeight || 540;
  const aspect = width / height;

  threeStudio.camera.aspect = aspect;

  // Responsive camera distance to guarantee full bracelet visibility on all screens
  // For narrow or mobile viewports (aspect < 1.0), back camera up proportionally
  let dist = 19.5;
  if (aspect < 0.75) {
    dist = 24.5;
  } else if (aspect < 1.0) {
    dist = 21.5;
  } else if (aspect < 1.3) {
    dist = 20.0;
  }

  // Adjust for bracelet radius variations
  const radius = Math.max(4.2, Math.min(7.5, (circumferenceMm() / 20 / Math.PI) * 0.92));
  const radiusFactor = radius / 5.2; // normalized around standard 5.2 radius
  const finalZ = dist * Math.max(0.9, Math.min(1.3, radiusFactor));
  const finalY = finalZ * 0.38;

  threeStudio.camera.position.set(0, finalY, finalZ);
  threeStudio.camera.lookAt(0, 0, 0);
  threeStudio.camera.updateProjectionMatrix();
  threeStudio.renderer.setSize(width, height);
}

function onWindowResize() {
  updateCameraFraming();
}

function attachThreeInteractionEvents(domElement) {
  let isDown = false;
  let startX = 0, startY = 0;

  const onDown = (clientX, clientY) => {
    isDown = true;
    startX = clientX;
    startY = clientY;
    threeStudio.previousMousePosition = { x: clientX, y: clientY };
  };

  const onMove = (clientX, clientY) => {
    if (!isDown) return;
    const deltaX = clientX - threeStudio.previousMousePosition.x;
    const deltaY = clientY - threeStudio.previousMousePosition.y;

    threeStudio.targetRotation.y += deltaX * 0.008;
    threeStudio.targetRotation.x += deltaY * 0.008;

    // Clamp vertical tilt to prevent unnatural flipping
    threeStudio.targetRotation.x = Math.max(-0.6, Math.min(1.2, threeStudio.targetRotation.x));

    threeStudio.previousMousePosition = { x: clientX, y: clientY };

    // Hide initial gesture hint once user begins interaction
    if (els.czStageHint) {
      els.czStageHint.style.opacity = '0';
    }
  };

  const onUp = () => { isDown = false; };

  domElement.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', onUp);

  domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      onDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener('touchend', onUp);

  let pinchStart = 0;
  domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart = Math.hypot(dx, dy);
    }
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinchStart) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - pinchStart) * 0.004;
      pinchStart = dist;
      threeStudio.zoomLevel = Math.max(threeStudio.minZoom, Math.min(threeStudio.maxZoom, threeStudio.zoomLevel + delta));
    }
  }, { passive: true });

  // Wheel zoom
  domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0012;
    threeStudio.zoomLevel = Math.max(threeStudio.minZoom, Math.min(threeStudio.maxZoom, threeStudio.zoomLevel + zoomDelta));
  }, { passive: false });
}

function animateThree() {
  threeStudio.animFrameId = requestAnimationFrame(animateThree);

  if (!threeStudio.renderer || !threeStudio.scene || !threeStudio.camera) return;

  // Auto rotation if enabled
  if (state.isRotating) {
    threeStudio.targetRotation.y += 0.0045;
  }

  // Smooth rotation dampening
  threeStudio.currentRotation.x += (threeStudio.targetRotation.x - threeStudio.currentRotation.x) * 0.08;
  threeStudio.currentRotation.y += (threeStudio.targetRotation.y - threeStudio.currentRotation.y) * 0.08;

  if (threeStudio.braceletGroup) {
    threeStudio.braceletGroup.rotation.x = threeStudio.currentRotation.x;
    threeStudio.braceletGroup.rotation.y = threeStudio.currentRotation.y;
    threeStudio.braceletGroup.scale.setScalar(threeStudio.zoomLevel);
  }

  threeStudio.renderer.render(threeStudio.scene, threeStudio.camera);
}

function loadGemTexture(src, onReady) {
  if (!THREE_LIB || !src) return;
  if (threeStudio.textureCache[src]) {
    onReady(threeStudio.textureCache[src]);
    return;
  }
  const loader = new THREE_LIB.TextureLoader();
  loader.load(src, (tex) => {
    if (THREE_LIB.SRGBColorSpace) tex.colorSpace = THREE_LIB.SRGBColorSpace;
    tex.wrapS = THREE_LIB.RepeatWrapping;
    tex.wrapT = THREE_LIB.RepeatWrapping;
    threeStudio.textureCache[src] = tex;
    onReady(tex);
  }, undefined, () => {});
}

function applyTextureToMaterial(material, gem) {
  const src = gemPhotoSrc(gem);
  if (!src || !material) return material;
  loadGemTexture(src, (tex) => {
    material.map = tex;
    material.needsUpdate = true;
  });
  return material;
}

// Create High-End Material for each Gemstone
function getOrCreateGemMaterial(gem) {
  if (!gem) return new THREE_LIB.MeshStandardMaterial({ color: 0x999999, roughness: 0.3 });

  const colorHex = parseInt((gem.color || '#9B7ED9').replace('#', '0x'), 16);
  const glowHex = parseInt((gem.glow || '#C084FC').replace('#', '0x'), 16);

  // Clear Quartz material: high transmission & glass-like reflection
  if (gem.id === 'clear') {
    return applyTextureToMaterial(new THREE_LIB.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.55,
      opacity: 1,
      transparent: true,
      roughness: 0.08,
      metalness: 0.0,
      ior: 1.54,
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04
    }), gem);
  }

  // Rose Quartz material: translucent delicate pink with soft subsurface dispersion
  if (gem.id === 'rose') {
    return applyTextureToMaterial(new THREE_LIB.MeshPhysicalMaterial({
      color: 0xffcad4,
      emissive: 0x551122,
      emissiveIntensity: 0.08,
      roughness: 0.18,
      metalness: 0.02,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      transmission: 0.22,
      thickness: 1.2
    }), gem);
  }

  // Amethyst: deep violet luster with glass-crystalline clearcoat
  if (gem.id === 'amethyst') {
    return applyTextureToMaterial(new THREE_LIB.MeshPhysicalMaterial({
      color: 0x6d28d9,
      emissive: 0x2e0854,
      emissiveIntensity: 0.12,
      roughness: 0.16,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transmission: 0.18
    }), gem);
  }

  // Tiger's eye: chatoyant silky reflection
  if (gem.id === 'tiger') {
    return applyTextureToMaterial(new THREE_LIB.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.28,
      metalness: 0.18
    }), gem);
  }

  // Lapis lazuli: deep celestial ultramarine with soft gold metallic fleck
  if (gem.id === 'lapis') {
    return applyTextureToMaterial(new THREE_LIB.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.32,
      metalness: 0.12
    }), gem);
  }

  // General gemstone material
  return applyTextureToMaterial(new THREE_LIB.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.18,
    metalness: 0.05,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1
  }), gem);
}

function getMetalMaterial(metalType) {
  const type = metalType || state.metalAccent || 'gold';
  if (type === 'silver') {
    return new THREE_LIB.MeshStandardMaterial({
      color: 0xe4e4e7,
      metalness: 0.96,
      roughness: 0.14
    });
  }
  if (type === 'rosegold') {
    return new THREE_LIB.MeshStandardMaterial({
      color: 0xf472b6,
      metalness: 0.88,
      roughness: 0.18
    });
  }
  // Default: 18K Yellow Gold
  return new THREE_LIB.MeshStandardMaterial({
    color: 0xe6c66a,
    metalness: 0.92,
    roughness: 0.16
  });
}

function update3DBracelet() {
  if (!threeStudio.braceletGroup || !threeStudio.scene) return;

  const group = threeStudio.braceletGroup;

  // Clear previous meshes
  while (group.children.length > 0) {
    const obj = group.children[0];
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    group.remove(obj);
  }

  const strand = previewBeads();
  const n = strand.length;
  if (n === 0) {
    // Render ghostly placeholder guide circle when empty
    const ghostGeo = new THREE_LIB.TorusGeometry(5.2, 0.06, 16, 64);
    const ghostMat = new THREE_LIB.MeshBasicMaterial({ color: 0xc687e3, opacity: 0.35, transparent: true });
    group.add(new THREE_LIB.Mesh(ghostGeo, ghostMat));
    return;
  }

  // Compute ring dimensions according to wrist circumference and bead count
  const radius = Math.max(4.2, Math.min(7.5, (circumferenceMm() / 20 / Math.PI) * 0.92));
  const beadScale = Math.max(0.48, Math.min(1.2, (state.beadSize / 8) * 0.72));

  // 1. Add Elastic Cord Loop
  const cordColor = state.cordType === 'lavender' ? 0xa855f7 : state.cordType === 'gold' ? 0xe6c66a : 0xf1f5f9;
  const cordOpacity = state.cordType === 'clear' ? 0.32 : 0.85;
  const cordGeo = new THREE_LIB.TorusGeometry(radius, 0.07, 16, 96);
  const cordMat = new THREE_LIB.MeshStandardMaterial({
    color: cordColor,
    roughness: 0.4,
    transparent: true,
    opacity: cordOpacity
  });
  group.add(new THREE_LIB.Mesh(cordGeo, cordMat));

  // 2. Bead Geometries and Meshes
  const sphereGeo = new THREE_LIB.SphereGeometry(beadScale, 36, 36);

  strand.forEach((id, i) => {
    const gem = gemById(id);
    const angle = (i / n) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const beadMesh = new THREE_LIB.Mesh(sphereGeo, getOrCreateGemMaterial(gem));
    beadMesh.position.set(x, 0, z);
    beadMesh.castShadow = true;
    beadMesh.receiveShadow = true;
    beadMesh.userData = { index: i, gemId: id };

    // Highlight selected bead
                if (state.previewSource === 'my' && dragState.selectedIdx === i) {
      const outlineGeo = new THREE_LIB.SphereGeometry(beadScale * 1.15, 20, 20);
      const outlineMat = new THREE_LIB.MeshBasicMaterial({ color: 0xe6c66a, wireframe: true });
      beadMesh.add(new THREE_LIB.Mesh(outlineGeo, outlineMat));
    }

    group.add(beadMesh);

    // Optional Accent Spacers placed symmetrically
    if (state.includeSpacers && (i % 4 === 3 || i === n - 1)) {
      const spacerAngle = angle + (Math.PI / n);
      const sx = Math.cos(spacerAngle) * radius;
      const sz = Math.sin(spacerAngle) * radius;

      const spacerGeo = new THREE_LIB.CylinderGeometry(beadScale * 0.55, beadScale * 0.55, 0.18, 24);
      const spacerMesh = new THREE_LIB.Mesh(spacerGeo, getMetalMaterial(state.metalAccent));
      spacerMesh.position.set(sx, 0, sz);
      spacerMesh.rotation.z = Math.PI / 2;
      spacerMesh.rotation.y = -spacerAngle;
      spacerMesh.castShadow = true;
      group.add(spacerMesh);
    }
  });
}

function switchViewMode(mode) {
  state.viewMode = mode;
  if (els.czMode3D) els.czMode3D.classList.toggle('is-active', mode === '3d');
  if (els.czModeSVG) els.czModeSVG.classList.toggle('is-active', mode === 'svg');

  if (mode === '3d') {
    if (els.cz3DStage) els.cz3DStage.classList.remove('is-hidden');
    if (els.czSvgContainer) els.czSvgContainer.classList.add('is-hidden');
    if (threeStudio.isInitialized) onWindowResize();
    else initThreeEngine();
    if (threeStudio.isInitialized) update3DBracelet();
  } else {
    if (els.cz3DStage) els.cz3DStage.classList.add('is-hidden');
    if (els.czSvgContainer) els.czSvgContainer.classList.remove('is-hidden');
    renderSVG();
  }
}

/* =========================================================
   2. SVG FLAT LAY PREVIEW FALLBACK (PRESERVED)
   ========================================================= */
function renderSVG() {
  if (!els.czSvg) return;
  const strand = previewBeads();
  const n = strand.length;
  const r = circumferenceMm() / 2 / Math.PI;
  const beadR = Math.max(16, state.beadSize * 3.75);
  const spacingRadius = n > 1 ? (beadR * 2 + 8) / (2 * Math.sin(Math.PI / n)) : 260;
  const svgR = Math.max(260, Math.min(380, Math.max(r * 10, spacingRadius)));

  let defs = `
    <defs>
      <filter id="czBeadShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="5" stdDeviation="4.5" flood-color="#1A0726" flood-opacity="0.35" />
      </filter>

      <linearGradient id="czSpecularShine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
        <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
      </linearGradient>
  `;

  gems.forEach(g => {
    defs += `
      <radialGradient id="grad-${g.id}" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="${g.gradStart || '#FFFFFF'}" />
        <stop offset="65%" stop-color="${g.gradMid || g.color || '#999'}" />
        <stop offset="100%" stop-color="${g.gradDeep || '#1c0e29'}" />
      </radialGradient>
    `;
    const photoUrl = gemPhotoSrc(g);
    if (photoUrl) {
      defs += `
        <pattern id="pat-${g.id}" patternUnits="userSpaceOnUse" width="${beadR * 2}" height="${beadR * 2}" x="-${beadR}" y="-${beadR}">
          <image href="${photoUrl}" x="-${beadR}" y="-${beadR}" width="${beadR * 2}" height="${beadR * 2}" preserveAspectRatio="xMidYMid slice" />
        </pattern>
      `;
    }
  });

  defs += `</defs>`;

  let out = defs;
  out += `
    <g id="czBraceletDisc" class="cz-bracelet-disc ${!state.isRotating ? 'is-paused' : ''}">
      <circle cx="0" cy="0" r="${svgR}" fill="none" stroke="rgba(70,37,94,0.22)" stroke-width="4.5" stroke-dasharray="6 3" />
      <circle cx="0" cy="0" r="${svgR}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
  `;

  if (n === 0) {
    out += `<circle cx="0" cy="0" r="${svgR}" fill="none" stroke="rgba(198,135,227,0.35)" stroke-width="2" stroke-dasharray="6 6" />`;
  } else {
    strand.forEach((id, i) => {
      const g = gemById(id);
      const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = svgR * Math.cos(ang);
      const y = svgR * Math.sin(ang);
      const isSelected = dragState.selectedIdx === i;
      const beadFill = gemPhotoSrc(g) ? `url(#pat-${g.id})` : `url(#grad-${g.id})`;

      out += `
        <g class="cz-svg-bead ${isSelected ? 'cz-svg-bead--active' : ''}" data-index="${i}" data-gem="${id}" filter="url(#czBeadShadow)" transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})" style="cursor: pointer;">
          ${isSelected ? `<circle cx="0" cy="0" r="${beadR + 5}" fill="none" stroke="#e6c66a" stroke-width="3" stroke-dasharray="5 3" />` : ''}
          <circle cx="0" cy="0" r="${beadR}" fill="${beadFill}" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <ellipse cx="${(-beadR * 0.32).toFixed(1)}" cy="${(-beadR * 0.32).toFixed(1)}" rx="${(beadR * 0.38).toFixed(1)}" ry="${(beadR * 0.24).toFixed(1)}" transform="rotate(-30, ${(-beadR * 0.32).toFixed(1)}, ${(-beadR * 0.32).toFixed(1)})" fill="url(#czSpecularShine)" />
        </g>
      `;
    });
  }

  out += `</g>`;
  els.czSvg.innerHTML = out;
  attachSvgBeadEvents();
}

function attachSvgBeadEvents() {
  if (!els.czSvg) return;
  els.czSvg.querySelectorAll('.cz-svg-bead').forEach(beadEl => {
    const idx = parseInt(beadEl.getAttribute('data-index'), 10);
    const gemId = beadEl.getAttribute('data-gem');
    beadEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragState.selectedIdx !== null) {
        if (dragState.selectedIdx === idx) {
          dragState.selectedIdx = null;
          showToast('Selection cleared.');
        } else {
          const from = dragState.selectedIdx;
          dragState.selectedIdx = null;
          moveBead(from, idx);
          return;
        }
      } else {
        dragState.selectedIdx = idx;
        state.selectedCrystal = gemId;
        showToast(`Selected bead #${idx + 1} (${gemById(gemId).name}). Click another bead to move it.`);
      }
      renderAll();
    });
  });
}

/* =========================================================
   3. BEAD REARRANGEMENT & STRAND ACTIONS
   ========================================================= */
function moveBead(fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= state.beads.length || toIndex >= state.beads.length) return;
  const removed = state.beads[fromIndex];
  state.beads.splice(fromIndex, 1);
  state.beads.splice(toIndex, 0, removed);
  dragState.selectedIdx = toIndex;
  pushHistory();
  renderAll();
  showToast(`Moved ${gemById(removed).name} to position #${toIndex + 1}.`);
}

function insertBeadAt(gemId, targetIndex) {
  if (!gemId) return;
  const g = gemById(gemId);
  if (!g.sizes.includes(state.beadSize)) {
    showToast(`${g.name} is not available in ${state.beadSize} mm size.`);
    return;
  }
  const idx = Math.max(0, Math.min(state.beads.length, targetIndex));
  state.beads.splice(idx, 0, gemId);
  state.selectedCrystal = gemId;
  dragState.selectedIdx = idx;
  pushHistory();
  renderAll();
  showToast(`Inserted ${g.name} at position #${idx + 1}.`);
}

function mirrorArrangement() {
  if (state.beads.length < 2) return;
  const half = Math.floor(state.beads.length / 2);
  const left = state.beads.slice(0, half);
  const right = [...left].reverse();
  state.beads = left.concat(right);
  if (state.beads.length % 2) {
    state.beads.splice(half, 0, state.beads[half] || state.beads[0]);
  }
  pushHistory();
  renderAll();
  showToast('Bead pattern mirrored symmetrically.');
}

function reverseArrangement() {
  if (state.beads.length < 2) return;
  state.beads.reverse();
  pushHistory();
  renderAll();
  showToast('Bead sequence reversed.');
}

function clearDesign() {
  if (state.beads.length === 0) return;
  if (!confirm('Are you sure you want to reset your strand arrangement? You can undo this change.')) return;
  state.beads = [];
  dragState.selectedIdx = null;
  pushHistory();
  renderAll();
  showToast('Atelier bracelet sequence reset.');
}

function undo() {
  if (canUndo()) {
    histIdx--;
    state.beads = [...history[histIdx]];
    dragState.selectedIdx = null;
    renderAll();
    showToast('Undo successful.');
  } else {
    showToast('No further undo actions.');
  }
}

function redo() {
  if (canRedo()) {
    histIdx++;
    state.beads = [...history[histIdx]];
    dragState.selectedIdx = null;
    renderAll();
    showToast('Redo successful.');
  } else {
    showToast('No further redo actions.');
  }
}

/* =========================================================
   4. BEAD COLLECTION EXPLORER & CATEGORIES
   ========================================================= */
function renderCategoryFilters() {
  if (!els.czCatFilters) return;
  els.czCatFilters.innerHTML = `
    <button class="cz-cat ${!state.category ? 'cz-cat--active' : ''}" data-cat="">All</button>
    ${categories.map(cat => `<button class="cz-cat ${state.category === cat ? 'cz-cat--active' : ''}" data-cat="${cat}">${cat}</button>`).join('')}
  `;

  els.czCatFilters.querySelectorAll('.cz-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      state.category = btn.dataset.cat;
      state.search = '';
      if (els.czGemSearch) els.czGemSearch.value = '';
      renderCategoryFilters();
      renderGemList();
    });
  });
}

function renderGemList() {
  if (!els.czGemList) return;
  const cat = state.category;
  const q = state.search.toLowerCase();
  const filtered = gems.filter(g => {
    if (cat && g.category !== cat) return false;
    return g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
  });

  if (els.czFilteredCountNote) {
    els.czFilteredCountNote.textContent = `${filtered.length} ${filtered.length === 1 ? 'stone' : 'stones'}`;
  }

  els.czGemList.innerHTML = filtered.map(g => {
    const countInStrand = state.beads.filter(id => id === g.id).length;
    const isSelected = state.selectedCrystal === g.id;
    const isAllowed = g.sizes.includes(state.beadSize);
    const mediaHtml = gemImageMarkup(g, 'cz-gem__img', `${g.name} gemstone`);

    const lore = Array.isArray(g.tooltip) ? g.tooltip.join(' ') : '';
    const sizes = (g.sizes || []).join(', ');
    return `
      <div class="cz-gem-card ${isSelected ? 'cz-gem-card--selected' : ''} ${!isAllowed ? 'cz-gem-card--unavailable' : ''}"
           data-id="${g.id}"
           role="button"
           tabindex="0"
           draggable="true"
           aria-pressed="${isSelected}" 
           aria-disabled="${!isAllowed}"
           aria-label="${escapeHtml(g.name)} - ₹${g.price}">
        <div class="cz-gem-card__media">
          ${mediaHtml}
          ${countInStrand > 0 ? `<span class="cz-gem-card__count-badge">×${countInStrand}</span>` : ''}
        </div>
        <div class="cz-gem-card__body">
          <h4 class="cz-gem-card__name">${escapeHtml(g.name)}</h4>
          <div class="cz-gem-card__sub">${escapeHtml(g.category)} · ₹${g.price}</div>
        </div>
      </div>
    `;
  }).join('') || '<div style="grid-column:1/-1;text-align:center;color:var(--ink-2);padding:24px;">No gemstones match your search.</div>';

  attachGemCardEvents();
}

function attachGemCardEvents() {
  if (!els.czGemList) return;
  els.czGemList.querySelectorAll('.cz-gem-card').forEach(card => {
    const id = card.dataset.id;
    const g = gemById(id);

    // Drag-and-drop from gem collection to strand
    card.addEventListener('dragstart', (e) => {
      dragState.draggedGemId = id;
      dragState.isDragging = true;
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'copy';
      card.classList.add('is-dragging');
    });

    card.addEventListener('dragend', () => {
      dragState.draggedGemId = null;
      dragState.isDragging = false;
      card.classList.remove('is-dragging');
      document.querySelectorAll('.cz-drop-target').forEach(el => el.classList.remove('is-drag-over'));
    });

    card.addEventListener('mouseenter', () => {
      clearTimeout(gemInfoTimeout);
      gemInfoTimeout = setTimeout(() => showGemInfo(g, card), 700);
    });
    card.addEventListener('mouseleave', () => {
      clearTimeout(gemInfoTimeout);
      hideGemInfo();
    });
    card.addEventListener('focus', () => showGemInfo(g, card));
    card.addEventListener('blur', hideGemInfo);

    // Card click: focus on gemstone and add to strand
    card.addEventListener('click', (e) => {
      if (!g.sizes.includes(state.beadSize)) {
        showToast(`${g.name} is not available in ${state.beadSize} mm size.`);
        return;
      }

      state.selectedCrystal = id;

      // In Manual Mode: if user already has an insertion slot selected or bead selected, replace or insert
      if (state.manualArrangeMode && dragState.selectedIdx !== null && dragState.selectedIdx < state.beads.length) {
        // Swap/replace selected position with this bead
        const oldGem = gemById(state.beads[dragState.selectedIdx]);
        state.beads[dragState.selectedIdx] = id;
        pushHistory();
        animateCrystalFly(card, g);
        renderAll();
        showToast(`Replaced #${dragState.selectedIdx + 1} (${oldGem.name}) with ${g.name}.`);
        return;
      }

      state.beads.push(id);
      dragState.selectedIdx = state.beads.length - 1;
      pushHistory();

      // Launch fluid flying bead animation toward centerpiece
      animateCrystalFly(card, g);
      renderAll();
      showToast(`Added ${g.name} to bracelet (position #${state.beads.length}).`);
    });
  });
}

/* =========================================================
   5. SELECTED CRYSTAL SPOTLIGHT CARD
   ========================================================= */
function renderSelectedSpotlight() {
  const container = els.czSpotlightCard;
  if (!container) return;

  const currentId = state.selectedCrystal || (state.beads.length > 0 ? state.beads[state.beads.length - 1] : 'amethyst');
  const g = gemById(currentId);
  const countInStrand = state.beads.filter(id => id === g.id).length;
  const loreText = (g.tooltip && g.tooltip.length > 0) ? g.tooltip.join(' ') : 'A natural gemstone selected for mindful balance and bespoke aesthetic.';

  container.innerHTML = `
    <div class="cz-spotlight-inner" style="--spotlight-glow: ${g.glow || '#C084FC'};">
      <div class="cz-spotlight-visual">
        <div class="cz-spotlight-frame">
          ${gemImageMarkup(g, 'cz-spotlight-img', `${g.name} gemstone`)}
          <div class="cz-spotlight-sheen" aria-hidden="true"></div>
        </div>
        <span class="cz-spotlight-badge">${escapeHtml(g.category)}</span>
      </div>

      <div class="cz-spotlight-meta">
        <div class="cz-spotlight-header">
          <h3 class="cz-spotlight-name">${escapeHtml(g.name)}</h3>
          <span class="cz-spotlight-price">₹${g.price} <small>/ bead</small></span>
        </div>

        <p class="cz-spotlight-lore">${escapeHtml(loreText)}</p>

        <div class="cz-spotlight-details">
          <div class="cz-spotlight-row">
            <span>Diameters:</span>
            <strong>${(g.sizes || [8]).join(', ')} mm</strong>
          </div>
          <div class="cz-spotlight-row">
            <span>On Strand:</span>
            <strong>${countInStrand} ${countInStrand === 1 ? 'bead' : 'beads'}</strong>
          </div>
        </div>

        <div class="cz-spotlight-actions">
          <button type="button" class="btn btn--solid btn--xs cz-spotlight-add" id="czSpotlightAddBtn">
            + Add to Strand
          </button>
          ${countInStrand > 0 ? `
            <button type="button" class="btn btn--ghost btn--xs cz-spotlight-remove" id="czSpotlightRemoveBtn">
              Remove One
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  document.getElementById('czSpotlightAddBtn')?.addEventListener('click', () => {
    if (!g.sizes.includes(state.beadSize)) {
      showToast(`${g.name} is not available in ${state.beadSize} mm size.`);
      return;
    }
    state.beads.push(g.id);
    dragState.selectedIdx = null;
    pushHistory();
    const frame = container.querySelector('.cz-spotlight-frame');
    if (frame) animateCrystalFly(frame, g);
    renderAll();
  });

  document.getElementById('czSpotlightRemoveBtn')?.addEventListener('click', () => {
    const lastIdx = state.beads.lastIndexOf(g.id);
    if (lastIdx >= 0) {
      state.beads.splice(lastIdx, 1);
      pushHistory();
      renderAll();
    }
  });
}

function showGemInfo(gem, anchor, sticky) {
  const pop = els.czGemInfoPop || document.getElementById('czGemInfoPop');
  if (!pop || !gem || !anchor) return;
  const lore = Array.isArray(gem.tooltip) ? gem.tooltip.join(' ') : '';
  const sizes = (gem.sizes || []).join(', ');
  pop.innerHTML = `
    <strong>${escapeHtml(gem.name)}</strong>
    <span>${escapeHtml(gem.category || '')} · ₹${gem.price} / bead</span>
    ${sizes ? `<span>Available diameters: ${escapeHtml(sizes)} mm</span>` : ''}
    ${lore ? `<p>${escapeHtml(lore)}</p>` : ''}
  `;
  pop.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(240, window.innerWidth - 24);
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
  let top = rect.top - 12;
  pop.style.width = width + 'px';
  pop.style.left = left + 'px';
  requestAnimationFrame(() => {
    const h = pop.offsetHeight;
    top = rect.top - h - 10;
    if (top < 12) top = rect.bottom + 10;
    pop.style.top = top + 'px';
  });
  pop.classList.toggle('is-sticky', !!sticky);
  if (sticky) {
    const dismiss = (ev) => {
      if (pop.contains(ev.target) || ev.target.closest('[data-action="info"]')) return;
      hideGemInfo(true);
      document.removeEventListener('click', dismiss);
    };
    setTimeout(() => document.addEventListener('click', dismiss), 0);
  }
}

function hideGemInfo(force) {
  const pop = els.czGemInfoPop || document.getElementById('czGemInfoPop');
  if (!pop) return;
  if (!force && pop.classList.contains('is-sticky')) return;
  pop.classList.remove('is-sticky');
  pop.hidden = true;
}

function animateCrystalFly(cardEl, gem) {
  const imgEl = cardEl.querySelector('.cz-gem-card__media, .cz-spotlight-img');
  const targetStage = els.cz3DStage || els.czSvgContainer;
  if (!imgEl || !targetStage) return;

  const startRect = imgEl.getBoundingClientRect();
  const targetRect = targetStage.getBoundingClientRect();
  const imgSrc = gemPhotoSrc(gem);

  const flyer = document.createElement('div');
  flyer.className = 'cz-flying-crystal';
  if (imgSrc) {
    flyer.innerHTML = `<img src="${imgSrc}" alt="${gem.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    flyer.style.background = `radial-gradient(circle at 35% 30%, ${gem.gradStart || '#fff'}, ${gem.color || '#a855f7'} 70%, ${gem.gradDeep || '#3b0764'})`;
  }

  flyer.style.position = 'fixed';
  flyer.style.zIndex = '99999';
  flyer.style.left = `${startRect.left}px`;
  flyer.style.top = `${startRect.top}px`;
  flyer.style.width = `${startRect.width}px`;
  flyer.style.height = `${startRect.height}px`;
  flyer.style.borderRadius = '50%';
  flyer.style.pointerEvents = 'none';
  flyer.style.boxShadow = `0 10px 30px ${gem.glow || 'rgba(198,135,227,0.5)'}, 0 0 20px rgba(255,255,255,0.8)`;
  document.body.appendChild(flyer);

  const targetX = targetRect.left + targetRect.width / 2 - 14;
  const targetY = targetRect.top + targetRect.height / 2 - 14;

  if (window.gsap) {
    window.gsap.to(flyer, {
      duration: 0.6,
      x: targetX - startRect.left,
      y: targetY - startRect.top,
      scale: 0.25,
      rotation: 180,
      opacity: 0.9,
      ease: 'power3.inOut',
      onComplete: () => {
        flyer.remove();
        triggerPedestalRipple(gem);
      }
    });
  } else {
    setTimeout(() => {
      flyer.remove();
      triggerPedestalRipple(gem);
    }, 600);
  }
}

function triggerPedestalRipple(gem) {
  const halo = document.querySelector('.cz-pedestal__halo');
  if (halo) {
    halo.style.boxShadow = `0 0 90px 30px ${gem.glow || 'rgba(198,135,227,0.45)'}`;
    setTimeout(() => { halo.style.boxShadow = ''; }, 450);
  }
}

/* =========================================================
   6. STRAND SEQUENCE ARRANGER (MANUAL ARRANGE STUDIO)
   ========================================================= */
function renderStrand() {
  if (els.czArrangerCount) els.czArrangerCount.textContent = state.beads.length;

  // Active guide in Tab 2
  const activeBadge = document.getElementById('czInsertActiveGemBadge');
  if (activeBadge) {
    const activeGem = gemById(state.selectedCrystal || 'amethyst');
    activeBadge.textContent = `Active Gem: ${activeGem.name} (₹${activeGem.price})`;
  }

  // Mini ribbon under the 3D stage
  if (els.czMiniStrand) {
    if (state.beads.length === 0) {
      els.czMiniStrand.innerHTML = '<span class="cz-mini-empty">Select gems from the left panel to begin.</span>';
    } else {
      els.czMiniStrand.innerHTML = state.beads.map((id, i) => {
        const g = gemById(id);
        const isSel = dragState.selectedIdx === i;
        const src = gemPhotoSrc(g);
        return `
          <button type="button" class="cz-mini-dot ${isSel ? 'is-selected' : ''}" data-i="${i}" aria-label="Position #${i + 1}: ${g.name}">
            ${src ? `<img src="${src}" alt="">` : `<span style="background:${g.color};"></span>`}
          </button>
        `;
      }).join('');

      els.czMiniStrand.querySelectorAll('.cz-mini-dot').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.i, 10);
          if (dragState.selectedIdx !== null) {
            if (dragState.selectedIdx === idx) {
              dragState.selectedIdx = null;
            } else {
              const from = dragState.selectedIdx;
              dragState.selectedIdx = null;
              moveBead(from, idx);
              return;
            }
          } else {
            dragState.selectedIdx = idx;
          }
          renderAll();
        });
      });
    }
  }

  // Full arranger in Tab 2 (Manual Strand Composition)
  if (!els.czStrand) return;

  const activeGemId = state.selectedCrystal || 'amethyst';

  if (state.beads.length === 0) {
    els.czStrand.innerHTML = `
      <div class="cz-strand-empty">
        <p>No beads on strand yet.</p>
        <button type="button" class="cz-insert-slot cz-insert-slot--start" data-slot="0">
          <span class="cz-insert-slot__icon">+</span>
          <span>Place First Bead (${gemById(activeGemId).name})</span>
        </button>
      </div>
    `;
    attachSlotClickEvents();
    return;
  }

  let html = '';

  // Insertion Slot 0 (At beginning)
  html += `
    <div class="cz-drop-target cz-insert-slot-wrapper" data-slot="0">
      <button type="button" class="cz-insert-slot" data-slot="0" title="Insert ${gemById(activeGemId).name} at beginning (Position #1)">
        <span class="cz-insert-slot__icon">+</span>
        <span class="cz-insert-slot__label">Insert at #1</span>
      </button>
    </div>
  `;

  state.beads.forEach((id, i) => {
    const g = gemById(id);
    const isSelected = dragState.selectedIdx === i;

    html += `
      <div class="cz-strand-item ${isSelected ? 'cz-strand-item--selected' : ''}"
           data-i="${i}"
           data-gem="${id}"
           draggable="true"
           aria-label="Bead ${i + 1}: ${g.name}">
        ${gemPhotoSrc(g) ? `<img class="cz-strand__swatch" src="${escapeHtml(gemPhotoSrc(g))}" alt="" loading="lazy">` : `<span class="cz-strand__swatch" style="background:${g.color};"></span>`}
        <div class="cz-strand__num">#${i + 1}</div>
        <div class="cz-strand__name">${escapeHtml(g.name)}</div>
        <div class="cz-strand__price">₹${g.price}</div>
        <div class="cz-strand__ctrl">
          <button type="button" class="cz-strand__move" data-move="up" ${i === 0 ? 'disabled' : ''} title="Move earlier in sequence">▲</button>
          <button type="button" class="cz-strand__move" data-move="down" ${i === state.beads.length - 1 ? 'disabled' : ''} title="Move later in sequence">▼</button>
          <button type="button" class="cz-strand__rem" data-rem="${i}" title="Remove this bead">✕</button>
        </div>
      </div>
    `;

    // Insertion slot between beads (after position i)
    html += `
      <div class="cz-drop-target cz-insert-slot-wrapper" data-slot="${i + 1}">
        <button type="button" class="cz-insert-slot" data-slot="${i + 1}" title="Insert ${gemById(activeGemId).name} at position #${i + 2}">
          <span class="cz-insert-slot__icon">+</span>
          <span class="cz-insert-slot__label">Insert at #${i + 2}</span>
        </button>
      </div>
    `;
  });

  els.czStrand.innerHTML = html;

  attachArrangerDragAndDropEvents();
  attachSlotClickEvents();
}

function attachSlotClickEvents() {
  if (!els.czStrand) return;
  els.czStrand.querySelectorAll('.cz-insert-slot').forEach(slotBtn => {
    slotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetIndex = parseInt(slotBtn.dataset.slot, 10);
      const gemToInsert = state.selectedCrystal || (state.beads.length > 0 ? state.beads[0] : 'amethyst');
      insertBeadAt(gemToInsert, targetIndex);
    });
  });
}

function attachArrangerDragAndDropEvents() {
  if (!els.czStrand) return;

  // 1. Dragging existing strand items to reorder
  els.czStrand.querySelectorAll('.cz-strand-item').forEach(item => {
    const idx = parseInt(item.dataset.i, 10);

    item.addEventListener('dragstart', (e) => {
      dragState.sourceIdx = idx;
      dragState.isDragging = true;
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('is-dragging');
    });

    item.addEventListener('dragend', () => {
      dragState.sourceIdx = null;
      dragState.isDragging = false;
      item.classList.remove('is-dragging');
      document.querySelectorAll('.cz-drop-target').forEach(el => el.classList.remove('is-drag-over'));
      document.querySelectorAll('.cz-strand-item').forEach(el => el.classList.remove('is-drag-over'));
    });

    // Drag over other strand item to swap/reorder
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = dragState.draggedGemId ? 'copy' : 'move';
      item.classList.add('is-drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('is-drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.classList.remove('is-drag-over');

      // Case A: Dropped a new gemstone from gallery directly onto this position -> replace or insert
      if (dragState.draggedGemId) {
        insertBeadAt(dragState.draggedGemId, idx);
        return;
      }

      // Case B: Reordering existing bead
      if (dragState.sourceIdx !== null && dragState.sourceIdx !== idx) {
        moveBead(dragState.sourceIdx, idx);
      }
    });

    // Click item to select for manual position swap
    item.addEventListener('click', (e) => {
      if (e.target.closest('.cz-strand__ctrl')) return;
      if (dragState.selectedIdx !== null) {
        if (dragState.selectedIdx === idx) {
          dragState.selectedIdx = null;
          showToast('Deselected bead.');
        } else {
          const from = dragState.selectedIdx;
          dragState.selectedIdx = null;
          moveBead(from, idx);
          return;
        }
      } else {
        dragState.selectedIdx = idx;
        state.selectedCrystal = state.beads[idx];
        showToast(`Selected bead #${idx + 1} (${gemById(state.beads[idx]).name}). Click another bead to swap, or pick a stone from the gallery to replace it.`);
      }
      renderAll();
    });
  });

  // 2. Drop targets between beads (Insertion slots)
  els.czStrand.querySelectorAll('.cz-drop-target').forEach(target => {
    const slotIdx = parseInt(target.dataset.slot, 10);

    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = dragState.draggedGemId ? 'copy' : 'move';
      target.classList.add('is-drag-over');
    });

    target.addEventListener('dragleave', () => {
      target.classList.remove('is-drag-over');
    });

    target.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      target.classList.remove('is-drag-over');

      // Dropped a new gem from collection
      if (dragState.draggedGemId) {
        insertBeadAt(dragState.draggedGemId, slotIdx);
        return;
      }

      // Dropped an existing bead into this insertion slot
      if (dragState.sourceIdx !== null) {
        const from = dragState.sourceIdx;
        let to = slotIdx;
        if (from < to) to = to - 1; // offset adjustment when moving forward
        moveBead(from, to);
      }
    });
  });

  // Controls (Move Up/Down)
  els.czStrand.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.cz-strand-item');
      const i = parseInt(item.dataset.i, 10);
      const dir = btn.dataset.move;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j >= 0 && j < state.beads.length) moveBead(i, j);
    });
  });

  // Remove individual bead
  els.czStrand.querySelectorAll('[data-rem]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.rem, 10);
      if (i >= 0 && i < state.beads.length) {
        const removed = state.beads.splice(i, 1)[0];
        dragState.selectedIdx = null;
        pushHistory();
        renderAll();
        showToast(`Removed 1 ${gemById(removed).name} bead.`);
      }
    });
  });
}

/* =========================================================
   7. LIVE SUMMARY, PRICING & SMART WRIST FIT
   ========================================================= */
function renderCountsAndPrice() {
  const count = state.beads.length;
  const rec = recommendedCount();
  if (els.czCount) els.czCount.textContent = count;
  if (els.czCountLabel) els.czCountLabel.textContent = count === 1 ? 'bead' : 'beads';
  if (els.czRecCount) els.czRecCount.textContent = `Target for wrist: ${rec} beads`;
  if (els.czPriceBeadCount) els.czPriceBeadCount.textContent = count;
  if (els.czBeadsPrice) els.czBeadsPrice.textContent = '₹' + beadsPrice().toLocaleString('en-IN');
  if (els.czTotalPrice) els.czTotalPrice.textContent = '₹' + totalPrice().toLocaleString('en-IN');

  if (els.czSpacerPriceLine) {
    els.czSpacerPriceLine.style.display = state.includeSpacers ? 'flex' : 'none';
  }
  if (els.czSummaryBeadTotal) els.czSummaryBeadTotal.textContent = String(count);
  if (els.czSummaryWristLine) {
    els.czSummaryWristLine.textContent = `${state.wristCm.toFixed(1)} cm · ${fitLabel()}`;
  }
  if (els.czSummaryMaterials) {
    const spacers = state.includeSpacers ? ' · Spacers' : '';
    els.czSummaryMaterials.textContent = `${CORD_LABELS[state.cordType] || state.cordType} · ${METAL_LABELS[state.metalAccent] || state.metalAccent}${spacers}`;
  }

  const pill = els.czCountPill;
  if (pill) {
    pill.classList.toggle('cz-meta-pill--match', count === rec);
  }
}

function renderSummary() {
  if (!els.czSummary) return;
  const counts = {};
  state.beads.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

  const rows = Object.keys(counts).map(id => {
    const g = gemById(id);
    return `
      <div class="cz-summary-row">
        ${gemPhotoSrc(g) ? `<img class="cz-summary__img" src="${escapeHtml(gemPhotoSrc(g))}" alt="" loading="lazy">` : `<span class="cz-summary__swatch" style="background:${g.color};"></span>`}
        <div class="cz-summary__details">
          <strong class="cz-summary__title">${escapeHtml(g.name)}</strong>
          <span class="cz-summary__meta">₹${g.price} / bead · ${state.beadSize} mm</span>
        </div>
        <div class="cz-summary__controls" aria-label="${g.name} quantity">
          <button type="button" class="cz-summary__quantity" data-summary-remove="${id}" aria-label="Remove one">−</button>
          <span class="cz-summary__qty">${counts[id]}</span>
          <button type="button" class="cz-summary__quantity" data-summary-add="${id}" aria-label="Add one">+</button>
        </div>
        <span class="cz-summary__price">₹${(g.price * counts[id]).toLocaleString('en-IN')}</span>
      </div>
    `;
  }).join('');

  els.czSummary.innerHTML = rows || '<div class="cz-summary-empty">Your design is ready for its first gemstone.</div>';

  els.czSummary.querySelectorAll('[data-summary-add]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.summaryAdd;
      const g = gemById(id);
      if (!g.sizes.includes(state.beadSize)) {
        showToast(`${g.name} is not available in ${state.beadSize} mm size.`);
        return;
      }
      state.selectedCrystal = id;
      state.beads.push(id);
      dragState.selectedIdx = null;
      pushHistory();
      renderAll();
    });
  });

  els.czSummary.querySelectorAll('[data-summary-remove]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.summaryRemove;
      const beadIndex = state.beads.lastIndexOf(id);
      if (beadIndex < 0) return;
      state.beads.splice(beadIndex, 1);
      dragState.selectedIdx = null;
      pushHistory();
      renderAll();
      showToast(`Removed one ${gemById(id).name} bead.`);
    });
  });
}

function renderBeadSizeSelect() {
  const avail = availableSizes();
  if (!avail.includes(state.beadSize)) state.beadSize = avail[0];

  if (els.czSize) {
    els.czSize.value = state.beadSize;
  }

  const pillsContainer = els.czBeadSizePills;
  if (pillsContainer) {
    pillsContainer.querySelectorAll('.cz-size-pill').forEach(pill => {
      const sz = +pill.dataset.size;
      pill.classList.toggle('is-active', sz === state.beadSize);
      pill.disabled = !avail.includes(sz);
    });
  }

  if (els.czBeadSizeLabel) {
    els.czBeadSizeLabel.textContent = `Selected: ${state.beadSize} mm`;
  }
}

function renderWrist() {
  const presetLabel = document.getElementById('czWristPresetLabel');
  const presets = document.querySelectorAll('.cz-wrist-preset');
  let closestPreset = null;
  let closestDistance = Infinity;
  presets.forEach((preset) => {
    const distance = Math.abs(Number(preset.dataset.wristCm) - state.wristCm);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPreset = preset;
    }
  });
  let activePreset = closestPreset?.dataset.sizeLabel || 'M';
  presets.forEach((preset) => {
    const selected = preset === closestPreset;
    preset.classList.toggle('is-active', selected);
    preset.setAttribute('aria-checked', String(selected));
    if (selected) activePreset = preset.dataset.sizeLabel;
  });
  if (presetLabel) presetLabel.textContent = `${activePreset} · Regular fit`;

  const unit = selectedWristUnit();
  const displayedValue = unit === 'in' ? state.wristCm / 2.54 : state.wristCm;
  const inVal = state.wristCm / 2.54;

  if (els.czWristCm) {
    els.czWristCm.value = displayedValue.toFixed(1);
    els.czWristCm.min = unit === 'in' ? (13 / 2.54).toFixed(1) : '13';
    els.czWristCm.max = unit === 'in' ? (23 / 2.54).toFixed(1) : '23';
  }
  if (els.czWristSlider) {
    els.czWristSlider.value = state.wristCm;
  }
  const disp = document.getElementById('czWristInDisp');
  if (disp) {
    disp.textContent = unit === 'in' ? `(${state.wristCm.toFixed(1)} cm)` : `(${inVal.toFixed(1)} in)`;
  }

  // Update fit pill selection
  document.querySelectorAll('.cz-fit-pill').forEach(pill => {
    pill.classList.toggle('is-active', pill.dataset.fit === state.fit);
  });
  if (els.czFit) els.czFit.value = state.fit;
}

function renderReview() {
  if (!els.czReview) return;
  const n = state.beads.length;
  const rec = recommendedCount();
  const ok = n === rec;
  const price = totalPrice();

  els.czReview.innerHTML = `
    <div class="cz-review-card">
      <div class="cz-review-card__header">
        <h4 class="cz-review-card__title">Atelier Calibration</h4>
        <span class="cz-review-card__badge ${ok ? 'cz-review-card__badge--ok' : 'cz-review-card__badge--warn'}">
          ${n === 0 ? 'Awaiting Gems' : ok ? '✓ Ideal Wrist Fit' : `Adjust to ${rec} beads`}
        </span>
      </div>

      <div class="cz-review-card__grid">
        <div class="cz-review-card__item"><span>Wrist:</span> <strong>${state.wristCm.toFixed(1)} cm (${(state.wristCm / 2.54).toFixed(1)}″)</strong></div>
        <div class="cz-review-card__item"><span>Fit Type:</span> <strong style="text-transform:capitalize;">${state.fit}</strong></div>
        <div class="cz-review-card__item"><span>Bead Size:</span> <strong>${state.beadSize} mm</strong></div>
        <div class="cz-review-card__item"><span>Strand Count:</span> <strong>${n} beads</strong></div>
      </div>

      <div class="cz-review-card__action">
        <button type="button" id="czAddToCart" class="btn btn--solid btn--full" ${n === 0 ? 'disabled' : ''}>
          Add Custom Bracelet to Bag · ₹${price.toLocaleString('en-IN')}
        </button>
      </div>
    </div>
  `;

  document.getElementById('czAddToCart')?.addEventListener('click', addToCart);
}

function renderRotationButton() {
  if (!els.czRotateToggle || !els.czRotateLabel) return;
  els.czRotateToggle.setAttribute('aria-pressed', String(state.isRotating));
  if (state.isRotating) {
    els.czRotateLabel.textContent = 'Rotating 360°';
    els.czRotateToggle.classList.add('is-active');
  } else {
    els.czRotateLabel.textContent = 'Rotation Paused';
    els.czRotateToggle.classList.remove('is-active');
  }
}

function toggleRotation() {
  state.isRotating = !state.isRotating;
  renderRotationButton();
  const disc = document.getElementById('czBraceletDisc');
  if (disc) disc.classList.toggle('is-paused', !state.isRotating);
}

/* =========================================================
   8. MY DESIGNS PERSISTENCE SUITE (LOCALSTORAGE)
   ========================================================= */
const STORAGE_KEY_DESIGNS = 'prana_atelier_saved_designs';

function getSavedDesigns() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_DESIGNS)) || [];
  } catch (e) {
    return [];
  }
}

function openSaveModal() {
  if (state.beads.length === 0) {
    showToast('Add gemstones before saving your bespoke design.');
    return;
  }
  const modal = els.czSaveModal;
  if (!modal) {
    saveCurrentDesign();
    return;
  }
  if (els.czSaveNameInput) {
    els.czSaveNameInput.value = `My ${gemById(state.beads[0]).name} strand`;
  }
  modal.hidden = false;
  els.czSaveNameInput?.focus();
  els.czSaveNameInput?.select();
}

function closeSaveModal() {
  if (els.czSaveModal) els.czSaveModal.hidden = true;
}

function saveCurrentDesign(customName) {
  if (state.beads.length === 0) {
    showToast('Add gemstones before saving your bespoke design.');
    return;
  }

  const name = customName || (els.czSaveNameInput && els.czSaveNameInput.value) || `My ${gemById(state.beads[0]).name} strand`;
  if (!String(name).trim()) return;

  const designs = getSavedDesigns();
  const newDesign = {
    id: 'design_' + Date.now(),
    name: name.trim() || 'Signature Strand',
    date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
    beads: [...state.beads],
    originalBeads: [...state.originalBeads],
    beadSize: state.beadSize,
    wristCm: state.wristCm,
    fit: state.fit,
    cordType: state.cordType,
    metalAccent: state.metalAccent,
    includeSpacers: state.includeSpacers,
    price: totalPrice()
  };

  designs.unshift(newDesign);
  try {
    localStorage.setItem(STORAGE_KEY_DESIGNS, JSON.stringify(designs));
    closeSaveModal();
    showToast(`Design "${newDesign.name}" saved on this device.`);
    renderSavedDesigns();
  } catch (e) {
    showToast('Unable to save design (browser storage full).');
  }
}

function loadSavedDesign(designId) {
  const designs = getSavedDesigns();
  const found = designs.find(d => d.id === designId);
  if (!found) return;

  state.beads = [...found.beads];
  state.beadSize = found.beadSize || 8;
  state.wristCm = found.wristCm || 17;
  state.fit = found.fit || 'comfortable';
  state.cordType = found.cordType || 'clear';
  state.metalAccent = found.metalAccent || 'gold';
  state.includeSpacers = !!found.includeSpacers;
  state.selectedCrystal = state.beads[0] || 'amethyst';

  // Update cord & metal option buttons in UI
  document.querySelectorAll('#czCordOptions .cz-option-card').forEach(b => {
    b.classList.toggle('is-active', b.dataset.cord === state.cordType);
  });
  document.querySelectorAll('#czMetalOptions .cz-option-card').forEach(b => {
    b.classList.toggle('is-active', b.dataset.metal === state.metalAccent);
  });
  if (els.czSpacerToggle) els.czSpacerToggle.checked = state.includeSpacers;

  dragState.selectedIdx = null;
  pushHistory();
  renderAll();
  showToast(`Loaded design: "${found.name}".`);
}

function duplicateSavedDesign(designId) {
  const designs = getSavedDesigns();
  const found = designs.find(d => d.id === designId);
  if (!found) return;

  const clone = Object.assign({}, found, {
    id: 'design_' + Date.now(),
    name: `${found.name} (Copy)`,
    date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  });
  designs.unshift(clone);
  localStorage.setItem(STORAGE_KEY_DESIGNS, JSON.stringify(designs));
  renderSavedDesigns();
  showToast(`Duplicated "${clone.name}".`);
}

function deleteSavedDesign(designId) {
  let designs = getSavedDesigns();
  const toDelete = designs.find(d => d.id === designId);
  if (!toDelete) return;

  if (confirm(`Delete saved design "${toDelete.name}"?`)) {
    designs = designs.filter(d => d.id !== designId);
    localStorage.setItem(STORAGE_KEY_DESIGNS, JSON.stringify(designs));
    renderSavedDesigns();
    showToast(`Deleted "${toDelete.name}".`);
  }
}

function renderSavedDesigns() {
  const container = els.czSavedDesignsList;
  if (!container) return;

  const designs = getSavedDesigns();
  if (designs.length === 0) {
    container.innerHTML = `
      <div class="cz-saved-empty">
        <span>No saved designs yet. Save the current strand — it stays in this browser only.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = designs.map(d => {
    const firstGem = gemById(d.beads[0] || 'amethyst');
    const photo = gemPhotoSrc(firstGem);
    return `
      <div class="cz-saved-item" data-id="${d.id}">
        <div class="cz-saved-thumb">
          ${photo ? `<img src="${photo}" alt="">` : `<span style="background:${firstGem.color};"></span>`}
        </div>
        <div class="cz-saved-info">
          <strong class="cz-saved-name">${escapeHtml(d.name)}</strong>
          <span class="cz-saved-meta">${d.beads.length} beads · ₹${(d.price || 799).toLocaleString('en-IN')} · ${d.date || 'Saved'}</span>
        </div>
        <div class="cz-saved-item-actions">
          <button type="button" class="btn btn--solid btn--xs" data-action="load" title="Load into studio">Open</button>
          <button type="button" class="cz-saved-icon-btn" data-action="copy" title="Duplicate design">⧉</button>
          <button type="button" class="cz-saved-icon-btn cz-saved-icon-btn--del" data-action="delete" title="Delete design">✕</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.cz-saved-item').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-action="load"]')?.addEventListener('click', () => loadSavedDesign(id));
    row.querySelector('[data-action="copy"]')?.addEventListener('click', () => duplicateSavedDesign(id));
    row.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteSavedDesign(id));
  });
}

/* =========================================================
   9. MASTER RENDER ALL
   ========================================================= */
function renderAll() {
  renderSelectedSpotlight();
  renderCategoryFilters();
  renderGemList();
  renderStrand();
  renderCountsAndPrice();
  renderSummary();
  renderBeadSizeSelect();
  renderWrist();
  renderReview();
  renderRotationButton();
  renderSavedDesigns();

  // Render 3D or SVG according to viewMode
  if (state.viewMode === '3d' && threeStudio.isInitialized) {
    update3DBracelet();
  } else {
    renderSVG();
  }

  const undoBtn = document.getElementById('czUndo');
  const redoBtn = document.getElementById('czRedo');
  if (undoBtn) undoBtn.disabled = !canUndo();
  if (redoBtn) redoBtn.disabled = !canRedo();
}

function addToCart() {
  if (state.beads.length === 0) {
    showToast('Add at least one gemstone before placing your bracelet in the bag.');
    return;
  }
  const price = totalPrice();
  if (window.pranaCart && typeof window.pranaCart.add === 'function') {
    window.pranaCart.add({
      id: 'custom-bracelet',
      title: 'Bespoke Atelier Bracelet',
      price: price,
      img: 'assets/img/Bacelet_example_prana.webp',
      design: JSON.stringify(state.beads),
      beadSize: state.beadSize,
      wrist: state.wristCm,
      fit: state.fit,
      cord: state.cordType,
      metal: state.metalAccent,
      spacers: state.includeSpacers,
      beadCount: state.beads.length,
    });
    showToast('Bespoke bracelet placed into your shopping bag.');
  } else {
    showToast('The shopping bag is unavailable. Please refresh and try again.');
  }
}

/* =========================================================
   10. INITIALIZATION
   ========================================================= */
function init() {
  initRefs();

  // 1. Tab Navigation in Left Panel
  document.querySelectorAll('.cz-panel-tab-nav .cz-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.cz-panel-tab-nav .cz-tab-btn').forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      document.querySelectorAll('.cz-col--controls .cz-tab-content').forEach(pane => {
        pane.classList.remove('is-active');
      });
      const activePane = document.getElementById('czTabPane' + tab.charAt(0).toUpperCase() + tab.slice(1));
      if (activePane) activePane.classList.add('is-active');
    });
  });

  // 2. View Mode Toggles
  if (els.czMode3D) {
    els.czMode3D.addEventListener('click', () => switchViewMode('3d'));
  }
  if (els.czModeSVG) {
    els.czModeSVG.addEventListener('click', () => switchViewMode('svg'));
  }

  // 3. Zoom and Camera Controls
  if (els.czZoomIn) {
    els.czZoomIn.addEventListener('click', () => {
      threeStudio.zoomLevel = Math.min(threeStudio.maxZoom, threeStudio.zoomLevel + 0.18);
    });
  }
  if (els.czZoomOut) {
    els.czZoomOut.addEventListener('click', () => {
      threeStudio.zoomLevel = Math.max(threeStudio.minZoom, threeStudio.zoomLevel - 0.18);
    });
  }
  if (els.czResetView) {
    els.czResetView.addEventListener('click', () => {
      threeStudio.targetRotation = { x: 0.35, y: 0 };
      threeStudio.zoomLevel = 1.0;
      showToast('Camera angle reset.');
    });
  }

  if (els.czRotateToggle) {
    els.czRotateToggle.addEventListener('click', toggleRotation);
  }

  // 4. Material Options Listeners
  document.querySelectorAll('#czCordOptions .cz-option-card').forEach(btn => {
    btn.addEventListener('click', () => {
      state.cordType = btn.dataset.cord;
      document.querySelectorAll('#czCordOptions .cz-option-card').forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-checked', String(b === btn));
      });
      renderAll();
      showToast(`Cord updated to ${btn.querySelector('strong').textContent}.`);
    });
  });

  document.querySelectorAll('#czMetalOptions .cz-option-card').forEach(btn => {
    btn.addEventListener('click', () => {
      state.metalAccent = btn.dataset.metal;
      document.querySelectorAll('#czMetalOptions .cz-option-card').forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-checked', String(b === btn));
      });
      renderAll();
      showToast(`Accent metal updated to ${btn.querySelector('strong').textContent}.`);
    });
  });

  if (els.czSpacerToggle) {
    els.czSpacerToggle.addEventListener('change', (e) => {
      state.includeSpacers = e.target.checked;
      renderAll();
      showToast(state.includeSpacers ? 'Metallic spacers added (+₹199).' : 'Metallic spacers removed.');
    });
  }

  // 5. Sizing & Wrist Fitting Listeners
  if (els.czSize) {
    els.czSize.addEventListener('change', (e) => {
      state.beadSize = +e.target.value;
      renderAll();
    });
  }
  if (els.czBeadSizePills) {
    els.czBeadSizePills.querySelectorAll('.cz-size-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.beadSize = +pill.dataset.size;
        renderAll();
      });
    });
  }

  if (els.czWristSlider) {
    els.czWristSlider.addEventListener('input', (e) => {
      state.wristCm = Math.min(23, Math.max(13, Number(e.target.value)));
      renderAll();
    });
  }

  if (els.czWristCm) {
    els.czWristCm.addEventListener('change', (e) => {
      const val = Number(e.target.value);
      if (Number.isFinite(val)) {
        state.wristCm = selectedWristUnit() === 'in' ? Math.min(23, Math.max(13, val * 2.54)) : Math.min(23, Math.max(13, val));
        renderAll();
      }
    });
  }

  document.querySelectorAll('.cz-wrist-preset').forEach((preset) => {
    preset.addEventListener('click', () => {
      state.wristCm = Number(preset.dataset.wristCm);
      state.fit = 'comfortable';
      renderAll();
    });
  });

  document.getElementById('czUnitCm')?.addEventListener('change', () => renderWrist());
  document.getElementById('czUnitIn')?.addEventListener('change', () => renderWrist());

  // Fit style pills
  document.querySelectorAll('.cz-fit-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      state.fit = pill.dataset.fit;
      renderAll();
    });
  });
  if (els.czFit) {
    els.czFit.addEventListener('change', (e) => {
      state.fit = e.target.value;
      renderAll();
    });
  }

  // 6. Search
  if (els.czGemSearch) {
    els.czGemSearch.addEventListener('input', (e) => {
      state.search = e.target.value;
      renderGemList();
    });
  }

  // 7. Arranger & Pattern Tools
  document.getElementById('czMirror')?.addEventListener('click', mirrorArrangement);
  document.getElementById('czReverse')?.addEventListener('click', reverseArrangement);
  document.getElementById('czClear')?.addEventListener('click', clearDesign);
  document.getElementById('czUndo')?.addEventListener('click', undo);
  document.getElementById('czRedo')?.addEventListener('click', redo);

  // Manual Mode Switch listener
  const manualToggle = document.getElementById('czManualModeToggle');
  if (manualToggle) {
    manualToggle.checked = state.manualArrangeMode;
    manualToggle.addEventListener('change', (e) => {
      state.manualArrangeMode = e.target.checked;
      renderStrand();
      showToast(state.manualArrangeMode ? 'Select & Arrange Manually: Activated.' : 'Automatic sequence mode.');
    });
  }

  // 8. Saved Designs Actions
  if (els.czSaveCurrentDesignBtn) {
    els.czSaveCurrentDesignBtn.addEventListener('click', openSaveModal);
  }
  els.czSaveConfirm?.addEventListener('click', () => saveCurrentDesign(els.czSaveNameInput?.value));
  els.czSaveCancel?.addEventListener('click', closeSaveModal);
  els.czSaveModal?.addEventListener('click', (e) => {
    if (e.target === els.czSaveModal) closeSaveModal();
  });
  els.czSaveNameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveCurrentDesign(els.czSaveNameInput.value);
    if (e.key === 'Escape') closeSaveModal();
  });

  document.querySelectorAll('.cz-preview-switch [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.previewSource = btn.dataset.view === 'original' ? 'original' : 'my';
      document.querySelectorAll('.cz-preview-switch [data-view]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('cz-switch-btn--active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      renderAll();
      showToast(state.previewSource === 'original' ? 'Showing the signature strand.' : 'Showing your current design.');
    });
  });

  els.czEditWristBtn?.addEventListener('click', () => {
    document.getElementById('czWristCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    els.czWristCm?.focus();
  });

  // 9. Load Saved Design or Setup Default Signature Sequence
  try {
    const s = JSON.parse(localStorage.getItem('prana_custom_design'));
    if (s && s.beads && s.beads.length > 0) {
      state.beads = s.beads;
      state.beadSize = s.beadSize || 8;
      state.wristCm = s.wrist || 17;
      state.fit = s.fit || 'comfortable';
      state.selectedCrystal = s.selectedCrystal || 'amethyst';
    } else {
      state.beads = [...SIGNATURE_STRAND];
      state.selectedCrystal = 'amethyst';
    }
  } catch (e) {
    state.beads = [...SIGNATURE_STRAND];
  }
  state.originalBeads = [...SIGNATURE_STRAND];

  history = [[...state.beads]];
  histIdx = 0;

  // Initialize Three.js 3D Studio Engine
  initThreeEngine();

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
