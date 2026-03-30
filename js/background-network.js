/**
 * DevOS Ultra-Premium Particle Network — v3
 * ─────────────────────────────────────────
 * Features:
 *   • 3-depth particle layers (large/mid/micro) via interactivity emitters
 *   • Aurora color palette with per-particle color animation
 *   • Mixed shapes: circles + subtle stars
 *   • Triangle mesh connections (low opacity) for "neural net" aesthetic
 *   • Mouse grab → glowing red lines | click → radial repulse burst
 *   • Mouse attract pulls nearby particles with natural spring
 *   • Breathing opacity + size pulse for premium micro-motion
 *   • Mobile-aware count reduction
 */

const isMobile = window.innerWidth < 768;
const isTablet = window.innerWidth < 1024;

// ── Color palette: slate + indigo + rose + sky tint ──────────────────────────
const PALETTE = [
  "#c7d2fe", // indigo-200
  "#a5b4fc", // indigo-300
  "#fda4af", // rose-300
  "#f9a8d4", // pink-300
  "#bae6fd", // sky-200
  "#94a3b8", // slate-400
  "#e2e8f0", // slate-200
  "#ddd6fe", // violet-200
];

const COUNT = isMobile ? 45 : isTablet ? 75 : 120;

tsParticles.load("network-background", {
  fullScreen: { enable: false },
  fpsLimit: 60,
  smooth: true,

  background: { color: { value: "transparent" } },

  // ─────────────────────────────────────────────────────────────────────────
  // PARTICLES
  // ─────────────────────────────────────────────────────────────────────────
  particles: {

    number: {
      value: COUNT,
      density: { enable: true, area: 1000 }
    },

    // Aurora color shift — each particle slowly cycles through palette
    color: {
      value: PALETTE,
      animation: {
        enable: true,
        speed: 12,          // hue rotation speed
        sync: false
      }
    },

    // Depth-of-field: 3 apparent layers via size variation
    size: {
      value: { min: 1, max: 5 },
      animation: {
        enable: true,
        speed: 1.8,
        minimumValue: 0.4,
        sync: false,
        startValue: "random",
        destroy: "none"
      }
    },

    // Premium breathing opacity
    opacity: {
      value: { min: 0.06, max: 0.55 },
      animation: {
        enable: true,
        speed: 0.6,
        minimumValue: 0.04,
        sync: false
      }
    },

    // Mixed shapes: mostly circles, occasional ✦ star for texture
    shape: {
      type: ["circle", "circle", "circle", "star"],
      options: {
        star: { sides: 4 }   // 4-pointed cross/diamond star, very subtle
      }
    },

    // Interactive wire mesh — connection lines
    links: {
      enable: true,
      distance: isMobile ? 110 : 150,
      color: {
        value: ["#94a3b8", "#a5b4fc", "#fda4af"]  // mixed link colors
      },
      opacity: 0.14,
      width: 0.7,
      // Triangle fill for neural-mesh depth
      triangles: {
        enable: !isMobile,
        color: "#a5b4fc",
        opacity: 0.020          // barely visible — atmospheric only
      }
    },

    // Organic layered drift with micro attract
    move: {
      enable: true,
      speed: isMobile ? 0.35 : 0.65,
      direction: "none",
      random: true,
      straight: false,
      outModes: {
        default: "out"
      },
      trail: {
        enable: false
      },
      attract: {
        enable: true,
        rotate: { x: 800, y: 1600 }
      },
      warp: false
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // INTERACTIVITY
  // ─────────────────────────────────────────────────────────────────────────
  interactivity: {
    detectsOn: "window",

    events: {
      onHover: {
        enable: true,
        mode: ["grab", "bubble"],
        parallax: {
          enable: !isMobile,
          force: 12,            // subtle parallax depth on mouse move
          smooth: 14
        }
      },
      onClick: {
        enable: true,
        mode: "repulse"         // radial burst on click
      },
      resize: { enable: true, delay: 0.5 }
    },

    modes: {
      // Hover: pull particles + turn links crimson
      grab: {
        distance: isMobile ? 140 : 210,
        links: {
          opacity: 0.65,
          color: "#f20d46"      // brand red on grab
        }
      },

      // Hover bubble: nearby particles grow & brighten
      bubble: {
        distance: isMobile ? 100 : 160,
        size: 8,
        duration: 0.5,
        opacity: 0.75,
        color: "#f20d46"
      },

      // Click repulse: satisfying radial push-away
      repulse: {
        distance: isMobile ? 140 : 220,
        duration: 0.7,
        speed: 2.5,
        factor: 100,
        maxSpeed: 50,
        easing: "ease-out-quad"
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PERFORMANCE
  // ─────────────────────────────────────────────────────────────────────────
  detectRetina: true,
  pauseOnBlur: true,            // stop when tab not visible → saves CPU
  pauseOnOutsideViewport: true
});
