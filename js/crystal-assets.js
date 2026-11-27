/**
 * PRANA ATELIER — CRYSTAL & GEMSTONE ASSET REGISTRY
 * ============================================================================
 * Centralized image mapping configuration for the PRANA Customization Studio.
 * 
 * FUTURE IMAGE INTEGRATION GUIDE:
 * ----------------------------------------------------------------------------
 * When you have new photography or renders for any crystal:
 * 1. Place the new file (JPG, PNG, WebP, or SVG) into:
 *    assets/img/crystals/ (or SVG/)
 * 2. Update the corresponding `photo` property in this registry. `photo: null`
 *    intentionally shows a labeled placeholder until a real stone photograph
 *    is available.
 * 3. The studio spotlight, selection cards, live 360° bracelet preview,
 *    flight animations, and cart will automatically display the authentic
 *    photographic crystal artwork seamlessly.
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PRANA_ASSETS = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ASSET_REGISTRY = {
    // ------------------------------------------------------------------------
    // CORE ATELIER & STUDIO ASSETS
    // ------------------------------------------------------------------------
    atelier: {
      braceletPreview: {
        id: 'braceletPreview',
        title: 'Prana Signature Bracelet Showcase',
        src: 'assets/img/Bacelet_example_prana.webp',
        alt: 'Handcrafted PRANA crystal bead bracelet example'
      },
      brandMark: {
        id: 'brandMark',
        src: 'assets/logo/mark-dark.png',
        alt: 'PRĀṆA Lotus Icon'
      }
    },

    // ------------------------------------------------------------------------
    // SIGNATURE QUARTZ TRIO (REAL PRODUCT PHOTOGRAPHS + SVG ARTWORK)
    // ------------------------------------------------------------------------
    signatureTrio: {
      amethyst: {
        id: 'amethyst',
        name: 'Amethyst',
        category: 'Quartz',
        // Real gemstone product photography (preserves natural facets, violet depth, inclusions)
        photo: 'assets/img/crystals/Amethyst.jpg',
        src: 'SVG/Amethyst.svg',
        svgSrc: 'SVG/Amethyst.svg',
        format: 'jpg',
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
        ],
        loreDisclaimer: 'Traditional cultural & historical association'
      },

      roseQuartz: {
        id: 'rose',
        name: 'Rose Quartz',
        category: 'Quartz',
        // Real gemstone product photography
        photo: 'assets/img/crystals/Rose Quartz.jpg',
        src: 'SVG/Rose Quartz.svg',
        svgSrc: 'SVG/Rose Quartz.svg',
        format: 'jpg',
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
        ],
        loreDisclaimer: 'Traditional cultural & historical association'
      },

      clearQuartz: {
        id: 'clear',
        name: 'Clear Quartz',
        category: 'Quartz',
        // Real gemstone product photography
        photo: 'assets/img/crystals/Clear Quartz.jpg',
        src: 'SVG/Clear Quartz.svg',
        svgSrc: 'SVG/Clear Quartz.svg',
        previewScale: 1.65,
        format: 'jpg',
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
        ],
        loreDisclaimer: 'Traditional cultural & historical association'
      }
    },

    // ------------------------------------------------------------------------
    // EXTENDED NATURAL GEMSTONE & MINERAL COLLECTION
    // ------------------------------------------------------------------------
    crystalCollection: {
      jade: {
        id: 'jade',
        name: 'Jade',
        category: 'Stone',
        photo: null,
        src: 'assets/img/product-sage-jade.webp',
        color: '#7FBF9A',
        gradStart: '#D1FAE5',
        gradMid: '#34D399',
        gradDeep: '#065F46',
        price: 55,
        sizes: [8, 10, 12],
        glow: '#6EE7B7'
      },
      moonstone: {
        id: 'moonstone',
        name: 'Moonstone',
        category: 'Feldspar',
        photo: null,
        src: 'assets/img/moonstone bracelet.webp',
        color: '#C9D6E8',
        gradStart: '#F0F9FF',
        gradMid: '#BAE6FD',
        gradDeep: '#334155',
        price: 65,
        sizes: [8, 10, 12],
        glow: '#BAE6FD'
      },
      tigersEye: {
        id: 'tiger',
        name: "Tiger's Eye",
        category: 'Quartz',
        photo: null,
        src: "assets/img/tiger's eye.jpg",
        color: '#B8863F',
        gradStart: '#FEF3C7',
        gradMid: '#D97706',
        gradDeep: '#451A03',
        price: 50,
        sizes: [8, 10, 12, 14],
        glow: '#F59E0B'
      },
      lapisLazuli: {
        id: 'lapis',
        name: 'Lapis Lazuli',
        category: 'Stone',
        photo: null,
        src: 'assets/img/Lapis Lazuli.jpg',
        color: '#2E408F',
        gradStart: '#DBEAFE',
        gradMid: '#2563EB',
        gradDeep: '#172554',
        price: 80,
        sizes: [10, 12, 14],
        glow: '#3B82F6'
      },
      carnelian: {
        id: 'carnelian',
        name: 'Carnelian',
        category: 'Chalcedony',
        photo: null,
        src: null,
        color: '#D97757',
        gradStart: '#FFEDD5',
        gradMid: '#EA580C',
        gradDeep: '#7C2D12',
        price: 45,
        sizes: [8, 10, 12],
        glow: '#FB923C'
      },
      blackOnyx: {
        id: 'onyx',
        name: 'Black Onyx',
        category: 'Chalcedony',
        photo: null,
        src: null,
        color: '#2B2B2B',
        gradStart: '#737373',
        gradMid: '#262626',
        gradDeep: '#0A0A0A',
        price: 40,
        sizes: [8, 10, 12, 14],
        glow: '#6B7280'
      },
      labradorite: {
        id: 'labradorite',
        name: 'Labradorite',
        category: 'Feldspar',
        photo: null,
        src: null,
        color: '#6FA8A0',
        gradStart: '#CCFBF1',
        gradMid: '#0D9488',
        gradDeep: '#115E59',
        price: 70,
        sizes: [8, 10, 12],
        glow: '#2DD4BF'
      },
      greenAventurine: {
        id: 'aventurine',
        name: 'Green Aventurine',
        category: 'Quartz',
        photo: null,
        src: null,
        color: '#6FBF73',
        gradStart: '#DCFCE7',
        gradMid: '#22C55E',
        gradDeep: '#14532D',
        price: 45,
        sizes: [8, 10, 12],
        glow: '#4ADE80'
      },
      citrine: {
        id: 'citrine',
        name: 'Citrine',
        category: 'Quartz',
        photo: null,
        src: null,
        color: '#E6C46A',
        gradStart: '#FEF9C3',
        gradMid: '#EAB308',
        gradDeep: '#713F12',
        price: 50,
        sizes: [8, 10, 12],
        glow: '#FACC15'
      },
      sodalite: {
        id: 'sodalite',
        name: 'Sodalite',
        category: 'Feldspathoid',
        photo: null,
        src: null,
        color: '#3B5F8A',
        gradStart: '#E0E7FF',
        gradMid: '#4338CA',
        gradDeep: '#1E1B4B',
        price: 45,
        sizes: [8, 10, 12],
        glow: '#818CF8'
      },
      blueLaceAgate: {
        id: 'agate',
        name: 'Blue Lace Agate',
        category: 'Chalcedony',
        photo: null,
        src: null,
        color: '#9FC5E8',
        gradStart: '#F0F9FF',
        gradMid: '#7DD3FC',
        gradDeep: '#075985',
        price: 55,
        sizes: [8, 10, 12],
        glow: '#7DD3FC'
      },
      howlite: {
        id: 'howlite',
        name: 'Howlite',
        category: 'Stone',
        photo: null,
        src: null,
        color: '#E8F0F4',
        gradStart: '#FFFFFF',
        gradMid: '#E2E8F0',
        gradDeep: '#94A3B8',
        price: 35,
        sizes: [8, 10, 12],
        glow: '#CBD5E1'
      },
      obsidian: {
        id: 'obsidian',
        name: 'Obsidian',
        category: 'Glass',
        photo: null,
        src: null,
        color: '#1A1A1A',
        gradStart: '#525252',
        gradMid: '#171717',
        gradDeep: '#000000',
        price: 45,
        sizes: [8, 10, 12, 14],
        glow: '#4B5563'
      },
      sunstone: {
        id: 'sunstone',
        name: 'Sunstone',
        category: 'Feldspar',
        photo: null,
        src: null,
        color: '#F4A460',
        gradStart: '#FFEDD5',
        gradMid: '#FB923C',
        gradDeep: '#9A3412',
        price: 75,
        sizes: [8, 10, 12],
        glow: '#FB923C'
      },
      fluorite: {
        id: 'fluorite',
        name: 'Fluorite',
        category: 'Halide',
        photo: null,
        src: null,
        color: '#A8DADC',
        gradStart: '#E0F2FE',
        gradMid: '#38BDF8',
        gradDeep: '#0369A1',
        price: 50,
        sizes: [8, 10, 12],
        glow: '#38BDF8'
      },
      rutilatedQuartz: {
        id: 'rutilated',
        name: 'Rutilated Quartz',
        category: 'Quartz',
        photo: null,
        src: null,
        color: '#D4C4A8',
        gradStart: '#FEF3C7',
        gradMid: '#CA8A04',
        gradDeep: '#78350F',
        price: 85,
        sizes: [8, 10, 12],
        glow: '#FBBF24'
      },
      turquoise: {
        id: 'turquoise',
        name: 'Turquoise',
        category: 'Phosphate',
        photo: null,
        src: null,
        color: '#4ECDC4',
        gradStart: '#CCFBF1',
        gradMid: '#14B8A6',
        gradDeep: '#134E4A',
        price: 70,
        sizes: [8, 10, 12],
        glow: '#2DD4BF'
      }
    }
  };

  ASSET_REGISTRY.getAllGems = function () {
    const list = [];
    Object.keys(ASSET_REGISTRY.signatureTrio).forEach(key => {
      const g = ASSET_REGISTRY.signatureTrio[key];
      list.push(Object.assign({ isFeatured: true, configKey: key }, g));
    });
    Object.keys(ASSET_REGISTRY.crystalCollection).forEach(key => {
      const g = ASSET_REGISTRY.crystalCollection[key];
      list.push(Object.assign({ isFeatured: false, configKey: key }, g));
    });
    return list;
  };

  ASSET_REGISTRY.getGemById = function (id) {
    const all = ASSET_REGISTRY.getAllGems();
    return all.find(g => g.id === id) || null;
  };

  return ASSET_REGISTRY;
}));
