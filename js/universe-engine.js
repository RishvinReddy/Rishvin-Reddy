/**
 * Developer Universe 3D Engine — v2.0
 * ═══════════════════════════════════
 * Upgrades over v1:
 *   • Dynamic sun corona pulse + color-cycling corona rings
 *   • Shooting star system (random streaks across the sky)
 *   • Planet hover: per-planet colored emissive glow (not generic blue)
 *   • Bloom: tuned for light-mode (lower threshold, better strength)
 *   • Denser nebula clouds with per-particle color variance
 *   • Starfield: 6000 stars with size variance
 *   • Constellation lines update live in animation loop (follow moving planets)
 *   • Warp FOV pulse more dramatic (90 → 60 with lens flare feel)
 *   • Asteroid belt: 2000 asteroids, color variance (rock/metal tones)
 *   • Sun has inner + outer glow layers with opacity animation
 *   • Mobile touch support (tap to select planet)
 *   • System logs: 15+ unique messages, higher frequency
 *   • Deselect now smoothly resets emissive without flash
 */

(function () {
  if (!window.ENGINE) {
    console.error("Universe Engine requires portfolio-engine.js");
    return;
  }

  // ────────────────────────────────────────────────────────────
  // PALETTE & CONSTANTS
  // ────────────────────────────────────────────────────────────
  const COLORS = {
    bgSpace:    0x05080f,  // deep space dark
    ambient:    0x0d1117,
    starGlow:   0x8888aa,
    primary:    0xff2a5f,
    nebulaInfo: [0x4f46e5, 0xec4899, 0x06b6d4, 0x7c3aed, 0xf59e0b],
    planets: [
      { type:'terrestrial', color1:'#1e3a8a', color2:'#22c55e', color3:'#f0fdf4', emissive:'#1e40af' }, // Earth
      { type:'martian',     color1:'#9a3412', color2:'#ea580c', color3:'#fdba74', emissive:'#c2410c' }, // Mars
      { type:'gas',         color1:'#d97706', color2:'#fcd34d', color3:'#fef3c7', emissive:'#b45309' }, // Jupiter
      { type:'ice',         color1:'#0284c7', color2:'#38bdf8', color3:'#e0f2fe', emissive:'#0369a1' }, // Neptune
      { type:'terrestrial', color1:'#4c1d95', color2:'#8b5cf6', color3:'#c4b5fd', emissive:'#6d28d9' }, // Alien Purple
      { type:'gas',         color1:'#be123c', color2:'#f43f5e', color3:'#ffe4e6', emissive:'#9f1239' }, // Crimson Giant
      { type:'ice',         color1:'#064e3b', color2:'#10b981', color3:'#d1fae5', emissive:'#065f46' }, // Emerald Ice
      { type:'martian',     color1:'#78350f', color2:'#f97316', color3:'#ffedd5', emissive:'#92400e' }, // Rust
    ]
  };

  const STATE = {
    repos: null,
    planetsData: [],
    hoveredPlanet: null,
    selectedPlanet: null,
    isWarping: false,
    orbitSpeed: 0.00022,
    stargates: [],
    asteroidBelt: null,
    shootingStars: [],
    coronaPulse: 0,
    time: 0
  };

  let scene, camera, renderer, controls, composer, labelRenderer;
  let raycaster, mouse;
  let sun, sunGlow1, sunGlow2, starfield;
  let celestialGroup, constelGroup, constelLines = [];
  let langGroups = {};
  let audioCtx, masterGain, droneOscillator;
  let isAudioEnabled = false;

  // ────────────────────────────────────────────────────────────
  // INIT
  // ────────────────────────────────────────────────────────────
  async function init() {
    try {
      initAudio();
      STATE.repos = await ENGINE.getRepos();
      setupScene();
      createEnvironment();
      createPlanetarySystem(STATE.repos);
      createShootingStars();
      setupInteractions();
      buildWarpMenu();
      animate();

      setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 900);

          const bootMsgs = [
            "NEXUS OS v2.0 — ONLINE.",
            `MAPPED ${STATE.repos.length} REPOSITORIES TO SECTOR GRID.`,
            "NEURAL LINK: ESTABLISHED.",
            "QUANTUM SENSORS: CALIBRATED.",
            "ORBIT DYNAMICS: ACTIVE.",
            "CONSTELLATIONS: RENDERED."
          ];
          bootMsgs.forEach((m, i) => setTimeout(() => addSystemLog(m), i * 600));

          const bgMsgs = [
            "SCANNING NEARBY SECTORS...", "QUANTUM FLUX DETECTED.", "RE-SYNCING ORBIT DATA...",
            "BACKGROUND RADIATION: NOMINAL.", "GRAVITATIONAL ANOMALY AT SECTOR 7-G.",
            "UPDATING STAR MAP...", "REROUTING POWER TO SHIELDS.", "MONITORING WARP SIGNATURES.",
            "PINGING GITHUB API...", "DETECTING NEARBY REPOSITORIES.", "OPTIMIZING RENDER CORE.",
            "NEURAL PATHWAY SYNC: 100%.", "TRAJECTORY LOCKED.", "HYPERSPACE READY.",
            "LIFE SIGNS DETECTED IN SECTOR 4.", "DEEP SCAN: REPOSITORIES STABLE."
          ];
          setInterval(() => {
            if (Math.random() > 0.35) addSystemLog(bgMsgs[Math.floor(Math.random() * bgMsgs.length)]);
          }, 3500);
        }
      }, 600);

    } catch (err) {
      console.error("Universe init failed:", err);
      const lt = document.getElementById('loading-text');
      if (lt) lt.textContent = "SYSTEM FAULT: " + err.message;
    }
  }

  // ────────────────────────────────────────────────────────────
  // SYSTEM LOG
  // ────────────────────────────────────────────────────────────
  function addSystemLog(msg) {
    const logContainer = document.getElementById('sys-log');
    if (!logContainer) return;
    const entry = document.createElement('div');
    entry.className = 'sys-log-entry';
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const color = Math.random() > 0.85 ? 'text-amber-400' : 'text-slate-300';
    entry.innerHTML = `<span class="text-primary opacity-60">[${time}]</span> <span class="${color}">${msg}</span>`;
    logContainer.appendChild(entry);
    if (logContainer.childElementCount > 7) logContainer.removeChild(logContainer.firstChild);
  }

  // ────────────────────────────────────────────────────────────
  // SCENE SETUP
  // ────────────────────────────────────────────────────────────
  function setupScene() {
    const container = document.getElementById('universe-canvas');
    const w = window.innerWidth, h = window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bgSpace);
    scene.fog = new THREE.FogExp2(COLORS.bgSpace, 0.0010);

    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 3000);
    camera.position.set(0, 110, 260);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // PostProcessing — tuned bloom for light mode
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 1.2, 0.6, 0.15);
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // CSS2D Labels
    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(w, h);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.getElementById('label-container').appendChild(labelRenderer.domElement);

    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.maxDistance = 700;
    controls.minDistance = 15;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.08;

    // Lighting — dimmer for deep space
    scene.add(new THREE.AmbientLight(0x101520, 1.8));
    const sunLight = new THREE.PointLight(0xfff5e0, 6, 800);
    sunLight.castShadow = true;
    sunLight.shadow.bias = -0.001;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Rim light from below — cool blue tint
    const fillLight = new THREE.DirectionalLight(0x1a2a4a, 0.6);
    fillLight.position.set(0, -200, 0);
    scene.add(fillLight);

    window.addEventListener('resize', () => {
      const nw = window.innerWidth, nh = window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      composer.setSize(nw, nh);
      labelRenderer.setSize(nw, nh);
    });

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
  }

  // ────────────────────────────────────────────────────────────
  // PROCEDURAL TEXTURE
  // ────────────────────────────────────────────────────────────
  function createProceduralTexture(type, colors) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = colors.color1 || '#000';
    ctx.fillRect(0, 0, 512, 256);

    const count = type === 'sun' ? 2000 : 3500;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 512, y = Math.random() * 256;
      const r = Math.random() * 8 + 1;
      ctx.beginPath();
      if (type === 'gas' || type === 'ice') {
        ctx.ellipse(x, y, r * 12, r, 0, 0, Math.PI * 2);
        ctx.fillStyle = Math.random() > 0.5 ? colors.color2 : colors.color3;
        ctx.globalAlpha = Math.random() * 0.35 + 0.05;
      } else if (type === 'sun') {
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        const sunColors = ['#fff7c0', '#ffeb3b', '#ff9800', '#ff5722', '#ff2a5f'];
        ctx.fillStyle = sunColors[Math.floor(Math.random() * sunColors.length)];
        ctx.globalAlpha = Math.random() * 0.7 + 0.2;
      } else if (type === 'moon') {
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = Math.random() > 0.5 ? '#94a3b8' : '#475569';
        ctx.globalAlpha = Math.random() * 0.5 + 0.1;
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = Math.random() > 0.55 ? colors.color2 : colors.color3;
        ctx.globalAlpha = Math.random() * 0.5 + 0.1;
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (type === 'terrestrial') {
      for (let j = 0; j < 600; j++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 18, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.15; ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  function createRingTexture(colors) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 2;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.1, colors.color1);
    grad.addColorStop(0.45, colors.color2);
    grad.addColorStop(0.8, colors.color3);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 2);
    for (let i = 0; i < 12; i++) ctx.clearRect(Math.random() * 256, 0, Math.random() * 8, 2);
    return new THREE.CanvasTexture(canvas);
  }

  // ────────────────────────────────────────────────────────────
  // ENVIRONMENT
  // ────────────────────────────────────────────────────────────
  function createEnvironment() {
    celestialGroup = new THREE.Group();
    scene.add(celestialGroup);

    // ── Sun ──────────────────────────────────────────────────
    const sunTex = createProceduralTexture('sun', {});
    const sunGeo = new THREE.SphereGeometry(15, 64, 64);
    const sunMat = new THREE.MeshStandardMaterial({
      map: sunTex, emissiveMap: sunTex,
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0
    });
    sun = new THREE.Mesh(sunGeo, sunMat);
    celestialGroup.add(sun);

    // Inner corona glow
    sunGlow1 = new THREE.Mesh(
      new THREE.SphereGeometry(17, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending })
    );
    sun.add(sunGlow1);

    // Outer corona glow
    sunGlow2 = new THREE.Mesh(
      new THREE.SphereGeometry(22, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff2a5f, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending })
    );
    sun.add(sunGlow2);

    // Corona rings — 4 rings, different axes and speeds
    const ringColors = [0xff2a5f, 0xfbbf24, 0x818cf8, 0x34d399];
    for (let i = 0; i < 4; i++) {
      const rg = new THREE.TorusGeometry(19 + i * 3.5, 0.18, 8, 120);
      const rm = new THREE.MeshBasicMaterial({
        color: ringColors[i], transparent: true,
        opacity: 0.50 - i * 0.08, blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(rg, rm);
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      ring.rotation.y = (Math.random() - 0.5) * 1.2;
      celestialGroup.add(ring);
      STATE.stargates.push({ mesh: ring, speed: (Math.random() > 0.5 ? 1 : -1) * (0.008 + i * 0.002), mat: rm });
    }

    // ── Asteroid Belt ─────────────────────────────────────────
    const astColors = [0xaa9988, 0x887766, 0xccbbaa, 0x998877, 0x776655];
    const astGeo = new THREE.DodecahedronGeometry(0.4, 0);
    const astMat = new THREE.MeshStandardMaterial({ color: 0xaa9988, roughness: 0.9, metalness: 0.3 });
    STATE.asteroidBelt = new THREE.InstancedMesh(astGeo, astMat, 2000);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < 2000; i++) {
      const r = 28 + Math.random() * 10;
      const th = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 5;
      dummy.position.set(r * Math.cos(th), y, r * Math.sin(th));
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = Math.random() * 1.8 + 0.4;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      STATE.asteroidBelt.setMatrixAt(i, dummy.matrix);
      color.setHex(astColors[Math.floor(Math.random() * astColors.length)]);
      STATE.asteroidBelt.setColorAt(i, color);
    }
    STATE.asteroidBelt.instanceColor.needsUpdate = true;
    STATE.asteroidBelt.castShadow = true;
    celestialGroup.add(STATE.asteroidBelt);

    // ── Starfield — 6000 stars ────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starCount = 6000;
    const posArr = new Float32Array(starCount * 3);
    const colArr = new Float32Array(starCount * 3);
    const sizeArr = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const r = 220 + Math.random() * 900;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      posArr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      posArr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      posArr[i * 3 + 2] = r * Math.cos(phi);
      if (Math.random() > 0.75) {
        const c = new THREE.Color(COLORS.nebulaInfo[i % COLORS.nebulaInfo.length]);
        colArr[i * 3] = c.r; colArr[i * 3 + 1] = c.g; colArr[i * 3 + 2] = c.b;
      } else {
        colArr[i * 3] = colArr[i * 3 + 1] = colArr[i * 3 + 2] = Math.random() * 0.5 + 0.5;
      }
      sizeArr[i] = Math.random() * 2 + 0.5;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    starGeo.setAttribute('color',    new THREE.BufferAttribute(colArr, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.8, vertexColors: true, transparent: true, opacity: 0.75, sizeAttenuation: true });
    starfield = new THREE.Points(starGeo, starMat);
    scene.add(starfield);

    // ── Nebula Clouds — 160 big particles ────────────────────
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 128; cloudCanvas.height = 128;
    const ctx = cloudCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);

    const cloudGeo = new THREE.BufferGeometry();
    const cloudCount = 160;
    const cPos = new Float32Array(cloudCount * 3);
    const cCol = new Float32Array(cloudCount * 3);
    for (let i = 0; i < cloudCount; i++) {
      const r = 160 + Math.random() * 500;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      cPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      cPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      cPos[i * 3 + 2] = r * Math.cos(phi);
      const nc = new THREE.Color(COLORS.nebulaInfo[Math.floor(Math.random() * COLORS.nebulaInfo.length)]);
      cCol[i * 3] = nc.r; cCol[i * 3 + 1] = nc.g; cCol[i * 3 + 2] = nc.b;
    }
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
    cloudGeo.setAttribute('color',    new THREE.BufferAttribute(cCol, 3));
    const cloudMat = new THREE.PointsMaterial({
      size: 450, map: cloudTex, vertexColors: true,
      transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false
    });
    celestialGroup.add(new THREE.Points(cloudGeo, cloudMat));
  }

  // ────────────────────────────────────────────────────────────
  // SHOOTING STARS
  // ────────────────────────────────────────────────────────────
  function createShootingStars() {
    for (let i = 0; i < 8; i++) spawnShootingStar();
  }

  function spawnShootingStar() {
    const trailLength = 60;
    const positions = new Float32Array(trailLength * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);

    // Random start position on a sphere
    const r = 400 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const start = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    // Direction slightly inward
    const dir = start.clone().negate().normalize().multiplyScalar(1.5 + Math.random() * 2);

    const delay = Math.random() * 8000;
    STATE.shootingStars.push({ line, mat, positions, start: start.clone(), dir, progress: 0, maxProgress: trailLength, active: false, delay });

    setTimeout(() => { STATE.shootingStars[STATE.shootingStars.length - 1].active = true; }, delay);
  }

  // ────────────────────────────────────────────────────────────
  // PLANETARY SYSTEM
  // ────────────────────────────────────────────────────────────
  function createPlanetarySystem(repos) {
    if (!repos || repos.length === 0) return;

    const sortedRepos = [...repos].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
    let orbitRadius = 42;
    const orbitGap = 20;

    constelGroup = new THREE.Group();
    scene.add(constelGroup);

    sortedRepos.forEach((repo, i) => {
      const sizeBase = Math.min(Math.max((repo.size || 1000) / 3500, 2.2), 7.5);
      const pConfig = COLORS.planets[i % COLORS.planets.length];
      const pTex = createProceduralTexture(pConfig.type, pConfig);

      const geo = new THREE.SphereGeometry(sizeBase, 64, 64);
      const mat = new THREE.MeshStandardMaterial({
        map: pTex,
        roughness: pConfig.type === 'ice' || pConfig.type === 'gas' ? 0.15 : 0.85,
        metalness: 0.12,
        emissive: new THREE.Color(pConfig.emissive),
        emissiveIntensity: 0
      });
      const planet = new THREE.Mesh(geo, mat);
      planet.castShadow = true;
      planet.receiveShadow = true;

      // Rings for gas/ice
      if ((pConfig.type === 'gas' || pConfig.type === 'ice') && i % 2 === 0) {
        const ringTex = createRingTexture(pConfig);
        const ringGeo = new THREE.RingGeometry(sizeBase * 1.4, sizeBase * 2.6, 64);
        const pos = ringGeo.attributes.position, v3 = new THREE.Vector3();
        for (let j = 0; j < pos.count; j++) {
          v3.fromBufferAttribute(pos, j);
          ringGeo.attributes.uv.setXY(j, v3.length() < sizeBase * 2.0 ? 0 : 1, 0.5);
        }
        const planetRing = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
          map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.85, roughness: 0.6
        }));
        planetRing.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        planetRing.rotation.y = (Math.random() - 0.5) * 0.5;
        planet.add(planetRing);
      }

      // Position
      const angle = Math.random() * Math.PI * 2;
      planet.position.x = Math.cos(angle) * orbitRadius;
      planet.position.z = Math.sin(angle) * orbitRadius;
      planet.position.y = (Math.random() - 0.5) * 14;

      // Orbit ring
      const orbitGeo = new THREE.RingGeometry(orbitRadius - 0.15, orbitRadius + 0.15, 128);
      const orbitMat = new THREE.MeshBasicMaterial({ color: 0xaaaacc, transparent: true, opacity: 0.07, side: THREE.DoubleSide });
      const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
      orbitRing.rotation.x = Math.PI / 2;
      celestialGroup.add(orbitRing);

      // Moon
      if (repo.language) {
        const moonTex = createProceduralTexture('moon', { color1: '#94a3b8' });
        const moonGeo = new THREE.SphereGeometry(sizeBase * 0.28, 24, 24);
        const moon = new THREE.Mesh(moonGeo, new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.9, metalness: 0.1 }));
        moon.castShadow = true;
        const moonPivot = new THREE.Group();
        moon.position.x = sizeBase + 3.5;
        moonPivot.add(moon);
        planet.add(moonPivot);
        planet.userData.moonPivot = moonPivot;
      }

      // Trail
      const maxTrail = 50;
      const trailPositions = new Float32Array(maxTrail * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      const trailMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(pConfig.color2), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending
      });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      celestialGroup.add(trailLine);

      // Label
      const labelDiv = document.createElement('div');
      labelDiv.className = 'planet-label';
      labelDiv.innerHTML = `
        <span class="planet-label-name">${repo.name}</span>
        <span class="planet-label-stats">${repo.language || 'SYS'} // ★ ${repo.stargazers_count}</span>
      `;
      const planetLabel = new THREE.CSS2DObject(labelDiv);
      planetLabel.position.set(0, sizeBase + 5.5, 0);
      planet.add(planetLabel);

      planet.userData = {
        ...planet.userData,
        isPlanet: true,
        repo,
        orbitRadius,
        orbitAngle: angle,
        orbitSpeed: (Math.random() * 0.6 + 0.4) * (i % 2 === 0 ? 1 : -1),
        trailPositions,
        trailLine,
        label: labelDiv,
        emissiveColor: new THREE.Color(pConfig.emissive)
      };

      celestialGroup.add(planet);
      STATE.planetsData.push(planet);

      const lang = repo.language || 'Other';
      if (!langGroups[lang]) langGroups[lang] = [];
      langGroups[lang].push(planet);

      orbitRadius += orbitGap + Math.random() * 12;
    });

    // Constellation lines (created once, geometry updated live in animate)
    Object.keys(langGroups).forEach(lang => {
      const planets = langGroups[lang];
      if (planets.length > 1) {
        const points = planets.map(p => p.position.clone());
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x818cf8, transparent: true, opacity: 0.20, blending: THREE.AdditiveBlending
        });
        const line = new THREE.Line(lineGeo, lineMat);
        constelGroup.add(line);
        constelLines.push({ line, planets });
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // INTERACTIONS
  // ────────────────────────────────────────────────────────────
  function setupInteractions() {
    const onPointerMove = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x =  (x / window.innerWidth)  * 2 - 1;
      mouse.y = -(y / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(STATE.planetsData);

      if (hits.length > 0) {
        const obj = hits[0].object;
        if (STATE.hoveredPlanet !== obj) {
          if (STATE.hoveredPlanet) {
            STATE.hoveredPlanet.material.emissiveIntensity = 0;
            if (STATE.hoveredPlanet.userData.label) STATE.hoveredPlanet.userData.label.classList.remove('active');
          }
          STATE.hoveredPlanet = obj;
          obj.material.emissiveIntensity = 0.55; // use per-planet color
          if (obj.userData.label) obj.userData.label.classList.add('active');
          document.body.style.cursor = 'crosshair';
          playSynthTone(obj.id % 5 === 0 ? 900 : 1400, 'sine', 0.04, 0.12);
          if (Math.random() > 0.6) addSystemLog(`SIGNAL LOCKED ▸ [${obj.userData.repo.name}]`);
        }
      } else {
        if (STATE.hoveredPlanet) {
          if (!STATE.selectedPlanet || STATE.hoveredPlanet !== STATE.selectedPlanet) {
            STATE.hoveredPlanet.material.emissiveIntensity = 0;
          }
          if (STATE.hoveredPlanet.userData.label) STATE.hoveredPlanet.userData.label.classList.remove('active');
          STATE.hoveredPlanet = null;
          document.body.style.cursor = 'default';
        }
      }
    };

    const onSelect = () => {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      controls.autoRotate = false; // stop auto-rotation on user interact
      if (STATE.hoveredPlanet && !STATE.isWarping) {
        playSynthTone(220, 'square', 0.08, 0.6);
        selectPlanet(STATE.hoveredPlanet);
      } else if (!STATE.hoveredPlanet && STATE.selectedPlanet) {
        playSynthTone(150, 'sawtooth', 0.04, 0.4);
        deselectPlanet();
      }
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('click', onSelect);
    window.addEventListener('touchend', onSelect, { passive: true });

    document.getElementById('close-stats').addEventListener('click', () => {
      playSynthTone(150, 'sawtooth', 0.04, 0.4);
      deselectPlanet();
    });

    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => {
      playSynthTone(150, 'sawtooth', 0.04, 0.4);
      deselectPlanet();
    });

    const audioBtn = document.getElementById('toggle-audio');
    audioBtn.addEventListener('click', () => {
      isAudioEnabled = !isAudioEnabled;
      document.getElementById('icon-audio-off').classList.toggle('hidden', isAudioEnabled);
      document.getElementById('icon-audio-on').classList.toggle('hidden', !isAudioEnabled);
      if (isAudioEnabled) {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        startDrone();
      } else {
        stopDrone();
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // SELECT / DESELECT
  // ────────────────────────────────────────────────────────────
  function selectPlanet(planetMesh) {
    if (!planetMesh || !planetMesh.userData.repo) return;
    STATE.selectedPlanet = planetMesh;
    const repo = planetMesh.userData.repo;

    warpToPlanet(planetMesh);

    document.getElementById('planet-name').textContent = repo.name;
    document.getElementById('planet-lang').textContent = repo.language || '-';
    document.getElementById('planet-stars').textContent = repo.stargazers_count || 0;
    document.getElementById('planet-btn-repo').href = repo.html_url;

    const desc = document.getElementById('planet-desc');
    desc.textContent = repo.description || "No description provided.";

    document.getElementById('planet-btn-ai').onclick = () => {
      desc.innerHTML = `<span class="text-indigo-600 animate-pulse">Analyzing architecture...</span>`;
      setTimeout(() => {
        desc.innerHTML = `<span class="text-black">Written in ${repo.language || 'code'}. ${repo.stargazers_count} community stars. Size: ${(repo.size/1000).toFixed(1)}k units.</span>`;
      }, 1500);
    };

    document.getElementById('planet-data').classList.remove('hidden');
    const hud = document.getElementById('stats-panel');
    hud.classList.remove('opacity-0', 'translate-x-8', 'pointer-events-none');
    hud.classList.add('opacity-100', 'translate-x-0', 'pointer-events-auto');

    // Matrix decrypt effect on description
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    const targetDesc = repo.description || "No description provided.";
    let iter = 0;
    desc.innerText = targetDesc.split("").map(() => letters[Math.floor(Math.random() * 42)]).join("");
    const interval = setInterval(() => {
      desc.innerText = desc.innerText.split("").map((l, idx) => idx < iter ? targetDesc[idx] : letters[Math.floor(Math.random() * 42)]).join("");
      if (iter++ >= targetDesc.length) { clearInterval(interval); desc.textContent = targetDesc; }
    }, 18);

    // Modal
    const modal = document.getElementById('planet-modal');
    if (modal) {
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.classList.add('opacity-100', 'pointer-events-auto');
      document.getElementById('planet-modal-content')?.classList.replace('scale-95', 'scale-100');

      document.getElementById('modal-title').textContent = repo.name;
      document.getElementById('modal-title').onclick = () => window.open(repo.html_url, '_blank');
      document.getElementById('modal-desc').textContent = repo.description || "No description provided.";
      document.getElementById('modal-lang').textContent = repo.language || "SYS";
      document.getElementById('modal-stars').textContent = repo.stargazers_count || 0;
      document.getElementById('modal-btn-github').href = repo.html_url;
      document.getElementById('modal-btn-ide').href = `IDE.html?repo=${repo.name}`;

      const readmeContainer = document.getElementById('modal-readme');
      readmeContainer.innerHTML = '<div class="flex justify-center items-center h-48"><div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>';
      if (window.ENGINE && window.marked) {
        window.ENGINE.fetchReadme(repo.name).then(readme => {
          readmeContainer.innerHTML = readme
            ? window.marked.parse(readme)
            : '<div class="text-center text-slate-500 italic py-10">No README.md found.</div>';
        }).catch(() => {
          readmeContainer.innerHTML = '<div class="text-center text-red-500 italic py-10">Failed to load repository data.</div>';
        });
      }
    }
  }

  function deselectPlanet() {
    if (STATE.selectedPlanet) {
      STATE.selectedPlanet.material.emissiveIntensity = 0;
      STATE.selectedPlanet = null;
    }

    const hud = document.getElementById('stats-panel');
    hud.classList.add('opacity-0', 'translate-x-8', 'pointer-events-none');
    hud.classList.remove('opacity-100', 'translate-x-0', 'pointer-events-auto');

    const modal = document.getElementById('planet-modal');
    if (modal) {
      modal.classList.add('opacity-0', 'pointer-events-none');
      modal.classList.remove('opacity-100', 'pointer-events-auto');
      document.getElementById('planet-modal-content')?.classList.replace('scale-100', 'scale-95');
    }

    setTimeout(() => {
      document.getElementById('planet-name').textContent = "Universe Overview";
      document.getElementById('planet-desc').textContent = "Drag to orbit. Scroll to zoom. Click a planet to view intelligence data.";
      document.getElementById('planet-data').classList.add('hidden');
    }, 300);

    warpToOverview();
    controls.autoRotate = true;
  }

  // ────────────────────────────────────────────────────────────
  // WARP
  // ────────────────────────────────────────────────────────────
  function warpToPlanet(planet) {
    if (!planet) return;
    STATE.isWarping = true;
    const repo = planet.userData.repo;
    addSystemLog(`⚡ WARP JUMP ▸ [${repo.name}]`);

    const targetPos = new THREE.Vector3();
    planet.getWorldPosition(targetPos);
    const offset = new THREE.Vector3(18, 12, 24);
    const camTarget = targetPos.clone().add(offset);

    // Dramatic FOV squeeze
    gsap.to(camera, { fov: 95, duration: 0.4, ease: "power3.in", onUpdate: () => camera.updateProjectionMatrix(),
      onComplete: () => gsap.to(camera, { fov: 60, duration: 1.2, ease: "power2.out", onUpdate: () => camera.updateProjectionMatrix() })
    });

    gsap.to(camera.position, { x: camTarget.x, y: camTarget.y, z: camTarget.z, duration: 1.6, ease: "power3.inOut" });
    gsap.to(controls.target, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration: 1.6, ease: "power3.inOut",
      onComplete: () => { STATE.isWarping = false; }
    });
  }

  function warpToOverview() {
    STATE.isWarping = true;
    addSystemLog("RETURNING TO WIDE SURVEILLANCE ORBIT.");

    gsap.to(camera, { fov: 78, duration: 0.7, ease: "power2.inOut", onUpdate: () => camera.updateProjectionMatrix(),
      onComplete: () => gsap.to(camera, { fov: 60, duration: 1.4, ease: "power2.out", onUpdate: () => camera.updateProjectionMatrix() })
    });

    gsap.to(camera.position, { x: 0, y: 110, z: 260, duration: 2.2, ease: "power2.inOut" });
    gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 2.2, ease: "power2.inOut",
      onComplete: () => { STATE.isWarping = false; }
    });
  }

  // ────────────────────────────────────────────────────────────
  // WARP MENU
  // ────────────────────────────────────────────────────────────
  function buildWarpMenu() {
    const list = document.getElementById('warp-list');
    if (!list || !STATE.repos) return;
    const topRepos = [...STATE.repos].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 12);
    topRepos.forEach(repo => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:text-black hover:bg-black/5 transition-colors truncate flex items-center gap-2 border-b border-black/5';
      btn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>${repo.name}`;
      btn.onclick = () => {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        playSynthTone(220, 'square', 0.08, 0.6);
        const planet = STATE.planetsData.find(p => p.userData.repo.id === repo.id);
        if (planet) selectPlanet(planet);
      };
      list.appendChild(btn);
    });
  }

  // ────────────────────────────────────────────────────────────
  // AUDIO
  // ────────────────────────────────────────────────────────────
  function initAudio() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      masterGain.gain.value = 0.25;
    } catch (e) { console.warn('Web Audio API not supported'); }
  }

  function playSynthTone(freq, type, vol, dur) {
    if (!isAudioEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
  }

  function startDrone() {
    if (!isAudioEnabled || !audioCtx || droneOscillator) return;
    droneOscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    droneOscillator.type = 'sine'; droneOscillator.frequency.value = 55;
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 2);
    droneOscillator.connect(gain); gain.connect(masterGain);
    droneOscillator.start();
    droneOscillator._gainNode = gain;
  }

  function stopDrone() {
    if (!droneOscillator) return;
    droneOscillator._gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 1);
    droneOscillator.stop(audioCtx.currentTime + 1);
    droneOscillator = null;
  }

  // ────────────────────────────────────────────────────────────
  // ANIMATE
  // ────────────────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    STATE.time += 0.016;

    // Slow starfield drift
    if (starfield) starfield.rotation.y -= 0.00008;
    if (sun) sun.rotation.y += 0.004;

    // Sun corona pulse
    STATE.coronaPulse += 0.025;
    const pulse = Math.sin(STATE.coronaPulse) * 0.5 + 0.5;
    if (sunGlow1) { sunGlow1.material.opacity = 0.12 + pulse * 0.10; sunGlow1.scale.setScalar(1 + pulse * 0.04); }
    if (sunGlow2) { sunGlow2.material.opacity = 0.04 + pulse * 0.05; sunGlow2.scale.setScalar(1 + pulse * 0.08); }

    // Corona ring rotation
    STATE.stargates.forEach((gate, idx) => {
      gate.mesh.rotation.z += gate.speed;
      gate.mesh.rotation.x += gate.speed * 0.18;
      // Color cycle
      gate.mat.opacity = (0.45 - idx * 0.08) + Math.sin(STATE.time + idx) * 0.06;
    });

    // Asteroid belt
    if (STATE.asteroidBelt) STATE.asteroidBelt.rotation.y += 0.0008;

    // Planets orbit + trail + moon
    STATE.planetsData.forEach(planet => {
      const data = planet.userData;
      data.orbitAngle += STATE.orbitSpeed * data.orbitSpeed;
      planet.position.x = Math.cos(data.orbitAngle) * data.orbitRadius;
      planet.position.z = Math.sin(data.orbitAngle) * data.orbitRadius;
      planet.rotation.y += 0.008;

      // Trail positions shift
      const max = data.trailPositions.length / 3;
      for (let j = max - 1; j > 0; j--) {
        data.trailPositions[j * 3]     = data.trailPositions[(j - 1) * 3];
        data.trailPositions[j * 3 + 1] = data.trailPositions[(j - 1) * 3 + 1];
        data.trailPositions[j * 3 + 2] = data.trailPositions[(j - 1) * 3 + 2];
      }
      data.trailPositions[0] = planet.position.x;
      data.trailPositions[1] = planet.position.y;
      data.trailPositions[2] = planet.position.z;
      data.trailLine.geometry.attributes.position.needsUpdate = true;

      if (data.moonPivot) data.moonPivot.rotation.y += 0.022;
    });

    // Live constellation line update (follow moving planets)
    constelLines.forEach(({ line, planets }) => {
      const points = planets.map(p => p.position);
      const posAttr = line.geometry.attributes.position;
      points.forEach((pt, i) => {
        posAttr.setXYZ(i, pt.x, pt.y, pt.z);
      });
      posAttr.needsUpdate = true;
    });

    // Lock camera to selected planet during orbit
    if (STATE.selectedPlanet && !STATE.isWarping) {
      const tp = new THREE.Vector3();
      STATE.selectedPlanet.getWorldPosition(tp);
      controls.target.copy(tp);
    }

    // Shooting stars
    STATE.shootingStars.forEach(ss => {
      if (!ss.active) return;
      ss.progress = Math.min(ss.progress + 1.5, ss.maxProgress);
      const posAttr = ss.line.geometry.attributes.position;
      for (let j = 0; j < ss.maxProgress; j++) {
        const t = j / ss.maxProgress;
        const fade = Math.max(0, 1 - j / ss.maxProgress);
        posAttr.setXYZ(j,
          ss.start.x + ss.dir.x * ss.progress * (1 - t),
          ss.start.y + ss.dir.y * ss.progress * (1 - t),
          ss.start.z + ss.dir.z * ss.progress * (1 - t)
        );
      }
      posAttr.needsUpdate = true;
      ss.mat.opacity = Math.min(ss.progress / 10, 0.9);
      if (ss.progress >= ss.maxProgress) {
        ss.mat.opacity = 0;
        ss.active = false;
        ss.progress = 0;
        // Respawn with new random position after delay
        setTimeout(() => {
          const r = 400 + Math.random() * 200;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          ss.start.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
          ss.dir = ss.start.clone().negate().normalize().multiplyScalar(1.5 + Math.random() * 2);
          ss.active = true;
        }, 4000 + Math.random() * 10000);
      }
    });

    controls.update();
    composer.render();
    if (labelRenderer) labelRenderer.render(scene, camera);
  }

  // ── Boot ──────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
