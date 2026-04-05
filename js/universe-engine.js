/**
 * Developer Universe 3D Engine (Three.js)
 * Transforms GitHub repositories into a WebGL solar system.
 */

(function () {
  // Wait for the Portfolio Engine to be ready
  if (!window.ENGINE) {
    console.error("Universe Engine requires portfolio-engine.js");
    return;
  }

  // Define Galaxy Colors & Palettes
  const COLORS = {
    star: 0x1f2937,      // Dark Gray star for Light Mode compatibility
    starGlow: 0xd1d5db,  // Less intense glow 
    bgSpace: 0xf9fafb,   // Soft White Background
    ambient: 0xf3f4f6,   // Very bright ambient light in light mode
    planets: [
      { type: 'terrestrial', color1: '#1e3a8a', color2: '#22c55e', color3: '#f0fdf4' }, // Earth-like
      { type: 'martian', color1: '#9a3412', color2: '#ea580c', color3: '#fdba74' },     // Mars-like
      { type: 'gas', color1: '#d97706', color2: '#fcd34d', color3: '#fef3c7' },         // Jupiter-like
      { type: 'ice', color1: '#0284c7', color2: '#38bdf8', color3: '#e0f2fe' },         // Neptune-like
      { type: 'terrestrial', color1: '#4c1d95', color2: '#8b5cf6', color3: '#c4b5fd' }, // Alien Purple
      { type: 'gas', color1: '#be123c', color2: '#f43f5e', color3: '#ffe4e6' }          // Crimson Giant
    ],
    moon: '#e2e8f0', // Slate 200
    primary: 0xff2a5f,
    nebulaInfo: [0x4f46e5, 0xec4899, 0x06b6d4]
  };

  // State Context
  const STATE = {
    repos: null,
    planetsData: [],     // Maps Object3D uuids to repo data
    hoveredPlanet: null,
    selectedPlanet: null,
    isWarping: false,
    orbitSpeed: 0.0002,
    stargates: [],
    asteroidBelt: null
  };

  // Three.js Core Globals
  let scene, camera, renderer, controls, composer, labelRenderer;
  let raycaster, mouse;
  let sun, starfield;
  let celestialGroup; // Group holding all planets/moons
  let constelGroup; // Group for glowing line connections
  let animationRef;
  
  // Audio Engine State
  let audioCtx, masterGain;
  let isAudioEnabled = false;

  async function init() {
    try {
      // 0. Initialize Audio Engine (user interaction needed to unlock context later)
      initAudio();

      // 1. Fetch data from GitHub via existing Portfolio Engine
      STATE.repos = await ENGINE.getRepos();
      
      // 2. Setup Three.js Scene & CSS2DRenderer
      setupScene();
      
      // 3. Populate standard celestial bodies (The Sun & Background)
      createEnvironment();
      
      // 4. Create the Planet System (Repos) & Constellations
      createPlanetarySystem(STATE.repos);
      
      // 5. Setup Interactions (Raycasting & OrbitControls)
      setupInteractions();
      
      // 6. Build the UI Warp Menu
      buildWarpMenu();
      
      // 7. Start Render Loop
      animate();
      
      // 8. Dismiss Loading Screen
      setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if(loader) {
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 800);
          addSystemLog("SYSTEM OVERRIDE SUCCESSFUL.");
          addSystemLog("NEXUS OS ONLINE.");
          addSystemLog(`DETECTED ${STATE.repos.length} REPOSITORIES IN SECTOR.`);
          
          // Start periodic background logs
          setInterval(() => {
            const backgroundMsgs = [
              "CALIBRATING QUANTUM SENSORS...",
              "ANALYZING GITHUB SUB-ROUTINES...",
              "SYNCING REPOSITORY DATA STREAMS...",
              "OPTIMIZING RENDERING CORE...",
              "UPDATING NEURAL PATHWAYS...",
              "CHECKING SECTOR STABILITY...",
              "DETECTED BACKGROUND RADIATION ANOMALY.",
              "REROUTING POWER TO SHIELDS.",
              "MONITORING TRAFFIC LATENCY."
            ];
            if(Math.random() > 0.4) { // 60% chance every 4s
              addSystemLog(backgroundMsgs[Math.floor(Math.random() * backgroundMsgs.length)]);
            }
          }, 4500);
        }
      }, 500);

    } catch (err) {
      console.error("Failed to initialize Developer Universe:", err);
      document.getElementById('loading-text').textContent = "Failed to load universe data. Check API limit.";
    }
  }

  function addSystemLog(msg) {
    const logContainer = document.getElementById('sys-log');
    if(!logContainer) return;
    const entry = document.createElement('div');
    entry.className = 'sys-log-entry';
    const time = new Date().toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
    entry.innerHTML = `<span class="text-primary opacity-60">[${time}]</span> <span class="text-black">${msg}</span>`;
    logContainer.appendChild(entry);
    if(logContainer.childElementCount > 6) {
      logContainer.removeChild(logContainer.firstChild);
    }
  }

  function setupScene() {
    const container = document.getElementById('universe-canvas');
    const w = window.innerWidth;
    const h = window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bgSpace);
    scene.fog = new THREE.FogExp2(COLORS.bgSpace, 0.002);

    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
    camera.position.set(0, 100, 250); // Initial elevated view

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    // Enable shadows for realism
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Setup PostProcessing (Bloom)
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 2.0, 0.5, 0.1);
    
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Setup CSS2DRenderer for DOM Labels
    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(w, h);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.getElementById('label-container').appendChild(labelRenderer.domElement);

    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 600;
    controls.minDistance = 20;

    // Lighting
    const ambientLight = new THREE.AmbientLight(COLORS.ambient, 2.0);
    scene.add(ambientLight);

    // Point Light from the Sun
    const sunLight = new THREE.PointLight(COLORS.star, 4, 600);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.bias = -0.001;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Handle Resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
  }

  // --- Procedural Texture Generator ---
  function createProceduralTexture(type, colors) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Base Fill
    ctx.fillStyle = colors.color1 || '#000000';
    ctx.fillRect(0, 0, 512, 256);

    // Simple Noise/Pattern Generator
    for(let i=0; i<3000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const radius = Math.random() * 8 + 1;
        
        ctx.beginPath();
        if(type === 'gas' || type === 'ice') {
            // Gas Giants get horizontal bands and streaks
            ctx.ellipse(x, y, radius * 10, radius, 0, 0, Math.PI * 2);
            ctx.fillStyle = Math.random() > 0.5 ? colors.color2 : colors.color3;
            ctx.globalAlpha = Math.random() * 0.3 + 0.1;
        } else if (type === 'sun') {
            // Sun gets intense radial noise
            ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = Math.random() > 0.5 ? '#ffeb3b' : '#ff5722';
            ctx.globalAlpha = Math.random() * 0.6 + 0.2;
        } else if (type === 'moon') {
            // Moons get circular craters
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = Math.random() > 0.5 ? '#64748b' : '#334155';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.globalAlpha = Math.random() * 0.4 + 0.1;
            ctx.stroke();
        } else {
            // Terrestrial/Martian gets continents and blobby noise
            ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
            ctx.fillStyle = Math.random() > 0.6 ? colors.color2 : colors.color3;
            ctx.globalAlpha = Math.random() * 0.5 + 0.1;
        }
        ctx.fill();
    }
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Extra pass for Earth-like clouds
    if(type === 'terrestrial') {
        for(let j=0; j<500; j++) {
            ctx.beginPath();
            ctx.arc(Math.random()*512, Math.random()*256, Math.random()*15, 0, Math.PI*2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.2;
            ctx.fill();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  }
  
  function createRingTexture(colors) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 2; // 1D lookup roughly
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createLinearGradient(0,0,256,0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.1, colors.color1);
    grad.addColorStop(0.5, colors.color2);
    grad.addColorStop(0.8, colors.color3);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,256,2);
    
    // Add gaps
    for(let i=0; i<10; i++) {
        ctx.clearRect(Math.random()*256, 0, Math.random()*10, 2);
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  function createEnvironment() {
    celestialGroup = new THREE.Group();
    scene.add(celestialGroup);

    // The Core Star (User) - High emissive for bloom with Photorealistic Texture
    const sunTex = createProceduralTexture('sun', {});
    const sunGeo = new THREE.SphereGeometry(15, 64, 64);
    const sunMat = new THREE.MeshStandardMaterial({ 
      map: sunTex,
      emissiveMap: sunTex,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.5 
    });
    sun = new THREE.Mesh(sunGeo, sunMat);
    celestialGroup.add(sun);

    // Star Aura/Glow
    const glowGeo = new THREE.SphereGeometry(16, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: COLORS.starGlow,
      transparent: true, 
      opacity: 0.2,
      blending: THREE.AdditiveBlending 
    });
    const sunGlow = new THREE.Mesh(glowGeo, glowMat);
    sun.add(sunGlow);

    // Dynamic Stargate Rings around the Sun
    for(let i=0; i<3; i++) {
      const ringGeo = new THREE.TorusGeometry(18 + i*3, 0.2, 8, 100);
      const ringMat = new THREE.MeshBasicMaterial({ 
        color: COLORS.primary, transparent: true, opacity: 0.6 - i*0.15, blending: THREE.AdditiveBlending 
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      ring.rotation.y = (Math.random() - 0.5) * 0.5;
      celestialGroup.add(ring);
      STATE.stargates.push({ mesh: ring, speed: (Math.random() > 0.5 ? 1 : -1) * (0.01 - i*0.002) });
    }

    // Dense Asteroid Belt Setup (InstancedMesh)
    const astGeo = new THREE.DodecahedronGeometry(0.4, 0);
    const astMat = new THREE.MeshStandardMaterial({ color: 0xaa9988, roughness: 0.9, metalness: 0.2 });
    STATE.asteroidBelt = new THREE.InstancedMesh(astGeo, astMat, 1500);
    const dummy = new THREE.Object3D();
    for(let i=0; i<1500; i++) {
      const r = 28 + Math.random() * 8; 
      const th = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 4;
      dummy.position.set(r * Math.cos(th), y, r * Math.sin(th));
      dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      const s = Math.random() * 1.5 + 0.5;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      STATE.asteroidBelt.setMatrixAt(i, dummy.matrix);
    }
    STATE.asteroidBelt.castShadow = true;
    celestialGroup.add(STATE.asteroidBelt);

    // Background Starfield (Galaxy Dust)
    const starGeo = new THREE.BufferGeometry();
    const starCount = 4000;
    const posArray = new Float32Array(starCount * 3);
    const colorArray = new Float32Array(starCount * 3);
    for(let i=0; i < starCount; i++) {
      // Spread stars widely
      const r = 200 + Math.random() * 800;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      posArray[i*3] = r * Math.sin(phi) * Math.cos(theta);
      posArray[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      posArray[i*3+2] = r * Math.cos(phi);
      
      // Add Nebula Colors
      const c = new THREE.Color(COLORS.nebulaInfo[i % COLORS.nebulaInfo.length]);
      if(Math.random() > 0.8) {
        colorArray[i*3] = c.r; colorArray[i*3+1] = c.g; colorArray[i*3+2] = c.b;
      } else {
        colorArray[i*3] = 1; colorArray[i*3+1] = 1; colorArray[i*3+2] = 1;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.8 });
    starfield = new THREE.Points(starGeo, starMat);
    scene.add(starfield);

    // True Volume Nebula Clouds using Procedural Radial Gradients
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 128; cloudCanvas.height = 128;
    const ctx = cloudCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(64,64,0, 64,64,60);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,128,128);
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);

    const cloudGeo = new THREE.BufferGeometry();
    const cloudCount = 100; // Fewer particles but huge sizes
    const cPosArray = new Float32Array(cloudCount * 3);
    const cColorArray = new Float32Array(cloudCount * 3);
    for(let i=0; i<cloudCount; i++) {
        const r = 150 + Math.random() * 400;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        cPosArray[i*3] = r * Math.sin(phi) * Math.cos(theta);
        cPosArray[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        cPosArray[i*3+2] = r * Math.cos(phi);

        const nc = new THREE.Color(COLORS.nebulaInfo[Math.floor(Math.random() * COLORS.nebulaInfo.length)]);
        cColorArray[i*3] = nc.r; cColorArray[i*3+1] = nc.g; cColorArray[i*3+2] = nc.b;
    }
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(cPosArray, 3));
    cloudGeo.setAttribute('color', new THREE.BufferAttribute(cColorArray, 3));
    
    // Disable depth testing for true ethereal clouds
    const cloudMat = new THREE.PointsMaterial({
      size: 400, // Very large
      map: cloudTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.04, // Very faint
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const clouds = new THREE.Points(cloudGeo, cloudMat);
    celestialGroup.add(clouds);
  }

  function createPlanetarySystem(repos) {
    if(!repos || repos.length === 0) return;

    // Sort repos by stars or size to determine orbit distance
    const sortedRepos = [...repos].sort((a,b) => (b.stargazers_count||0) - (a.stargazers_count||0));
    
    // Show all repositories (No Limits)
    const displayRepos = sortedRepos;

    let orbitRadius = 40; // Start distance from sun
    const orbitGap = 20;
    
    // For Drawing glowing Constellations between planets
    constelGroup = new THREE.Group();
    scene.add(constelGroup);
    
    // Group repos by language for constellations
    const langGroups = {};

    displayRepos.forEach((repo, i) => {
      // Planet Size based on repo size (with min/max bounds)
      const sizeBase = Math.min(Math.max((repo.size || 1000) / 4000, 2), 7);
      
      // Assign random planet type from palette
      const pConfig = COLORS.planets[i % COLORS.planets.length];
      const pTex = createProceduralTexture(pConfig.type, pConfig);
      
      // Geometry & Material
      const geo = new THREE.SphereGeometry(sizeBase, 64, 64); // Higher res for photorealism
      const mat = new THREE.MeshStandardMaterial({ 
        map: pTex,
        roughness: pConfig.type === 'ice' || pConfig.type === 'gas' ? 0.2 : 0.8,
        metalness: 0.1
      });
      const planet = new THREE.Mesh(geo, mat);
      planet.castShadow = true;
      planet.receiveShadow = true;
      
      // Add realistic Rings mainly to Gas or Ice giants
      if((pConfig.type === 'gas' || pConfig.type === 'ice') && i % 2 === 0) {
        const ringTex = createRingTexture(pConfig);
        const ringGeo = new THREE.RingGeometry(sizeBase * 1.4, sizeBase * 2.5, 64);
        // Correct UV mapping for RingGeometry to represent a radial texture gradient
        const pos = ringGeo.attributes.position;
        const v3 = new THREE.Vector3();
        for (let j = 0; j < pos.count; j++){
            v3.fromBufferAttribute(pos, j);
            ringGeo.attributes.uv.setXY(j, v3.length() < sizeBase * 1.95 ? 0 : 1, 0.5); // Simplified UV mapping hack for lines
        }
        
        const ringMat = new THREE.MeshStandardMaterial({ 
            map: ringTex, 
            side: THREE.DoubleSide, 
            transparent: true,
            opacity: 0.8,
            roughness: 0.6
        });
        const planetRing = new THREE.Mesh(ringGeo, ringMat);
        planetRing.rotation.x = Math.PI / 2 + (Math.random() - 0.5);
        planetRing.rotation.y = (Math.random() - 0.5) * 0.5;
        planetRing.receiveShadow = true;
        planetRing.castShadow = true;
        planet.add(planetRing);
      }

      // Orbit positioning (randomize angle)
      const angle = Math.random() * Math.PI * 2;
      planet.position.x = Math.cos(angle) * orbitRadius;
      planet.position.z = Math.sin(angle) * orbitRadius;
      
      // Random slight elevation out of flat plane
      planet.position.y = (Math.random() - 0.5) * 10;

      // Add Orbit line
      const orbitGeo = new THREE.RingGeometry(orbitRadius - 0.2, orbitRadius + 0.2, 64);
      const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, side: THREE.DoubleSide });
      const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
      orbitRing.rotation.x = Math.PI / 2;
      celestialGroup.add(orbitRing);

      // Moons (Technologies) - Procedural textures
      if (repo.language) {
        const numMoons = repo.language === 'Python' || repo.language === 'JavaScript' || repo.language === 'C++' ? 1 : 0;
        const moonTex = createProceduralTexture('moon', { color1: '#94a3b8' });
        const moonGeo = new THREE.SphereGeometry(sizeBase * 0.25, 32, 32);
        const moonMat = new THREE.MeshStandardMaterial({ 
          map: moonTex,
          roughness: 0.9,
          metalness: 0.1
        });
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.castShadow = true;
        moon.receiveShadow = true;
        
        // Parent the moon to an invisible pivot at the planet's center for easy rotation
        const moonPivot = new THREE.Group();
        moon.position.x = sizeBase + 3; // Orbit distance from planet
        moonPivot.add(moon);
        planet.add(moonPivot);
        
        // Store pivot for animation
        planet.userData.moonPivot = moonPivot;
      }

      // Planet Trail
      const maxTrail = 40;
      const trailPositions = new Float32Array(maxTrail * 3);
      for(let j=0; j<maxTrail*3; j++) trailPositions[j] = 0; // initialize
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      const trailMat = new THREE.LineBasicMaterial({ color: pConfig.color2, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
      const trialLine = new THREE.Line(trailGeo, trailMat);
      celestialGroup.add(trialLine);

      // Store Metadata for Interaction
      planet.userData = {
        ...planet.userData,
        isPlanet: true,
        repo: repo,
        orbitRadius: orbitRadius,
        orbitAngle: angle,
        orbitSpeed: (Math.random() * 0.5 + 0.5) * (i%2===0 ? 1 : -1), // randomly reverse orbit direction
        trailPositions: trailPositions,
        trailLine: trialLine
      };

      // Add CSS2D Label
      const labelDiv = document.createElement('div');
      labelDiv.className = 'planet-label';
      labelDiv.innerHTML = `
        <span class="planet-label-name">${repo.name}</span>
        <span class="planet-label-stats">${repo.language || 'SYS'} // ${repo.stargazers_count} PWR</span>
      `;
      const planetLabel = new THREE.CSS2DObject(labelDiv);
      planetLabel.position.set(0, sizeBase + 5, 0); // Float slightly above
      planet.add(planetLabel);
      planet.userData.label = labelDiv;

      celestialGroup.add(planet);
      STATE.planetsData.push(planet);

      // Grouping for Constellations
      const lang = repo.language || 'Other';
      if(!langGroups[lang]) langGroups[lang] = [];
      langGroups[lang].push(planet);

      orbitRadius += orbitGap + (Math.random() * 10);
    });

    // Draw Constellation Lines between planets of the same language
    const lineMat = new THREE.LineBasicMaterial({ color: COLORS.star, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
    Object.keys(langGroups).forEach(lang => {
      const planets = langGroups[lang];
      if(planets.length > 1) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(planets.map(p => p.position));
        const line = new THREE.Line(lineGeo, lineMat);
        constelGroup.add(line);
      }
    });
  }

  function setupInteractions() {
    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(STATE.planetsData);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (STATE.hoveredPlanet !== obj) {
          if(STATE.hoveredPlanet) {
            // Emissive glow acts as a selection highlight now, not extreme flat brightness
            STATE.hoveredPlanet.material.emissive.setHex(0x000000);
            if(STATE.hoveredPlanet.userData.label) STATE.hoveredPlanet.userData.label.classList.remove('active');
          }
          STATE.hoveredPlanet = obj;
          // Glow hovered planet heavily for interaction feedback
          obj.material.emissive.setHex(0xdbeafe); // Soft blue selection glow for light mode
          obj.material.emissiveIntensity = 0.5;
          if(obj.userData.label) obj.userData.label.classList.add('active');
          document.body.style.cursor = 'crosshair';
          playSynthTone(obj.id % 5 === 0 ? 800 : 1200, 'sine', 0.05, 0.1); // Hover blip
          if(Math.random() > 0.7) addSystemLog(`SCANNING TARGET [${obj.userData.repo.name}]...`);
        }
      } else {
        if (STATE.hoveredPlanet) {
          STATE.hoveredPlanet.material.emissive.setHex(0x000000);
          if(STATE.hoveredPlanet.userData.label) STATE.hoveredPlanet.userData.label.classList.remove('active');
          STATE.hoveredPlanet = null;
          document.body.style.cursor = 'default';
        }
      }
    });

    window.addEventListener('click', () => {
      // Audio needs to be resumed on first user interaction
      if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      
      if (STATE.hoveredPlanet && !STATE.isWarping) {
        playSynthTone(200, 'square', 0.1, 0.5); // Click warp sound
        selectPlanet(STATE.hoveredPlanet);
      } else if (!STATE.hoveredPlanet && STATE.selectedPlanet) {
        // Click space to deselect
        playSynthTone(150, 'sawtooth', 0.05, 0.4); // Deselect drop sound
        deselectPlanet();
      }
    });

    // Close btn on stats panel
    document.getElementById('close-stats').addEventListener('click', () => {
      playSynthTone(150, 'sawtooth', 0.05, 0.4);
      deselectPlanet();
    });

    // Close Modal Btn
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
          playSynthTone(150, 'sawtooth', 0.05, 0.4);
          deselectPlanet();
        });
    }
    
    // Audio Toggle Logic
    const audioBtn = document.getElementById('toggle-audio');
    const iconOff = document.getElementById('icon-audio-off');
    const iconOn = document.getElementById('icon-audio-on');
    audioBtn.addEventListener('click', () => {
      isAudioEnabled = !isAudioEnabled;
      if(isAudioEnabled) {
        iconOff.classList.add('hidden');
        iconOn.classList.remove('hidden');
        if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        startDrone();
      } else {
        iconOn.classList.add('hidden');
        iconOff.classList.remove('hidden');
        stopDrone();
      }
    });
  }

  function selectPlanet(planetMesh) {
    if(!planetMesh || !planetMesh.userData.repo) return;
    
    STATE.selectedPlanet = planetMesh;
    const repo = planetMesh.userData.repo;

    // Warp Camera to Planet
    warpToPlanet(planetMesh);

    // Update UI HUD
    const hud = document.getElementById('stats-panel');
    const title = document.getElementById('planet-name');
    const desc = document.getElementById('planet-desc');
    const dataSection = document.getElementById('planet-data');
    
    title.textContent = repo.name;
    desc.textContent = repo.description || "No description provided.";
    
    document.getElementById('planet-lang').textContent = repo.language || '-';
    document.getElementById('planet-stars').textContent = repo.stargazers_count || 0;
    
    const uiBtnRepo = document.getElementById('planet-btn-repo');
    uiBtnRepo.href = repo.html_url;

    const uiBtnAi = document.getElementById('planet-btn-ai');
    uiBtnAi.onclick = () => {
      // Simulate AI Explanation (Could hook back into IDE via localStorage/URL params in a real setup)
      desc.innerHTML = `<span class="text-indigo-600 animate-pulse">AI is analyzing architecture...</span>`;
      setTimeout(() => {
        desc.innerHTML = `<span class="text-black">This project is primarily written in ${repo.language || 'code'} and serves as a tool or prototype. It has received ${repo.stargazers_count} stars from the community.</span>`;
      }, 1500);
    };

    dataSection.classList.remove('hidden');
    
    // Show HUD with translated directions for new layout
    hud.classList.remove('opacity-0', 'translate-x-8', 'pointer-events-none');
    hud.classList.add('opacity-100', 'translate-x-0', 'pointer-events-auto');
    
    // Simulate Data Stream Text effect for HUD
    let iter = 0;
    const targetDesc = repo.description || "No description provided.";
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    
    desc.innerText = targetDesc.split("").map(() => letters[Math.floor(Math.random() * 42)]).join("");
    const interval = setInterval(() => {
      desc.innerText = desc.innerText.split("")
        .map((letter, index) => {
          if(index < iter) {
            return targetDesc[index];
          }
          return letters[Math.floor(Math.random() * 42)]
        }).join("");
      
      if(iter >= targetDesc.length){
        clearInterval(interval);
        desc.textContent = targetDesc;
      }
      iter += 1;
    }, 15);

    // --- Show Full Repository Modal ---
    const modal = document.getElementById('planet-modal');
    if (modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
        
        const modalContent = document.getElementById('planet-modal-content');
        if (modalContent) {
           modalContent.classList.remove('scale-95');
           modalContent.classList.add('scale-100');
        }

        document.getElementById('modal-title').textContent = repo.name;
        document.getElementById('modal-title').onclick = () => window.open(repo.html_url, '_blank');
        document.getElementById('modal-desc').textContent = repo.description || "No description provided.";
        document.getElementById('modal-lang').textContent = repo.language || "SYS";
        document.getElementById('modal-stars').textContent = repo.stargazers_count || "0";
        document.getElementById('modal-btn-github').href = repo.html_url;
        document.getElementById('modal-btn-ide').href = `IDE.html?repo=${repo.name}`;
        
        const readmeContainer = document.getElementById('modal-readme');
        readmeContainer.innerHTML = '<div class="flex justify-center items-center h-48"><div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>';
        
        // Use the global ENGINE to fetch the README and use marked.js to render
        if (window.ENGINE && window.marked) {
            window.ENGINE.fetchReadme(repo.name).then(readme => {
                if (readme) {
                    readmeContainer.innerHTML = window.marked.parse(readme);
                } else {
                    readmeContainer.innerHTML = '<div class="text-center text-slate-500 italic py-10 border border-black/5 bg-white/50 rounded">No README.md found in this repository.</div>';
                }
            }).catch(() => {
                 readmeContainer.innerHTML = '<div class="text-center text-red-500 italic py-10 border border-black/5 bg-white/50 rounded">Failed to load repository data.</div>';
            });
        } else {
             readmeContainer.innerHTML = '<pre class="text-xs text-slate-500 overflow-x-auto whitespace-pre-wrap"><br>[SYSTEM] Markdown renderer or Portfolio Engine missing.</pre>';
        }
    }
  }

  function deselectPlanet() {
    STATE.selectedPlanet = null;
    
    // Hide HUD
    const hud = document.getElementById('stats-panel');
    hud.classList.add('opacity-0', 'translate-x-8', 'pointer-events-none');
    hud.classList.remove('opacity-100', 'translate-x-0', 'pointer-events-auto');

    // Hide Modal
    const modal = document.getElementById('planet-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        const modalContent = document.getElementById('planet-modal-content');
        if (modalContent) {
           modalContent.classList.add('scale-95');
           modalContent.classList.remove('scale-100');
        }
    }

    // Reset Title/Desc
    setTimeout(() => {
      document.getElementById('planet-name').textContent = "Universe Overview";
      document.getElementById('planet-desc').textContent = "Drag to orbit. Scroll to zoom. Click a planet or moon to view intelligence data.";
      document.getElementById('planet-data').classList.add('hidden');
    }, 300);

    // Warp back to overview
    warpToOverview();
  }

  function warpToPlanet(planet) {
    if(!planet) return;
    STATE.isWarping = true;
    
    // We want to look at the planet, and position the camera just outside it
    const targetPos = new THREE.Vector3();
    planet.getWorldPosition(targetPos);
    
    // Calculate a camera offset
    const offset = new THREE.Vector3(15, 10, 20); // Looking slightly down and to the side
    const camTargetPos = targetPos.clone().add(offset);

    // Hyperjump FOV FX
    addSystemLog(`INITIATING HYPER-JUMP TO SECTOR [${repo.name}]`);
    gsap.to(camera, {
      fov: 90, duration: 0.5, ease: "power2.in", onUpdate: () => camera.updateProjectionMatrix(),
      onComplete: () => {
        gsap.to(camera, { fov: 60, duration: 1.0, ease: "power2.out", onUpdate: () => camera.updateProjectionMatrix() });
      }
    });

    // Animate Camera Position
    gsap.to(camera.position, {
      x: camTargetPos.x,
      y: camTargetPos.y,
      z: camTargetPos.z,
      duration: 1.5,
      ease: "power3.inOut"
    });

    // Animate Controls Target (where the camera is looking)
    gsap.to(controls.target, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 1.5,
      ease: "power3.inOut",
      onComplete: () => {
        STATE.isWarping = false;
      }
    });
  }

  function warpToOverview() {
    STATE.isWarping = true;
    addSystemLog(`DISENGAGING LOCAL ORBIT. RETURNING TO WIDE SURVEILLANCE.`);
    
    // Reverse FOV FX
    gsap.to(camera, {
      fov: 75, duration: 0.8, ease: "power2.inOut", onUpdate: () => camera.updateProjectionMatrix(),
      onComplete: () => {
        gsap.to(camera, { fov: 60, duration: 1.2, ease: "power2.out", onUpdate: () => camera.updateProjectionMatrix() });
      }
    });

    gsap.to(camera.position, {
      x: 0,
      y: 100,
      z: 250,
      duration: 2,
      ease: "power2.inOut"
    });

    gsap.to(controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 2,
      ease: "power2.inOut",
      onComplete: () => {
        STATE.isWarping = false;
      }
    });
  }

  function buildWarpMenu() {
    const list = document.getElementById('warp-list');
    if(!list || !STATE.repos) return;

    // Filter to top 10 repos for the menu
    const topRepos = [...STATE.repos].sort((a,b) => (b.stargazers_count||0) - (a.stargazers_count||0)).slice(0, 10);

    topRepos.forEach(repo => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors truncate';
      btn.textContent = repo.name;
      btn.onclick = () => {
        if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        playSynthTone(200, 'square', 0.1, 0.5);
        // Find corresponding planet mesh
        const planet = STATE.planetsData.find(p => p.userData.repo.id === repo.id);
        if(planet) {
          selectPlanet(planet);
        }
      };
      list.appendChild(btn);
    });
  }
  
  // --- Audio Synthesis Engine ---
  let droneOscillator = null;
  function initAudio() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      masterGain.gain.value = 0.3; // safe volume
    } catch(e) {
      console.warn('Web Audio API not supported in this browser');
    }
  }

  function playSynthTone(freq, type, vol, duration) {
    if(!isAudioEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    // Envelope
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function startDrone() {
    if(!isAudioEnabled || !audioCtx) return;
    if(droneOscillator) return; // already playing
    
    droneOscillator = audioCtx.createOscillator();
    const droneGain = audioCtx.createGain();
    
    // Low atmospheric rumble
    droneOscillator.type = 'sine';
    droneOscillator.frequency.value = 55; // A1
    
    droneGain.gain.setValueAtTime(0, audioCtx.currentTime);
    droneGain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 2); // fade in
    
    droneOscillator.connect(droneGain);
    droneGain.connect(masterGain);
    droneOscillator.start();
    droneOscillator._gainNode = droneGain;
  }

  function stopDrone() {
    if(!droneOscillator) return;
    const gain = droneOscillator._gainNode;
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 1); // fade out
    droneOscillator.stop(audioCtx.currentTime + 1);
    droneOscillator = null;
  }

  function animate() {
    animationRef = requestAnimationFrame(animate);

    // Slow rotation of the whole starfield and sun
    if(starfield) starfield.rotation.y -= 0.0001;
    if(sun) sun.rotation.y += 0.005;

    // Rotate Stargates
    STATE.stargates.forEach(gate => {
      gate.mesh.rotation.z += gate.speed;
      gate.mesh.rotation.x += gate.speed * 0.2;
    });

    // Rotate Asteroid Belt
    if(STATE.asteroidBelt) {
      STATE.asteroidBelt.rotation.y += 0.001;
    }

    // Orbit Dynamics for Planets
    STATE.planetsData.forEach(planet => {
      const data = planet.userData;
      // Advance angle
      data.orbitAngle += STATE.orbitSpeed * data.orbitSpeed;
      
      // Calculate new position
      planet.position.x = Math.cos(data.orbitAngle) * data.orbitRadius;
      planet.position.z = Math.sin(data.orbitAngle) * data.orbitRadius;
      
      // Self rotation
      planet.rotation.y += 0.01;

      // Update Trail
      if (data.trailPositions && data.trailLine) {
        // Shift old positions down
        const max = data.trailPositions.length / 3;
        for(let j = max - 1; j > 0; j--) {
          data.trailPositions[j*3] = data.trailPositions[(j-1)*3];
          data.trailPositions[j*3+1] = data.trailPositions[(j-1)*3+1];
          data.trailPositions[j*3+2] = data.trailPositions[(j-1)*3+2];
        }
        // Insert new position
        data.trailPositions[0] = planet.position.x;
        data.trailPositions[1] = planet.position.y;
        data.trailPositions[2] = planet.position.z;
        data.trailLine.geometry.attributes.position.needsUpdate = true;
      }

      // Moon rotation
      if(planet.userData.moonPivot) {
        planet.userData.moonPivot.rotation.y += 0.02;
      }
    });

    // Update Constellations (make lines rotate with the system if desired, or keep static relative to planets)
    // Here we just let the lines redraw logically since vertices are tied to planet positions.
    if(constelGroup) {
      constelGroup.children.forEach(line => {
        line.geometry.attributes.position.needsUpdate = true;
      });
    }

    // If we are currently focused on a planet and NOT in a warp transition, 
    // we need to keep the controls target locked to the moving planet
    if(STATE.selectedPlanet && !STATE.isWarping) {
      const targetPos = new THREE.Vector3();
      STATE.selectedPlanet.getWorldPosition(targetPos);
      controls.target.copy(targetPos);
    }

    controls.update();
    composer.render();
    if(labelRenderer) labelRenderer.render(scene, camera);
  }

  // Bind init to DOM load or engine ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
