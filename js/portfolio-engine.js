/**
 * ============================================================
 *  AI PORTFOLIO ENGINE  v1.0
 *  Centralized data engine for RishvinReddy's developer portfolio.
 *  All pages import this to get a single, cached source of truth.
 * ============================================================
 */

const PORTFOLIO_ENGINE = (() => {

  // ─── Config ──────────────────────────────────────────────
  const USERNAME = "RishvinReddy";
  const CACHE_KEY = "pe_cache_v3";
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

  // ─── Memory Cache ────────────────────────────────────────
  let CACHE = {
    repos: null,
    stats: null,
    skills: null,
    tools: null,
    insights: null,
    timestamp: null
  };

  // ─── Tag Keywords ─────────────────────────────────────────
  const TAG_RULES = [
    { tag: "IoT", words: ["iot", "arduino", "esp32", "esp8266", "sensor", "embedded", "nodemcu"] },
    { tag: "AI / ML", words: ["ai", "ml", "machine learning", "deep learning", "tensorflow", "pytorch", "opencv", "neural"] },
    { tag: "Web3", words: ["blockchain", "solidity", "ethereum", "web3", "nft", "smart contract", "crypto"] },
    { tag: "Cybersecurity", words: ["security", "cyber", "pentest", "encryption", "ctf", "firewall", "intrusion"] },
    { tag: "Web", words: ["web", "html", "css", "react", "next", "frontend", "backend", "fullstack", "api"] },
    { tag: "Python", words: ["python", "django", "flask", "fastapi", "automation", "script"] },
    { tag: "Systems", words: ["c++", "cpp", "os", "kernel", "memory", "process", "scheduling", "operating system"] },
    { tag: "Data", words: ["data", "sql", "database", "analytics", "visualization", "pandas", "numpy"] },
  ];

  // ─── Tool Detection Dictionary ────────────────────────────
  const TOOL_RULES = [
    { keywords: ["react", "jsx", "tsx"], display: "React", icon: "react" },
    { keywords: ["nextjs", "next.js"], display: "Next.js", icon: "nextdotjs" },
    { keywords: ["node", "nodejs", "express"], display: "Node.js", icon: "nodedotjs" },
    { keywords: ["python", "django", "flask", "fastapi"], display: "Python", icon: "python" },
    { keywords: ["arduino", "esp32", "esp8266", "nodemcu"], display: "Arduino / ESP", icon: "arduino" },
    { keywords: ["c++", "cpp"], display: "C++", icon: "cplusplus" },
    { keywords: ["solidity", "web3", "ethereum"], display: "Solidity", icon: "solidity" },
    { keywords: ["docker", "container"], display: "Docker", icon: "docker" },
    { keywords: ["aws", "amazon"], display: "AWS", icon: "amazonaws" },
    { keywords: ["firebase"], display: "Firebase", icon: "firebase" },
    { keywords: ["mysql", "sql"], display: "MySQL", icon: "mysql" },
    { keywords: ["mongodb", "mongo"], display: "MongoDB", icon: "mongodb" },
    { keywords: ["figma", "ui", "ux", "design"], display: "Figma", icon: "figma" },
    { keywords: ["opencv", "computer vision"], display: "OpenCV", icon: "opencv" },
    { keywords: ["tensorflow", "keras"], display: "TensorFlow", icon: "tensorflow" },
    { keywords: ["raspberry", "rpi"], display: "Raspberry Pi", icon: "raspberrypi" },
  ];

  // ─── AI Fallback Summaries ────────────────────────────────
  const LANG_SUMMARIES = {
    "Python": "Python-based automation, data processing, or machine learning system.",
    "C++": "High-performance systems-level or embedded hardware project.",
    "JavaScript": "Web application or interactive frontend experience.",
    "TypeScript": "Type-safe web application or fullstack project.",
    "HTML": "Web-based interactive UI or static site project.",
    "Solidity": "Smart contract or decentralized blockchain application.",
    "C": "Low-level systems or embedded systems project.",
    "Java": "Object-oriented application or Android-native project.",
    "Shell": "Automation shell script or DevOps utility.",
  };

  // ─── Internal Helpers ─────────────────────────────────────
  async function _fetchFromGitHub() {
    let page = 1;
    let allRepos = [];
    while (true) {
      const res = await fetch(
        `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&sort=updated&type=owner`
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const repos = await res.json();
      allRepos = allRepos.concat(repos);
      if (repos.length < 100) break;
      page++;
    }
    return allRepos;
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * getRepos()
   * Returns all public repos. Uses localStorage for caching.
   * Cache expires after CACHE_TTL (1h) to always show fresh data.
   */
  async function getRepos() {
    if (CACHE.repos && Date.now() - CACHE.timestamp < CACHE_TTL) {
      console.log("[PortfolioEngine] Loaded from memory cache ✅");
      return CACHE.repos;
    }

    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL && parsed.repos) {
          console.log("[PortfolioEngine] Loaded repos from localStorage cache ✅");
          CACHE = parsed;
          return CACHE.repos;
        }
      }
    } catch (e) { /* ignore corrupt cache */ }

    console.log("[PortfolioEngine] Fetching fresh data from GitHub...");
    const repos = await _fetchFromGitHub();
    try {
      CACHE.repos = repos;
      CACHE.stats = calculateStats(repos);
      CACHE.skills = detectSkills(repos);
      CACHE.tools = detectTools(repos);
      CACHE.insights = generateInsights(repos);
      CACHE.timestamp = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(CACHE));
    } catch (e) { /* ignore storage quota issues */ }
    return CACHE.repos;
  }

  /**
   * analyzeRepo(repo)
   * Scans a single repo and returns enriched metadata with auto-tags
   * and an AI-generated fallback description.
   */
  function analyzeRepo(repo) {
    const searchText = [
      repo.name,
      repo.description || "",
      repo.language || "",
      ...(repo.topics || []),
    ].join(" ").toLowerCase();

    const tags = TAG_RULES
      .filter(rule => rule.words.some(w => searchText.includes(w)))
      .map(rule => rule.tag);

    const description = (repo.description && repo.description.trim())
      ? repo.description
      : (LANG_SUMMARIES[repo.language] || "Software development project.");

    return {
      name: repo.name,
      displayName: repo.name.replace(/-/g, " "),
      description,
      language: repo.language || "Unknown",
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      url: repo.html_url,
      updatedAt: repo.updated_at,
      isFork: repo.fork,
      topics: repo.topics || [],
      tags: [...new Set(tags)],   // deduplicate
    };
  }

  /**
   * detectSkills(repos)
   * Counts how many repos use each language.
   * Returns sorted array: [ { lang, count } ]
   */
  function detectSkills(repos) {
    const map = {};
    repos.forEach(r => {
      if (r.language) map[r.language] = (map[r.language] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({ lang, count }));
  }

  /**
   * detectTools(repos)
   * Scans repo names/descriptions/topics for known tool keywords.
   * Returns array of matched tool objects.
   */
  function detectTools(repos) {
    const found = new Map();
    repos.forEach(repo => {
      const text = [
        repo.name,
        repo.description || "",
        ...(repo.topics || []),
      ].join(" ").toLowerCase();

      for (const tool of TOOL_RULES) {
        if (tool.keywords.some(kw => text.includes(kw))) {
          found.set(tool.display, tool);
        }
      }
    });
    return Array.from(found.values());
  }

  /**
   * calculateStats(repos)
   * Returns aggregate portfolio statistics.
   */
  function calculateStats(repos) {
    let totalStars = 0, totalForks = 0;
    const languages = new Set();
    repos.forEach(r => {
      totalStars += r.stargazers_count;
      totalForks += r.forks_count;
      if (r.language) languages.add(r.language);
    });
    return {
      totalRepos: repos.length,
      originalRepos: repos.filter(r => !r.fork).length,
      totalStars,
      totalForks,
      languageCount: languages.size,
    };
  }

  /**
   * generateInsights(repos)
   * Returns human-readable AI-style insights based on data.
   */
  function generateInsights(repos) {
    const skills = detectSkills(repos);
    const stats = calculateStats(repos);
    const topLang = skills[0]?.lang ?? "multiple languages";
    const topTags = [...new Set(repos.flatMap(r => analyzeRepo(r).tags))].slice(0, 3);

    return {
      headline: `Primarily a ${topLang} developer with ${stats.totalRepos} public repositories.`,
      focus: topTags.length ? `Core focus areas: ${topTags.join(", ")}.` : "",
      impact: `Earned ${stats.totalStars} ⭐ stars across all projects.`,
      topLang,
      topTags,
    };
  }

  /**
   * clearCache()
   * Force-clears the localStorage cache so fresh data is fetched.
   */
  function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    console.log("[PortfolioEngine] Cache cleared. Fresh data will load on next call.");
  }

  function getOriginalRepos(repos) {
    return repos.filter(r => !r.fork && !r.archived);
  }

  function getTopRepos(repos, limit = 6) {
    return repos
      .filter(r => !r.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, limit);
  }

  function languageBreakdown(repos) {
    const map = {};
    repos.forEach(r => {
      if (!r.language) return;
      map[r.language] = (map[r.language] || 0) + 1;
    });
    return map;
  }

  async function fetchReadme(repo) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${USERNAME}/${repo}/readme`
      );
      if (!res.ok) return null;
      const data = await res.json();
      return atob(data.content);
    } catch {
      return null;
    }
  }

  async function fetchRepoTree(repo) {
    const res = await fetch(
      `https://api.github.com/repos/${USERNAME}/${repo}/git/trees/HEAD?recursive=1`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.tree || [];
  }
  function selectImportantFiles(tree) {
    return tree.filter(file =>
      file.path.endsWith(".js") ||
      file.path.endsWith(".py") ||
      file.path.endsWith(".cpp") ||
      file.path.endsWith(".md")
    ).slice(0, 5);
  }

  async function fetchCode(repo, path) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${USERNAME}/${repo}/main/${path}`);
      if (!res.ok) {
        // Fallback for master branch if main doesn't exist
        const resMaster = await fetch(`https://raw.githubusercontent.com/${USERNAME}/${repo}/master/${path}`);
        if (!resMaster.ok) return "";
        return await resMaster.text();
      }
      return await res.text();
    } catch {
      return "";
    }
  }

  async function fetchContributionGraph() {
    const res = await fetch(
      `https://github-contributions-api.vercel.app/v1/${USERNAME}`
    );
    return res.json();
  }

  function searchRepos(repos, query) {
    const q = query.toLowerCase();
    return repos.filter(repo =>
      repo.name.toLowerCase().includes(q) ||
      (repo.description || "").toLowerCase().includes(q)
    );
  }

  // ─── AI Portfolio Engine v3.0 Exclusive Features ────────────

  /**
   * classifyRepo(repo)
   * Automatically groups projects into broader architecture types.
   */
  function classifyRepo(repo) {
    const text = (repo.name + " " + (repo.description || "")).toLowerCase();
    
    if (text.includes("iot") || text.includes("arduino") || text.includes("esp32") || text.includes("esp8266"))
      return "IoT Project";
    
    if (text.includes("ai") || text.includes("ml") || text.includes("machine learning") || text.includes("deep learning"))
      return "AI / Machine Learning Project";
      
    if (text.includes("blockchain") || text.includes("web3") || text.includes("solidity") || text.includes("ethereum"))
      return "Web3 Project";

    if (text.includes("web") || text.includes("react") || text.includes("frontend") || text.includes("nextjs"))
      return "Web Application";
      
    if (text.includes("algorithm") || text.includes("search engine") || text.includes("data structure"))
      return "Algorithms Project";

    return "Software Project";
  }

  /**
   * generateArchitecture(tree)
   * Analyzes the GitHub tree output to generate a structured module architecture.
   */
  function generateArchitecture(tree) {
    const modules = {};
    tree.forEach(file => {
      const parts = file.path.split("/");
      const folder = parts.length > 1 ? parts[0] : "root";
      if (!modules[folder]) modules[folder] = [];
      modules[folder].push(file.path);
    });
    return modules;
  }

  /**
   * buildDependencyGraph(files)
   * Visualizes relationships between modules and files.
   * Returns graph nodes and basic inferred edges.
   */
  function buildDependencyGraph(files) {
    const nodes = [];
    const edges = [];
    
    files.forEach(f => {
      nodes.push({ id: f.path, label: f.path.split("/").pop() });
    });
    
    // Auto-generate basic edges based on folder structure
    files.forEach(f => {
      const parts = f.path.split("/");
      if (parts.length > 1) {
        const parentId = parts.slice(0, -1).join("/");
        if (files.find(x => x.path === parentId)) {
           edges.push({ source: parentId, target: f.path });
        }
      }
    });

    return { nodes, edges };
  }

  /**
   * prepareCodeExplanation(file, code)
   * Generates a template string prompt for the AI Code Explanation Engine.
   */
  function prepareCodeExplanation(file, code) {
    return `
File: ${file}

Code:
${code}

Explain what this file does in simple terms.
    `.trim();
  }

  /**
   * fetchCommits(repo)
   * Returns commit history for the Repo Timeline Generator.
   */
  async function fetchCommits(repo) {
    try {
      const res = await fetch(`https://api.github.com/repos/${USERNAME}/${repo}/commits`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  /**
   * rankProjects(repos)
   * Sorts projects intelligently based on stars and forks (Importance scoring).
   */
  function rankProjects(repos) {
    return repos
      .filter(r => !r.fork)
      .map(r => ({
        repo: r,
        score: (r.stargazers_count * 3) + r.forks_count
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * generateKnowledgeGraph(repos)
   * Creates nodes and edges to represent the tech stack connectivity.
   */
  function generateKnowledgeGraph(repos) {
    const graph = {};
    repos.forEach(repo => {
      if (!repo.language) return;
      if (!graph[repo.language]) graph[repo.language] = new Set();
      
      const tags = analyzeRepo(repo).tags;
      tags.forEach(tag => {
         if (tag !== repo.language) {
            graph[repo.language].add(tag);
         }
      });
    });
    
    const formatted = {};
    Object.keys(graph).forEach(key => {
       formatted[key] = Array.from(graph[key]);
    });
    return formatted;
  }

  /**
   * buildCodebaseGraph(repos)
   * Automatically generates the interactive Knowledge Graph nodes and edges.
   */
  function buildCodebaseGraph(repos) {
    const nodes = [];
    const edges = [];
    const addedNodes = new Set(); // Prevent duplicate nodes

    function addNode(id, label, type, color) {
      if (!addedNodes.has(id)) {
        nodes.push({ id, label, type, color });
        addedNodes.add(id);
      }
    }

    repos.forEach(repo => {
      // 1. Project Nodes
      const projectId = `proj_${repo.name}`;
      addNode(projectId, repo.name, "project", "#3b82f6"); // Blue

      // 2. Language Nodes
      if (repo.language) {
        const langId = `lang_${repo.language}`;
        addNode(langId, repo.language, "language", "#eab308"); // Yellow
        edges.push({ source: projectId, target: langId, type: "written_in" });
      }

      // 3. Domain Nodes (from classification)
      const domain = classifyRepo(repo);
      if (domain) {
        const domainId = `dom_${domain}`;
        addNode(domainId, domain, "domain", "#a855f7"); // Purple
        edges.push({ source: projectId, target: domainId, type: "belongs_to" });
      }

      // 4. Technology/Topic Nodes
      if (repo.topics && repo.topics.length > 0) {
        repo.topics.slice(0, 4).forEach(topic => { // limit to top 4 to prevent clutter
          const techId = `tech_${topic}`;
          addNode(techId, topic, "technology", "#22c55e"); // Green
          edges.push({ source: projectId, target: techId, type: "uses" });
        });
      }
    });

    return { nodes, edges };
  }

  // ─── AI BRAIN: VECTOR MEMORY SYSTEM ─────────────────────────
  
  /**
   * buildAIContext()
   * Asynchronously fetches Top READMEs and builds a Vector/Token DB for Semantic Search.
   */
  async function buildAIContext() {
    let cached = localStorage.getItem("rag_vector_index");
    if (cached) {
      try {
        window.APP.contextDB = JSON.parse(cached);
        return;
      } catch (e) {}
    }
    
    if (window.logToTerminal) window.logToTerminal("Building local RAG vector index into Memory...", "system");
    
    const repos = await getRepos();
    const topRepos = getTopRepos(repos, 8); // Deep analyze top 8
    const db = [];

    for (const repo of topRepos) {
      // 1. Structural Node
      const metadata = `${repo.name}: ${repo.description || 'No description.'}`;
      db.push({
        repo: repo.name,
        text: metadata,
        tokens: metadata.toLowerCase().split(/\W+/).filter(w => w.length > 2),
        type: 'metadata'
      });

      // 2. Semantic README Node
      const readme = await fetchReadme(repo.name);
      if (readme) {
        for (let i = 0; i < readme.length; i += 400) {
          let chunk = readme.slice(i, i + 400);
          db.push({
            repo: repo.name,
            text: chunk,
            tokens: chunk.toLowerCase().split(/\W+/).filter(w => w.length > 2),
            type: 'readme'
          });
        }
      }
    }

    window.APP.contextDB = db;
    try {
      localStorage.setItem("rag_vector_index", JSON.stringify(db));
    } catch(e) {}
    
    if (window.logToTerminal) window.logToTerminal(`AI Memory Index built with ${db.length} context chunks.`, "success");
  }

  // ─── RESUME GENERATOR ENGINE ────────────────────────────────
  
  /**
   * generateResumeSystem(role)
   * Builds an AI-tailored resume based on the repo insights and a specific target role.
   */
  function generateResumeSystem(role = "Software Engineer") {
    if (!window.APP.repos || window.APP.repos.length === 0) return "Loading data...";
    const insights = generateInsights(window.APP.repos);
    
    // Sort projects for the resume
    const topProjects = rankProjects(window.APP.repos).slice(0, 4).map(p => p.repo);
    
    const resumeStr = `
====== ${role.toUpperCase()} RESUME ======

Candidate: Erolla Rishvin Reddy
Domain: ${insights.focus}
Top Stack: ${insights.topLang}

=== CORE COMPETENCIES ===
${Array.from(detectSkills(window.APP.repos)).slice(0, 8).join(' | ')}

=== KEY ENGINEERING PROJECTS ===
${topProjects.map(r => `
- [${r.name}]
  ${r.description || 'Developed custom system architectures and logic.'}
  Stack: ${r.language || 'Multi-language'} | Engagement: ${r.stargazers_count} stars / ${r.forks_count} forks
`).join('')}

=== PATENT & INNOVATION ===
- Co-inventor of Government of India registered design patent for an IoT Connectivity Device (Design No. 470097-001).

========================================
    `.trim();
    
    return resumeStr;
  }

  // ─── Expose Public API ────────────────────────────────────
  return {
    USERNAME,
    getRepos,
    getOriginalRepos,
    getTopRepos,
    analyzeRepo,
    detectSkills,
    detectTools,
    calculateStats,
    generateInsights,
    languageBreakdown,
    searchRepos,
    classifyRepo,
    generateArchitecture,
    buildDependencyGraph,
    prepareCodeExplanation,
    rankProjects,
    generateKnowledgeGraph,
    fetchReadme,
    fetchRepoTree,
    fetchCode,
    selectImportantFiles,
    fetchCommits,
    fetchContributionGraph,
    clearCache,
    buildCodebaseGraph,
    buildAIContext,
    generateResumeSystem,
    getEngineCache: () => CACHE,
  };

})();

// ─── GLOBAL SYSTEM INITIALIZATION (DEV-OS BRAIN) ──────────────────

// Convenience alias for easy access in all pages
window.ENGINE = PORTFOLIO_ENGINE;

// Native State Manager (Replaces individual page fetches)
window.APP = {
  repos: [],
  insights: null,
  tools: null,
  contextDB: [] // Vector search dataset
};

/**
 * Initializes the entire application state globally.
 */
window.initApp = async function() {
  if (window.APP.repos && window.APP.repos.length > 0) return; // Prevent double load
  
  if (window.logToTerminal) window.logToTerminal("Booting DevOS Global Intelligence...", "info");

  const repos = await window.ENGINE.getRepos();
  window.APP.repos = repos;
  window.APP.insights = window.ENGINE.generateInsights(repos);
  window.APP.tools = window.ENGINE.detectTools(repos);
  
  // Kickstart non-blocking Vector DB build
  setTimeout(() => {
    window.ENGINE.buildAIContext();
  }, 300);

  if (window.logToTerminal) window.logToTerminal("Global APP state fully loaded", "success");
  
  // Dispatch critical system event
  document.dispatchEvent(new Event('DevOS_Ready'));
};

// Auto-boot if not in a lazy-load environment
document.addEventListener('DOMContentLoaded', () => {
    window.initApp();
});

