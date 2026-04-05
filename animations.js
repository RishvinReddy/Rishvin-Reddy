(function () {
  // Global interaction script for mouse and keyboard events
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) return;

  const DEBOUNCE_MS = 60;
  let lastMove = 0;

  function nearestAnimTarget(el) {
    while (el && el !== document.documentElement) {
      if (el.hasAttribute && (el.hasAttribute('data-anim') || el.classList && el.classList.contains('animatable'))) return el;
      el = el.parentNode;
    }
    return null;
  }

  function addTempClass(el, cls, duration = 300) {
    if (!el) return;
    if (el.hasAttribute && el.hasAttribute('data-no-anim')) return;
    el.classList.add(cls, 'anim-interaction');
    clearTimeout(el.__anim_timeout && el.__anim_timeout[cls]);
    const t = setTimeout(() => {
      el.classList.remove(cls);
      if (![...el.classList].some(c => c.startsWith('is-') || c === 'key-active' || c === 'key-flash')) {
        el.classList.remove('anim-interaction');
      }
    }, duration);
    el.__anim_timeout = el.__anim_timeout || {};
    el.__anim_timeout[cls] = t;
  }

  // Basic Interactions
  document.addEventListener('mouseover', e => { const t = nearestAnimTarget(e.target); if (t) addTempClass(t, 'is-hover', 2500); }, { passive: true });
  document.addEventListener('mouseout', e => { const t = nearestAnimTarget(e.target); if (t) t.classList.remove('is-hover'); }, { passive: true });
  document.addEventListener('mousedown', e => { const t = nearestAnimTarget(e.target); if (t) addTempClass(t, 'is-press', 180); }, { passive: true });
  document.addEventListener('mouseup', e => { const t = nearestAnimTarget(e.target); if (t) addTempClass(t, 'is-click', 380); }, { passive: true });
  document.addEventListener('click', e => { const t = nearestAnimTarget(e.target); if (t) addTempClass(t, 'is-click', 380); }, { passive: true });
  
  let keyboardActive = false;
  function setKeyboardActive(val) {
    keyboardActive = val;
    if (val) document.documentElement.classList.add('keyboard-focus-visible');
    else document.documentElement.classList.remove('keyboard-focus-visible');
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Tab') setKeyboardActive(true);
    const target = document.activeElement && nearestAnimTarget(document.activeElement);
    if (target) addTempClass(target, 'key-active', 600);
    if (document.activeElement) addTempClass(document.activeElement, 'key-flash', 300);
    
    // ESC to close any open modals
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('[role="dialog"]:not([aria-hidden="true"])');
      openModals.forEach(m => {
        const closeBtn = m.querySelector('.close-btn, [aria-label="Close"]');
        if (closeBtn) closeBtn.click();
        else m.classList.add('hidden');
      });
    }
  }, { passive: true });

  document.addEventListener('keyup', e => { if (e.key === 'Tab') setTimeout(() => setKeyboardActive(false), 600); }, { passive: true });

  // Expose API
  window.AnimInteractions = {
    mark(el) { el && el.classList.add('animatable'); },
    unmark(el) { el && el.classList.remove('animatable'); },
    trigger(el, cls, ms) { addTempClass(el, cls, ms); }
  };

  document.addEventListener('DOMContentLoaded', () => {

    /* --- UNIVERSAL MOBILE MENU LOGIC --- */
    if (!window.__mobileMenuSetup) {
      window.__mobileMenuSetup = true;
      const mobileToggle = document.getElementById('mobileToggle');
      const mobileMenu = document.getElementById('mobileMenu');
      
      const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
      const isAbout = window.location.pathname.endsWith('About_page.html');
      
      if (mobileToggle && mobileMenu && !isIndex && !isAbout) {
        let mobileOpen = false;
        const setMobile = (open) => {
          mobileOpen = !!open;
          if (mobileOpen) {
            mobileMenu.classList.remove('invisible', 'opacity-0', 'scale-95');
            mobileMenu.classList.add('visible', 'opacity-100', 'scale-100');
          } else {
            mobileMenu.classList.add('invisible', 'opacity-0', 'scale-95');
            mobileMenu.classList.remove('visible', 'opacity-100', 'scale-100');
          }
          mobileToggle.setAttribute('aria-expanded', String(mobileOpen));
        };

        mobileToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          setMobile(!mobileOpen);
        });

        document.addEventListener('click', (e) => {
          if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) setMobile(false);
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', () => setMobile(false));
        });
      }
    }

    // Register GSAP ScrollTrigger (Keep for hover animations/cursor if gsap is present)
    if (typeof gsap !== 'undefined') {
      gsap.config({ nullTargetWarn: false });

      /* --- GSAP ANIMATIONS --- */
      
      // Page Enter
      gsap.fromTo("body", { opacity: 0 }, { opacity: 1, duration: 1, ease: "power2.out" });

      const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
      
      if (isIndexPage) {
        // --- Premium Hero Animation Timeline ---
        const heroTl = gsap.timeline({ defaults: { ease: "expo.out" } });
        
        // H1 Title 3D Reveal
        heroTl.fromTo("h1", 
          { y: 80, opacity: 0, rotateX: -20, transformPerspective: 800 }, 
          { y: 0, opacity: 1, rotateX: 0, duration: 1.5 }, 0.2
        )
        // Intro Paragraph fade & slide
        .fromTo("h1 + p", 
          { y: 40, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 1.2, ease: "power3.out" }, 0.5
        )
        // Buttons stagger
        .fromTo(".magnetic-btn", 
          { y: 30, opacity: 0, scale: 0.9 }, 
          { y: 0, opacity: 1, scale: 1, duration: 1, stagger: 0.15, ease: "back.out(1.5)" }, 0.7
        )
        // Tech Stack Marquee blur reveal
        .fromTo(".marquee-container", 
          { opacity: 0, filter: "blur(10px)" }, 
          { opacity: 0.7, filter: "blur(0px)", duration: 1.2, ease: "power2.out" }, 0.9
        )
        // Profile Image / 3D Tilt Card reveal
        .fromTo(".tilt-card", 
          { scale: 0.8, opacity: 0, rotateY: 45, x: 50, transformPerspective: 1000 }, 
          { scale: 1, opacity: 1, rotateY: 0, x: 0, duration: 2, ease: "expo.out" }, 0.4
        );

        // Continuous subtle float for glowing blobs
        gsap.to(".animate-blob", {
           y: "25px", x: "-15px", rotation: 10,
           duration: 5, yoyo: true, repeat: -1,
           ease: "sine.inOut", stagger: { each: 1.5, from: "random" }
        });
      }
    } else {
      // Fallback if GSAP is blocked/missing
      document.body.classList.add('page-enter');
    }

    // Native Intersection Observer for Scroll Reveals (High Performance)
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
            observer.unobserve(entry.target); 
        }
      });
    }, observerOptions);

    // Helper to observe an element
    const observeElement = (el) => {
      if (!el.classList.contains('scroll-reveal-native')) {
        el.classList.add('scroll-reveal-native');
        scrollObserver.observe(el);
      }
    };

    // 1. Initial observation for existing components
    document.querySelectorAll('h2, h3:not(#modalTitle), .scroll-reveal').forEach(observeElement);

    // 2. MutationObserver for dynamically injected elements (e.g., from portfolio-engine.js)
    const domObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // ELEMENT_NODE
            // Check the node itself
            if (node.matches && node.matches('h2, h3:not(#modalTitle), .scroll-reveal')) {
              observeElement(node);
            }
            // Check its children
            if (node.querySelectorAll) {
              node.querySelectorAll('h2, h3:not(#modalTitle), .scroll-reveal').forEach(observeElement);
            }
          }
        });
      });
    });

    domObserver.observe(document.body, { childList: true, subtree: true });

    // Native Scroll Progress Bar
    const progressBar = document.createElement('div');
    progressBar.classList.add('scroll-progress');
    progressBar.style.position = 'fixed';
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.height = '4px';
    progressBar.style.background = 'var(--primary, #f20d46)';
    progressBar.style.zIndex = '99999';
    progressBar.style.width = '0%';
    progressBar.style.transition = 'width 0.1s ease-out';
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + '%';
    }, { passive: true });

    /* --- JS Custom Cursor has been removed for native UI --- */

    /* --- GSAP MAGNETIC BUTTONS & TEXT --- */
    if (typeof gsap !== 'undefined') {
      const magnetics = document.querySelectorAll('.magnetic-btn, .magnetic-text');
      magnetics.forEach(btn => {
        const span = btn.querySelector('span') || btn; // Target inner span if exists
        
        btn.addEventListener('mousemove', (e) => {
          const rect = btn.getBoundingClientRect();
          const x = (e.clientX - rect.left - rect.width / 2) * 0.4;
          const y = (e.clientY - rect.top - rect.height / 2) * 0.4;
          
          gsap.to(btn, { x: x, y: y, duration: 0.6, ease: "power3.out" });
          if(btn !== span) gsap.to(span, { x: x*0.5, y: y*0.5, duration: 0.6, ease: "power3.out" });
        });

        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
          if(btn !== span) gsap.to(span, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
        });
      });
      
      /* --- GSAP MOUSE PARALLAX (Backgrounds) --- */
      document.addEventListener('mousemove', (e) => {
        if (REDUCED) return;
        const x = (window.innerWidth / 2 - e.clientX) / 50;
        const y = (window.innerHeight / 2 - e.clientY) / 50;

        gsap.to('.parallax-layer', {
          x: x, y: y, duration: 1, ease: "power2.out"
        });
        
        // Also subtle parallax on background blobs
        gsap.to('.animate-blob', {
          x: x * -1.5, y: y * -1.5, duration: 2, ease: "power1.out"
        });
      });
    }


    /* --- 3D CARD TILT (Kept mostly native for explicit 3D transform) --- */
    const tiltCards = document.querySelectorAll('.tilt-card, .hover-card-3d');
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        
        if (typeof gsap !== 'undefined') {
          gsap.to(card, { rotationX: rotateX, rotationY: rotateY, duration: 0.5, ease: "power2.out", transformPerspective: 1000 });
        } else {
          card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        if (typeof gsap !== 'undefined') {
          gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.8, ease: "power2.out" });
        } else {
          card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        }
      });
    });

    /* --- GLOBAL CLICK RIPPLE --- */
    document.addEventListener('click', function (e) {
      const circle = document.createElement('div');
      circle.style.width = circle.style.height = '30px';
      circle.style.left = `${e.clientX - 15}px`;
      circle.style.top = `${e.clientY - 15}px`;
      circle.style.position = 'fixed';
      circle.style.borderRadius = '50%';
      circle.style.pointerEvents = 'none';
      circle.style.backgroundColor = 'rgba(242, 13, 70, 0.4)'; // Primary color
      circle.style.zIndex = '9999';
      circle.style.transform = 'scale(0)';
      circle.style.opacity = '1';
      document.body.appendChild(circle);

      if (typeof gsap !== 'undefined') {
        gsap.to(circle, {
          scale: 4,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => circle.remove()
        });
      } else {
        setTimeout(() => circle.remove(), 600);
      }
    });

    /* --- MOUSE SPOTLIGHT (Glow Cards) --- */
    const spotlightCards = document.querySelectorAll('.project-card, .feature-card, .glass-card, .glass-card-dark');
    document.addEventListener('mousemove', (e) => {
      spotlightCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
    // Ensure the class exists for the CSS to work
    spotlightCards.forEach(c => c.classList.add('spotlight-card'));

    /* --- TEXT SCRAMBLE EFFECT --- */
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    const headings = document.querySelectorAll('.scramble-enabled');

    headings.forEach(h => {
      h.dataset.value = h.textContent;
      h.addEventListener('mouseover', event => {
        let iterations = 0;
        const originalText = event.target.dataset.value;
        const interval = setInterval(() => {
          event.target.textContent = originalText.split("").map((letter, index) => {
            if (index < iterations) {
              return originalText[index];
            }
            return letters[Math.floor(Math.random() * 26)];
          }).join("");
          if (iterations >= originalText.length) clearInterval(interval);
          iterations += 1 / 3;
        }, 30);
      });
    });

    /* --- LATEST GITHUB REPO IN FOOTER --- */
    const currentlyBuildingLabels = document.querySelectorAll('p');
    currentlyBuildingLabels.forEach(p => {
      if (p.textContent.trim() === 'Currently Building') {
        const container = p.parentElement;
        if (container && container.children.length >= 3) {
          const titleP = container.children[1];
          const descP = container.children[2];
          
          fetch('https://api.github.com/users/RishvinReddy/repos?sort=updated&per_page=1')
            .then(res => res.json())
            .then(data => {
              if (data && data.length > 0) {
                const repo = data[0];
                const safeDesc = repo.language ? repo.language : (repo.description ? (repo.description.length > 35 ? repo.description.substring(0, 35) + '...' : repo.description) : 'GitHub Repository');
                titleP.innerHTML = `<a href="${repo.html_url}" target="_blank" class="hover:text-primary transition-colors flex items-center gap-2" title="View on GitHub"><span class="w-2 h-2 rounded-full bg-primary animate-pulse inline-block"></span>${repo.name}</a>`;
                descP.textContent = safeDesc;
              }
            })
            .catch(err => console.error('Failed to fetch latest github repo', err));
        }
      }
    });

  });
})();
