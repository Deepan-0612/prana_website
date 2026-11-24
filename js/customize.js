/*
 * PRANA — Atelier Crystal Customization Studio
 * Premium interactive crystal bracelet studio with realistic lighting,
 * 360° rotation, particle flight animations, centralized image registry,
 * close-up macro inspector, and cultural lore tooltips.
 */

const EASE_CM = { snug: 0.5, comfortable: 1.5, loose: 2.5 };
const BASE_PRICE = 799;

// Connect to the centralized PRANA Asset Registry
function getGemRegistry() {
  if (typeof window !== 'undefined' && window.PRANA_ASSETS && typeof window.PRANA_ASSETS.getAllGems === 'function') {
    return window.PRANA_ASSETS.getAllGems();
  }
  // Fallback defaults if asset registry is loaded separately
  return [
    {
      id: 'amethyst',
      name: 'Amethyst',
      category: 'Quartz',
      src: 'SVG/Amethyst.svg',
      price: 45,
      sizes: [6, 8, 10, 12],
      glow: '#C084FC',
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
      src: 'SVG/Rose Quartz.svg',
      price: 40,
      sizes: [6, 8, 10, 12],
      glow: '#F472B6',
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
      src: 'SVG/Clear Quartz.svg',
      price: 35,
      sizes: [6, 8, 10, 12],
      glow: '#93C5FD',
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

// Studio State
let state = {
  beads: [],
  beadSize: 8,
  wristCm: 17,
  fit: 'comfortable',
  search: '',
  category: '',
  selectedCrystal: 'amethyst',
  isRotating: true,
  isMacroView: false
};

let history = [[]];
let histIdx = 0;
let activeTooltip = null;
let toastTimeout = null;

// Drag-and-drop bead rearrangement state
let dragState = {
  sourceIdx: null,
  targetIdx: null,
  selectedIdx: null,
  isDragging: false
};

function moveBead(fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= state.beads.length || toIndex >= state.beads.length) return;
  const removed = state.beads[fromIndex];
  state.beads.splice(fromIndex, 1);
  state.beads.splice(toIndex, 0, removed);
  pushHistory();
  renderAll();
  const gemName = gemById(removed).name || 'Bead';
  showToast(`Moved ${gemName} to position ${toIndex + 1}.`);
}

function attachSvgBeadEvents() {
  if (!els.czSvg) return;
  const beadEls = els.czSvg.querySelectorAll('.cz-svg-bead');
  beadEls.forEach(beadEl => {
    const idx = parseInt(beadEl.getAttribute('data-index'), 10);
    const gemId = beadEl.getAttribute('data-gem');

    beadEl.addEventListener('click', (e) => {
      e.stopPropagation();
      // If a bead was already selected for rearrangement:
      if (dragState.selectedIdx !== null) {
        if (dragState.selectedIdx === idx) {
          // Deselect
          dragState.selectedIdx = null;
          showToast('Bead rearrangement cancelled.');
        } else {
          // Move from source to this target position!
          const from = dragState.selectedIdx;
          dragState.selectedIdx = null;
          moveBead(from, idx);
          return;
        }
      } else {
        // Select this bead to move
        dragState.selectedIdx = idx;
        state.selectedCrystal = gemId;
        const g = gemById(gemId);
        showToast(`Selected bead #${idx + 1} (${g.name}). Click another bead to place it there.`);
      }
      renderAll();
    });
  });
}

// Helpers & Math
function easeCm() { return EASE_CM[state.fit] || EASE_CM.comfortable; }
function circumferenceMm() { return (state.wristCm + easeCm()) * 10; }
function recommendedCount() { return Math.max(3, Math.round(circumferenceMm() / state.beadSize)); }
function beadPrice(gemId) { const g = gems.find(x => x.id === gemId); return g ? g.price : 0; }
function beadsPrice() { return state.beads.reduce((sum, id) => sum + beadPrice(id), 0); }
function totalPrice() { return BASE_PRICE + beadsPrice(); }

function gemById(id) {
  const g = gems.find(x => x.id === id);
  if (!g) return { id, name: 'Unknown', color: '#999', price: 0, gradStart: '#eee', gradMid: '#999', gradDeep: '#444' };
  if (!g.color) {
    const fallback = { amethyst: '#9B7ED9', rose: '#E8A5B8', clear: '#D9E2F3' };
    g.color = fallback[g.id] || '#999';
  }
  return g;
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
    'czGemSearch', 'czGemList', 'czCatFilters', 'czFeaturedCrystals',
    'czSize', 'czBeadSizeLabel', 'czBeadSizePills', 'czSvg', 'czSvgContainer',
    'czCenterpiece', 'czRotateToggle', 'czRotateLabel', 'czMacroToggle',
    'czMacroLabel', 'czCount', 'czRecCount', 'czCountPill', 'czStrand',
    'czBeadsPrice', 'czTotalPrice', 'czSummary', 'czWristCm', 'czWristSlider',
    'czFit', 'czReview', 'czToast', 'czSpotlightCard'
  ];
  ids.forEach(id => { els[id] = $id(id); });
}

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/**
 * In-page Luxury Toast Notification (Replaces native browser alerts)
 */
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

/* =========================================================
   1. FEATURED QUARTZ TRIO: AMETHYST, ROSE, CLEAR QUARTZ
   ========================================================= */
function renderFeaturedTrio() {
  if (!els.czFeaturedCrystals) return;
  const trio = gems.filter(g => ['amethyst', 'rose', 'clear'].includes(g.id));

  els.czFeaturedCrystals.innerHTML = trio.map(g => {
    const countInStrand = state.beads.filter(id => id === g.id).length;
    const isSelected = state.selectedCrystal === g.id;
    const isAllowed = g.sizes.includes(state.beadSize);
    // Display realistic gemstone photograph
    const imgSrc = g.photo || g.src || g.img;

    return `
      <div class="cz-crystal-card ${isSelected ? 'cz-crystal-card--selected' : ''} ${!isAllowed ? 'cz-crystal-card--unavailable' : ''}" 
           data-id="${g.id}" 
           role="button" 
           tabindex="0" 
           aria-pressed="${isSelected}" 
           aria-label="${g.name} crystal option">
        
        <div class="cz-crystal-card__halo" style="background: radial-gradient(circle, ${g.glow}44 0%, transparent 70%);"></div>

        <div class="cz-crystal-card__media">
          <img class="cz-crystal-card__img" src="${imgSrc}" alt="${g.name} realistic gemstone" loading="eager">
          ${countInStrand > 0 ? `<span class="cz-crystal-card__badge" title="${countInStrand} on strand">×${countInStrand}</span>` : ''}
        </div>

        <div class="cz-crystal-card__info">
          <h4 class="cz-crystal-card__name">${g.name}</h4>
          <span class="cz-crystal-card__price">₹${g.price} / bead</span>
          <span class="cz-crystal-card__sizes">Sizes: ${g.sizes.join(' · ')} mm</span>
        </div>

        <button type="button" class="cz-crystal-card__action" aria-label="Add ${g.name} to bracelet">
          <span>${countInStrand > 0 ? '+ Add Another' : '+ Select & Add'}</span>
        </button>

        <!-- 5-Line Information Tooltip -->
        <div class="cz-tooltip" id="czTooltip-feat-${g.id}" role="tooltip" aria-hidden="true">
          <div class="cz-tooltip__card">
            <div class="cz-tooltip__title">${g.name}</div>
            ${(g.tooltip || []).map(line => `<div class="cz-tooltip__line">${escapeHtml(line)}</div>`).join('')}
            <div class="cz-tooltip__disclaimer">Cultural & historical association · Not medical advice</div>
          </div>
          <div class="cz-tooltip__arrow"></div>
        </div>
      </div>
    `;
  }).join('');

  attachCardEvents(els.czFeaturedCrystals, 'feat');
}

/* =========================================================
   2. EXTENDED GEMSTONE LIBRARY
   ========================================================= */
function renderGemList() {
  if (!els.czGemList) return;
  const cat = state.category;
  const q = state.search.toLowerCase();
  const filtered = gems.filter(g => {
    if (cat && g.category !== cat) return false;
    return g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
  });

  els.czGemList.innerHTML = filtered.map(g => {
    const countInStrand = state.beads.filter(id => id === g.id).length;
    const isSelected = state.selectedCrystal === g.id;
    const isAllowed = g.sizes.includes(state.beadSize);
    const imgSrc = g.photo || g.src || g.img;

    const mediaHtml = imgSrc
      ? `<img class="cz-gem__img" src="${imgSrc}" alt="${g.name}" loading="lazy">`
      : `<div class="cz-gem__swatch" style="background: radial-gradient(circle at 35% 30%, ${g.gradStart}, ${g.gradMid} 70%, ${g.gradDeep});"></div>`;

    const tooltipHtml = g.tooltip && g.tooltip.length
      ? `<div class="cz-tooltip" id="czTooltip-list-${g.id}" role="tooltip" aria-hidden="true">
          <div class="cz-tooltip__card">
            <div class="cz-tooltip__title">${g.name}</div>
            ${g.tooltip.map(line => `<div class="cz-tooltip__line">${escapeHtml(line)}</div>`).join('')}
            <div class="cz-tooltip__disclaimer">Cultural & historical association · Not medical advice</div>
          </div>
          <div class="cz-tooltip__arrow"></div>
        </div>`
      : '';

    return `
      <div class="cz-gem ${isSelected ? 'cz-gem--selected' : ''} ${countInStrand > 0 ? 'cz-gem--in-strand' : ''} ${!isAllowed ? 'cz-gem--unavailable' : ''}" 
           data-id="${g.id}" 
           role="button" 
           tabindex="0" 
           aria-pressed="${isSelected}" 
           aria-label="${g.name}">
        ${mediaHtml}
        <div class="cz-gem__meta">
          <div class="cz-gem__name">${g.name}</div>
          <div class="cz-gem__price">₹${g.price}</div>
        </div>
        ${countInStrand > 0 ? `<div class="cz-gem__badge" aria-label="${countInStrand} on strand">×${countInStrand}</div>` : ''}
        ${tooltipHtml}
      </div>
    `;
  }).join('') || '<div style="grid-column:1/-1;text-align:center;color:var(--ink-2);padding:24px;">No gemstones match your search.</div>';

  attachCardEvents(els.czGemList, 'list');
}

/* =========================================================
   3. CARD INTERACTIONS & FLYING ORB ANIMATION
   ========================================================= */
function attachCardEvents(container, prefix) {
  container.querySelectorAll('[data-id]').forEach(card => {
    const id = card.dataset.id;
    const g = gemById(id);

    const selectAndAdd = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!g.sizes.includes(state.beadSize)) {
        showToast(`${g.name} is not available in ${state.beadSize} mm size.`);
        return;
      }

      state.selectedCrystal = id;
      state.beads.push(id);
      pushHistory();

      // Launch fluid animation toward the central bracelet
      animateCrystalFly(card, g);

      renderAll();
    };

    card.addEventListener('click', selectAndAdd);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') selectAndAdd(e);
    });

    // Tooltip handling
    const tooltip = document.getElementById(`czTooltip-${prefix}-${id}`);
    if (tooltip) {
      card.addEventListener('mouseenter', () => {
        if (!isTouchDevice()) showTooltip(tooltip, card);
      });
      card.addEventListener('mouseleave', () => {
        if (!isTouchDevice()) hideTooltip(tooltip);
      });
      card.addEventListener('focus', () => showTooltip(tooltip, card));
      card.addEventListener('blur', () => hideTooltip(tooltip));

      // Mobile Touch: Long-press for tooltip, short tap for selection
      let touchStartTime = 0;
      card.addEventListener('touchstart', () => {
        touchStartTime = Date.now();
      }, { passive: true });

      card.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration > 350) {
          e.preventDefault();
          dismissActiveTooltip();
          showTooltip(tooltip, card);
          activeTooltip = tooltip;
        }
      }, { passive: false });
    }
  });
}

/**
 * Animate the selected crystal from its card position into the centerpiece bracelet
 */
function animateCrystalFly(cardEl, gem) {
  const imgEl = cardEl.querySelector('.cz-crystal-card__img, .cz-gem__img, .cz-gem__swatch');
  if (!imgEl || !els.czSvgContainer) return;

  const startRect = imgEl.getBoundingClientRect();
  const targetRect = els.czSvgContainer.getBoundingClientRect();
  const imgSrc = gem.photo || gem.src || gem.img;

  const flyer = document.createElement('div');
  flyer.className = 'cz-flying-crystal';
  
  if (imgSrc) {
    flyer.innerHTML = `<img src="${imgSrc}" alt="${gem.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    flyer.style.background = `radial-gradient(circle at 35% 30%, ${gem.gradStart}, ${gem.gradMid} 70%, ${gem.gradDeep})`;
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
      duration: 0.65,
      x: targetX - startRect.left,
      y: targetY - startRect.top,
      scale: 0.28,
      rotation: 180,
      opacity: 0.9,
      ease: 'power3.inOut',
      onComplete: () => {
        flyer.remove();
        triggerPedestalRipple(gem);
      }
    });
  } else {
    flyer.style.transition = 'all 0.65s cubic-bezier(0.25, 1, 0.5, 1)';
    requestAnimationFrame(() => {
      flyer.style.transform = `translate3d(${targetX - startRect.left}px, ${targetY - startRect.top}px, 0) scale(0.28) rotate(180deg)`;
      flyer.style.opacity = '0.9';
    });
    setTimeout(() => {
      flyer.remove();
      triggerPedestalRipple(gem);
    }, 650);
  }
}

/**
 * Ambient pulse ripple on the central pedestal when a crystal lands
 */
function triggerPedestalRipple(gem) {
  const halo = document.querySelector('.cz-pedestal__halo');
  if (halo) {
    halo.style.boxShadow = `0 0 90px 30px ${gem.glow || 'rgba(198,135,227,0.45)'}`;
    setTimeout(() => {
      halo.style.boxShadow = '';
    }, 450);
  }
}

/* =========================================================
   3B. SELECTED CRYSTAL SPOTLIGHT CARD (REAL PHOTOGRAPHIC ARTWORK)
   ========================================================= */
function renderSelectedSpotlight() {
  const container = els.czSpotlightCard || document.getElementById('czSpotlightCard');
  if (!container) return;

  const currentId = state.selectedCrystal || (state.beads.length > 0 ? state.beads[state.beads.length - 1] : 'amethyst');
  const g = gemById(currentId);
  const countInStrand = state.beads.filter(id => id === g.id).length;
  const photoSrc = g.photo || g.src || g.img;

  container.innerHTML = `
    <div class="cz-spotlight-inner" style="--spotlight-glow: ${g.glow || '#C084FC'};">
      <div class="cz-spotlight-visual">
        <div class="cz-spotlight-frame">
          <img class="cz-spotlight-img" src="${photoSrc}" alt="${g.name} natural gemstone photograph" loading="eager">
          <div class="cz-spotlight-sheen" aria-hidden="true"></div>
        </div>
        <span class="cz-spotlight-badge">${g.category}</span>
      </div>

      <div class="cz-spotlight-meta">
        <div class="cz-spotlight-header">
          <h3 class="cz-spotlight-name">${g.name}</h3>
          <span class="cz-spotlight-price">₹${g.price} <small>/ bead</small></span>
        </div>

        <div class="cz-spotlight-details">
          <div class="cz-spotlight-row">
            <span>Available Diameters:</span>
            <strong>${(g.sizes || [8]).join(', ')} mm</strong>
          </div>
          <div class="cz-spotlight-row">
            <span>Currently on Strand:</span>
            <strong>${countInStrand} ${countInStrand === 1 ? 'bead' : 'beads'}</strong>
          </div>
          <div class="cz-spotlight-row">
            <span>Active Bead Size:</span>
            <strong>${state.beadSize} mm</strong>
          </div>
        </div>

        <div class="cz-spotlight-actions">
          <button type="button" class="btn btn--solid btn--sm cz-spotlight-add" id="czSpotlightAddBtn" aria-label="Add ${g.name} to strand">
            + Add to Strand
          </button>
          ${countInStrand > 0 ? `
            <button type="button" class="btn btn--ghost btn--sm cz-spotlight-remove" id="czSpotlightRemoveBtn" aria-label="Remove one ${g.name} bead">
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

/* =========================================================
   4. CENTRAL BRACELET PREVIEW RENDERING (SVG REALISM)
   ========================================================= */
function renderSVG() {
  if (!els.czSvg) return;
  const n = state.beads.length;
  const r = circumferenceMm() / 2 / Math.PI;
  // Scaled for prominent visibility on the 880x880 canvas (~30% size increase)
  const svgR = Math.max(215, Math.min(365, r * 2.85));
  const beadR = Math.max(16, state.beadSize * 3.75);

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

      <!-- Amethyst 3D Radial Gradient -->
      <radialGradient id="grad-amethyst" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#F3E8FF" />
        <stop offset="35%" stop-color="#A855F7" />
        <stop offset="75%" stop-color="#6B21A8" />
        <stop offset="100%" stop-color="#3B0764" />
      </radialGradient>

      <!-- Rose Quartz 3D Radial Gradient -->
      <radialGradient id="grad-rose" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#FFF1F5" />
        <stop offset="35%" stop-color="#F472B6" />
        <stop offset="75%" stop-color="#DB2777" />
        <stop offset="100%" stop-color="#831843" />
      </radialGradient>

      <!-- Clear Quartz 3D Glass Radial Gradient -->
      <radialGradient id="grad-clear" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="35%" stop-color="#E0F2FE" />
        <stop offset="70%" stop-color="#BAE6FD" />
        <stop offset="100%" stop-color="#38BDF8" />
      </radialGradient>
  `;

  // Pattern definitions using real gemstone photography where available
  gems.forEach(g => {
    const photoUrl = g.photo || g.src || g.img;
    if (photoUrl) {
      // Create pattern fill with photographic gemstone texture
      defs += `
        <pattern id="pat-${g.id}" patternUnits="userSpaceOnUse" width="${beadR * 2}" height="${beadR * 2}" x="-${beadR}" y="-${beadR}">
          <image href="${photoUrl}" x="0" y="0" width="${beadR * 2}" height="${beadR * 2}" preserveAspectRatio="xMidYMid slice" />
        </pattern>
      `;
    }
  });

  // Dynamic gradients for gems as fallback/base
  gems.forEach(g => {
    defs += `
      <radialGradient id="grad-${g.id}" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="${g.gradStart || '#FFFFFF'}" />
        <stop offset="65%" stop-color="${g.gradMid || g.color}" />
        <stop offset="100%" stop-color="${g.gradDeep || '#1c0e29'}" />
      </radialGradient>
    `;
  });

  defs += `</defs>`;

  let out = defs;
  out += `
    <g id="czBraceletDisc" class="cz-bracelet-disc ${!state.isRotating ? 'is-paused' : ''}">
      <!-- Dual Layer Elastic Cord -->
      <circle cx="0" cy="0" r="${svgR}" fill="none" stroke="rgba(70,37,94,0.22)" stroke-width="4.5" stroke-dasharray="6 3" />
      <circle cx="0" cy="0" r="${svgR}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
  `;

  if (n === 0) {
    out += `
      <!-- Ghost guide loop when empty -->
      <circle cx="0" cy="0" r="${svgR}" fill="none" stroke="rgba(198,135,227,0.35)" stroke-width="2" stroke-dasharray="6 6" />
    `;
  } else {
    state.beads.forEach((id, i) => {
      const g = gemById(id);
      const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = svgR * Math.cos(ang);
      const y = svgR * Math.sin(ang);
      const isSelected = dragState.selectedIdx === i || (dragState.selectedIdx === null && state.selectedCrystal === id);
      const isReorderSource = dragState.selectedIdx === i;

      const hasPhoto = !!(g.photo || g.src || g.img);
      const beadFill = hasPhoto ? `url(#pat-${g.id})` : `url(#grad-${g.id})`;

      out += `
        <g class="cz-svg-bead ${isSelected ? 'cz-svg-bead--active' : ''} ${isReorderSource ? 'cz-svg-bead--reorder' : ''}" data-index="${i}" data-gem="${id}" filter="url(#czBeadShadow)" transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})" style="cursor: pointer;">
          <!-- Selection & Destination Highlight Ring -->
          ${isReorderSource ? `<circle cx="0" cy="0" r="${beadR + 6}" fill="none" stroke="#e6c66a" stroke-width="3" stroke-dasharray="5 3" />` : ''}

          <!-- Base spherical depth layer -->
          <circle cx="0" cy="0" r="${beadR}" fill="url(#grad-${g.id})" />

          <!-- Photographic Gemstone Sphere Fill (preserves natural textures, facets, and transparency) -->
          <circle cx="0" cy="0" r="${beadR}" fill="${beadFill}" stroke="${isReorderSource ? '#e6c66a' : 'rgba(255,255,255,0.4)'}" stroke-width="${isReorderSource ? '2.5' : '1.2'}" />

          <!-- Specular Glint Highlight -->
          <ellipse cx="${(-beadR * 0.32).toFixed(1)}" cy="${(-beadR * 0.32).toFixed(1)}" rx="${(beadR * 0.38).toFixed(1)}" ry="${(beadR * 0.24).toFixed(1)}" transform="rotate(-30, ${(-beadR * 0.32).toFixed(1)}, ${(-beadR * 0.32).toFixed(1)})" fill="url(#czSpecularShine)" />

          <!-- Secondary Bottom Rim Glow / Inner Reflection -->
          <ellipse cx="${(beadR * 0.28).toFixed(1)}" cy="${(beadR * 0.28).toFixed(1)}" rx="${(beadR * 0.28).toFixed(1)}" ry="${(beadR * 0.16).toFixed(1)}" fill="rgba(255,255,255,0.22)" />
        </g>
      `;
    });
  }

  out += `</g>`;
  els.czSvg.innerHTML = out;
  attachSvgBeadEvents();
}

/* =========================================================
   5. TOOLTIP SHOW / HIDE (SAFE SCREEN BOUNDS)
   ========================================================= */
function showTooltip(tooltip, anchor) {
  tooltip.style.position = 'fixed';
  tooltip.style.visibility = 'hidden';
  tooltip.style.opacity = '0';
  tooltip.style.display = 'block';
  tooltip.style.zIndex = '999999';

  const rect = anchor.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();

  let top = rect.top - tipRect.height - 12;
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  let arrowOnTop = false;

  if (top < 12) {
    top = rect.bottom + 12;
    arrowOnTop = true;
  }
  if (left < 12) left = 12;
  if (left + tipRect.width > window.innerWidth - 12) {
    left = window.innerWidth - tipRect.width - 12;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;

  const arrow = tooltip.querySelector('.cz-tooltip__arrow');
  if (arrow) {
    arrow.classList.toggle('cz-tooltip__arrow--top', arrowOnTop);
  }

  tooltip.style.visibility = 'visible';
  tooltip.style.opacity = '1';
  tooltip.style.transform = arrowOnTop ? 'translateY(4px)' : 'translateY(-4px)';
  tooltip.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
}

function hideTooltip(tooltip) {
  tooltip.style.opacity = '0';
  tooltip.style.visibility = 'hidden';
  tooltip.style.transform = 'translateY(0)';
}

function dismissActiveTooltip() {
  if (activeTooltip) {
    hideTooltip(activeTooltip);
    activeTooltip = null;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* =========================================================
   6. CATEGORIES & STRAND REORDERING
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
      renderGemList();
      renderCategoryFilters();
    });
  });
}

function renderStrand() {
  if (!els.czStrand) return;
  if (state.beads.length === 0) {
    els.czStrand.innerHTML = '<div class="cz-strand-empty">No beads on strand yet. Select gemstones above to begin crafting.</div>';
    return;
  }

  els.czStrand.innerHTML = state.beads.map((id, i) => {
    const g = gemById(id);
    const isDragging = dragState.isDragging && dragState.sourceIdx === i;
    const isDragOver = dragState.targetIdx === i && dragState.sourceIdx !== i;
    const isSelected = dragState.selectedIdx === i;
    return `
      <div class="cz-strand-item ${isDragging ? 'cz-strand-item--dragging' : ''} ${isDragOver ? 'cz-strand-item--drag-over' : ''} ${isSelected ? 'cz-strand-item--selected' : ''}" data-i="${i}" draggable="${isDragging ? 'false' : 'true'}">
        <div class="cz-strand__swatch" style="background: radial-gradient(circle at 35% 30%, ${g.gradStart || '#fff'}, ${g.gradMid || g.color} 70%, ${g.gradDeep || '#222'});"></div>
        <div class="cz-strand__name">${g.name}</div>
        <div class="cz-strand__price">₹${g.price}</div>
        <div class="cz-strand__ctrl">
          <button class="cz-strand__move cz-strand__up" data-move="up" ${i === 0 ? 'disabled' : ''} title="Move earlier in strand" aria-label="Move bead up">▲</button>
          <button class="cz-strand__move cz-strand__down" data-move="down" ${i === state.beads.length - 1 ? 'disabled' : ''} title="Move later in strand" aria-label="Move bead down">▼</button>
          <button class="cz-strand__rem" data-rem="${i}" title="Remove bead from strand" aria-label="Remove bead">✕</button>
        </div>
      </div>
    `;
  }).join('');

  // Desktop drag-and-drop & Click-to-reorder for strand items
  els.czStrand.querySelectorAll('.cz-strand-item').forEach((item, i) => {
    item.addEventListener('dragstart', (e) => {
      dragState.sourceIdx = i;
      dragState.isDragging = true;
      item.classList.add('cz-strand-item--dragging');
      e.dataTransfer.setData('text/plain', String(i));
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('cz-strand-item--dragging');
      dragState.isDragging = false;
      dragState.sourceIdx = null;
      dragState.targetIdx = null;
      els.czStrand.querySelectorAll('.cz-strand-item--drag-over').forEach(el => el.classList.remove('cz-strand-item--drag-over'));
      els.czStrand.querySelectorAll('.cz-strand-item--dragging').forEach(el => el.classList.remove('cz-strand-item--dragging'));
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragState.sourceIdx !== null && dragState.sourceIdx !== i) {
        if (dragState.targetIdx !== i) {
          dragState.targetIdx = i;
          els.czStrand.querySelectorAll('.cz-strand-item--drag-over').forEach(el => el.classList.remove('cz-strand-item--drag-over'));
          item.classList.add('cz-strand-item--drag-over');
        }
      }
    });

    item.addEventListener('dragleave', (e) => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove('cz-strand-item--drag-over');
        if (dragState.targetIdx === i) dragState.targetIdx = null;
      }
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('cz-strand-item--drag-over');
      const fromStr = e.dataTransfer.getData('text/plain');
      const fromIdx = fromStr !== '' ? parseInt(fromStr, 10) : dragState.sourceIdx;
      const toIdx = i;
      dragState.sourceIdx = null;
      dragState.targetIdx = null;
      dragState.isDragging = false;
      if (!isNaN(fromIdx) && fromIdx !== toIdx) {
        moveBead(fromIdx, toIdx);
      } else {
        renderAll();
      }
    });

    // Touch & Click tap-to-reorder (mobile & desktop)
    item.addEventListener('click', (e) => {
      // Don't trigger if click was on action buttons
      if (e.target.closest('.cz-strand__ctrl')) return;

      if (dragState.selectedIdx !== null) {
        if (dragState.selectedIdx === i) {
          dragState.selectedIdx = null;
          showToast('Deselected bead.');
          renderAll();
        } else {
          const from = dragState.selectedIdx;
          dragState.selectedIdx = null;
          moveBead(from, i);
        }
      } else {
        dragState.selectedIdx = i;
        state.selectedCrystal = state.beads[i];
        const g = gemById(state.beads[i]);
        showToast(`Selected bead #${i + 1} (${g.name}). Click or tap another bead to reorder.`);
        renderAll();
      }
    });
  });

  // Reorder buttons (Move Up / Down)
  els.czStrand.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.cz-strand-item');
      const i = parseInt(item.dataset.i, 10);
      const dir = btn.dataset.move;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j >= 0 && j < state.beads.length) {
        moveBead(i, j);
      }
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
        const g = gemById(removed);
        showToast(`Removed 1 ${g.name} bead.`);
      }
    });
  });
}

/* =========================================================
   7. STATS, PRICE SUMMARY & SIZING
   ========================================================= */
function renderCountsAndPrice() {
  const count = state.beads.length;
  const rec = recommendedCount();
  if (els.czCount) els.czCount.textContent = count;
  if (els.czRecCount) els.czRecCount.textContent = `Target for wrist: ${rec} beads`;
  if (els.czBeadsPrice) els.czBeadsPrice.textContent = '₹' + beadsPrice().toLocaleString('en-IN');
  if (els.czTotalPrice) els.czTotalPrice.textContent = '₹' + totalPrice().toLocaleString('en-IN');

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
        <span class="cz-summary__swatch" style="background:${g.color}"></span>
        <span class="cz-summary__title">${g.name}</span>
        <span class="cz-summary__qty">×${counts[id]}</span>
        <span class="cz-summary__price">₹${(g.price * counts[id]).toLocaleString('en-IN')}</span>
      </div>
    `;
  }).join('');

  els.czSummary.innerHTML = rows || '<div class="cz-summary-empty">No gemstones added yet</div>';
}

function renderBeadSizeSelect() {
  const avail = availableSizes();
  if (!avail.includes(state.beadSize)) state.beadSize = avail[0];

  if (els.czSize) {
    els.czSize.innerHTML = [6, 8, 10, 12, 14].map(s => {
      const isAvail = avail.includes(s);
      const label = {
        6: '6 mm — Delicate & Subtle',
        8: '8 mm — Signature Balance',
        10: '10 mm — Bold Statement',
        12: '12 mm — Prominent Luxury',
        14: '14 mm — Grand Centerpiece'
      }[s] || `${s} mm`;

      return `<option value="${s}" ${s === state.beadSize ? 'selected' : ''} ${!isAvail ? 'disabled' : ''}>${label}</option>`;
    }).join('');
  }

  // Update quick selection pills
  const pillsContainer = els.czBeadSizePills || document.getElementById('czBeadSizePills');
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
  const inVal = state.wristCm / 2.54;
  if (els.czWristCm) els.czWristCm.value = state.wristCm.toFixed(1);
  if (els.czWristSlider) els.czWristSlider.value = state.wristCm;
  const disp = document.getElementById('czWristInDisp');
  if (disp) disp.textContent = `(${inVal.toFixed(1)} in)`;
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
        <h4 class="cz-review-card__title">Atelier Specification</h4>
        <span class="cz-review-card__badge ${ok ? 'cz-review-card__badge--ok' : 'cz-review-card__badge--warn'}">
          ${ok ? '✓ Ideal Wrist Fit' : `Adjust to ${rec} beads`}
        </span>
      </div>

      <div class="cz-review-card__grid">
        <div class="cz-review-card__item"><span>Wrist:</span> <strong>${state.wristCm.toFixed(1)} cm (${(state.wristCm / 2.54).toFixed(1)}″)</strong></div>
        <div class="cz-review-card__item"><span>Fit Type:</span> <strong style="text-transform:capitalize;">${state.fit}</strong></div>
        <div class="cz-review-card__item"><span>Bead Size:</span> <strong>${state.beadSize} mm</strong></div>
        <div class="cz-review-card__item"><span>Strand Count:</span> <strong>${n} beads</strong></div>
      </div>

      <div class="cz-review-card__action">
        <button type="button" id="czAddToCart" class="btn btn--solid btn--full">
          Add Custom Bracelet to Bag · ₹${price.toLocaleString('en-IN')}
        </button>
      </div>
    </div>
  `;

  document.getElementById('czAddToCart')?.addEventListener('click', addToCart);
}

function renderRotationButton() {
  if (!els.czRotateToggle || !els.czRotateLabel) return;
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
  if (disc) {
    disc.classList.toggle('is-paused', !state.isRotating);
  }
}

function toggleMacroView() {
  state.isMacroView = !state.isMacroView;
  if (els.czSvgContainer) {
    els.czSvgContainer.classList.toggle('is-macro', state.isMacroView);
  }
  if (els.czMacroLabel) {
    els.czMacroLabel.textContent = state.isMacroView ? 'Normal View' : 'Close-up';
  }
  if (els.czMacroToggle) {
    els.czMacroToggle.classList.toggle('is-active', state.isMacroView);
  }
}

/* =========================================================
   8. MASTER RENDER ALL
   ========================================================= */
function renderAll() {
  renderSelectedSpotlight();
  renderFeaturedTrio();
  renderGemList();
  renderCategoryFilters();
  renderStrand();
  renderSVG();
  renderCountsAndPrice();
  renderSummary();
  renderBeadSizeSelect();
  renderWrist();
  renderReview();
  renderRotationButton();

  const undoBtn = document.getElementById('czUndo');
  const redoBtn = document.getElementById('czRedo');
  if (undoBtn) undoBtn.disabled = !canUndo();
  if (redoBtn) redoBtn.disabled = !canRedo();
}

function setWristCm(v) {
  state.wristCm = Math.min(23, Math.max(13, +v));
  renderAll();
}
function setBeadSize(v) {
  state.beadSize = +v;
  renderAll();
}
function setFit(v) {
  state.fit = v;
  renderAll();
}
function setSearch(v) {
  state.search = v;
  renderGemList();
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
  showToast('Bead arrangement mirrored symmetrically.');
}

function clearDesign() {
  state.beads = [];
  pushHistory();
  renderAll();
  showToast('Atelier strand reset.');
}

function undo() {
  if (canUndo()) {
    histIdx--;
    state.beads = [...history[histIdx]];
    renderAll();
  }
}

function redo() {
  if (canRedo()) {
    histIdx++;
    state.beads = [...history[histIdx]];
    renderAll();
  }
}

function addToCart() {
  const price = totalPrice();
  if (window.pranaCart && typeof window.pranaCart.add === 'function') {
    window.pranaCart.add({
      id: 'custom-bracelet',
      title: 'Custom Atelier Bracelet',
      price: price,
      img: 'assets/img/Bacelet_example_prana.webp',
      design: JSON.stringify(state.beads),
      beadSize: state.beadSize,
      wrist: state.wristCm,
      fit: state.fit,
      beadCount: state.beads.length,
    });
  } else {
    showToast(`Added Custom Bracelet (₹${price.toLocaleString('en-IN')}) to Bag!`);
  }
}

function saveDesign() {
  try {
    localStorage.setItem('prana_custom_design', JSON.stringify({
      beads: state.beads,
      beadSize: state.beadSize,
      wrist: state.wristCm,
      fit: state.fit,
      selectedCrystal: state.selectedCrystal,
    }));
    showToast('Your custom design has been saved to your browser atelier.');
  } catch (e) {
    showToast('Design saved.');
  }
}

/* =========================================================
   9. INITIALIZATION
   ========================================================= */
function init() {
  initRefs();

  // Listeners
  if (els.czSize) els.czSize.addEventListener('change', (e) => setBeadSize(e.target.value));
  if (els.czWristSlider) els.czWristSlider.addEventListener('input', (e) => setWristCm(e.target.value));
  if (els.czWristCm) els.czWristCm.addEventListener('change', (e) => setWristCm(e.target.value));
  
  document.getElementById('czUnitCm')?.addEventListener('change', () => renderWrist());
  document.getElementById('czUnitIn')?.addEventListener('change', () => renderWrist());
  
  if (els.czFit) els.czFit.addEventListener('change', (e) => setFit(e.target.value));
  if (els.czGemSearch) els.czGemSearch.addEventListener('input', (e) => setSearch(e.target.value));

  document.getElementById('czMirror')?.addEventListener('click', mirrorArrangement);
  document.getElementById('czClear')?.addEventListener('click', clearDesign);
  document.getElementById('czUndo')?.addEventListener('click', undo);
  document.getElementById('czRedo')?.addEventListener('click', redo);
  document.getElementById('czSave')?.addEventListener('click', saveDesign);
  
  if (els.czRotateToggle) {
    els.czRotateToggle.addEventListener('click', toggleRotation);
  }
  if (els.czMacroToggle) {
    els.czMacroToggle.addEventListener('click', toggleMacroView);
  }

  // Quick diameter selection pills listener
  const pillsContainer = els.czBeadSizePills || document.getElementById('czBeadSizePills');
  if (pillsContainer) {
    pillsContainer.querySelectorAll('.cz-size-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const sz = +pill.dataset.size;
        setBeadSize(sz);
      });
    });
  }

  // Dismiss tooltips on outside touch or click
  document.addEventListener('click', (e) => {
    if (activeTooltip && !e.target.closest('.cz-crystal-card, .cz-gem')) {
      dismissActiveTooltip();
    }
  });
  document.addEventListener('touchstart', (e) => {
    if (activeTooltip && !e.target.closest('.cz-crystal-card, .cz-gem')) {
      dismissActiveTooltip();
    }
  }, { passive: true });

  // Load saved design or create an inspiring signature starting bracelet
  try {
    const s = JSON.parse(localStorage.getItem('prana_custom_design'));
    if (s && s.beads && s.beads.length > 0) {
      state.beads = s.beads;
      state.beadSize = s.beadSize || 8;
      state.wristCm = s.wrist || 17;
      state.fit = s.fit || 'comfortable';
      state.selectedCrystal = s.selectedCrystal || 'amethyst';
    } else {
      // Default signature sequence: Amethyst, Rose Quartz, Clear Quartz harmony
      state.beads = [
        'amethyst', 'clear', 'rose', 'clear', 'amethyst', 'rose', 'clear',
        'amethyst', 'clear', 'rose', 'clear', 'amethyst', 'rose', 'clear',
        'amethyst', 'clear', 'rose', 'clear', 'amethyst', 'rose', 'clear'
      ];
      state.selectedCrystal = 'amethyst';
    }
  } catch (e) {
    state.beads = ['amethyst', 'clear', 'rose', 'clear', 'amethyst', 'rose', 'clear'];
  }

  history = [[...state.beads]];
  histIdx = 0;

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
