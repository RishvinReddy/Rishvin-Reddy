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

const COUNT = isMobile ? 50 : isTablet ? 90 : 160;

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

    // Mixed shapes: mostly circles, bright stars, and premium polygons
    shape: {
      type: ["circle", "circle", "star", "triangle", "polygon"],
      options: {
        star: { sides: 5 },
        triangle: { sides: 3 },
        polygon: { sides: 6 } // Hexagons for a cyber/tech look
      }
    },

    // Ultra-premium glowing shadow effect for Web3/Sci-Fi aesthetics
    shadow: {
      enable: true,
      color: "#60a5fa", // brighter blue glow
      blur: 18,         // larger bloom
      offset: { x: 0, y: 0 }
    },
    
    // Twinkle effect gives an organic, magical starlight vibe
    twinkle: {
      particles: { 
        enable: true, 
        frequency: 0.05, 
        opacity: 1 
      },
      lines: { 
        enable: true, 
        frequency: 0.01, 
        opacity: 0.8 
      }
    },

    // Interactive wire mesh — connection lines
    links: {
      enable: true,
      distance: isMobile ? 120 : 160,
      color: {
        value: ["#818cf8", "#f472b6", "#38bdf8"]  // highly vivid mixed links
      },
      opacity: 0.25,
      width: 1.2,
      // Triangle fill for neural-mesh depth
      triangles: {
        enable: !isMobile,
        color: "#c084fc",
        opacity: 0.04          // Increased atmospheric triangle density
      }
    },

    // Organic layered drift with micro attract and bounce
    move: {
      enable: true,
      speed: isMobile ? 0.4 : 0.8,
      direction: "none",
      random: true,
      straight: false,
      outModes: {
        default: "bounce" // Bouncing keeps the core denser and more active
      },
      trail: {
        enable: false
      },
      attract: {
        enable: true,
        rotate: { x: 800, y: 1600 }
      },
      warp: false
    },
    
    // True multi-layered depth for premium 3D network parallax
    zIndex: {
      value: { min: -100, max: 100 },
      opacityRate: 0.35,  // Deeper layers fade slightly into the atmospheric background
      sizeRate: 0.7,      // Deeper particles appear smaller
      velocityRate: 0.4   // Deeper particles drift much slower
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
        mode: ["grab", "bubble", "slow"],
        parallax: {
          enable: !isMobile,
          force: 25,            // stronger parallax depth on mouse move
          smooth: 10
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
        size: 9,
        duration: 0.4,
        opacity: 0.9,
        color: "#f20d46"
      },

      // Slow down particles near the mouse for an organic, cinematic feel
      slow: {
        factor: 3,
        radius: 150
      },

      // Click repulse: satisfying radial push-away
      repulse: {
        distance: isMobile ? 160 : 250,
        duration: 0.8,
        speed: 3,
        factor: 120,
        maxSpeed: 60,
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
