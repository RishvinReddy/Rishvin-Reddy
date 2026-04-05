// ==============================================================================
// Yogamruth's IDE Extensions & Analytics
// Encompasses particles, command palette, chart, graph, and AI explainer.
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {

  // 1. Neural Network Particle Background
  if (typeof tsParticles !== 'undefined') {
    tsParticles.load("neural-bg", {
      particles: {
        number: { value: 60, density: { enable: true, value_area: 800 } },
        color: { value: ["#3b82f6", "#22c55e", "#a855f7", "#f20d46"] },
        links: { enable: true, distance: 150, color: "#808080", opacity: 0.2, width: 1 },
        move: { enable: true, speed: 0.8, direction: "none", random: false, straight: false, outModes: "bounce" },
        size: { value: { min: 1, max: 3 } },
        opacity: { value: 0.4 }
      },
      interactivity: {
        events: { onHover: { enable: true, mode: "grab" }, onClick: { enable: true, mode: "push" } },
        modes: { grab: { distance: 160, links: { opacity: 0.6 } }, push: { particles_nb: 3 } }
      },
      retina_detect: true,
      background: { color: "transparent" }
    });
  }

  // 2. Command Palette (Ctrl/Cmd + K or Shift + P)
  const cmdOverlay = document.getElementById('command-palette-overlay');
  const cmdInput = document.getElementById('cmd-input');
  const cmdPalette = document.getElementById('command-palette');
  
  window.toggleCommandPalette = function() {
    if (!cmdOverlay) return;
    if (cmdOverlay.classList.contains('hidden')) {
      cmdOverlay.classList.remove('hidden');
      setTimeout(() => {
        cmdOverlay.classList.remove('opacity-0');
        cmdPalette.classList.remove('scale-95');
        cmdInput.focus();
      }, 10);
    } else {
      cmdOverlay.classList.add('opacity-0');
      cmdPalette.classList.add('scale-95');
      setTimeout(() => {
        cmdOverlay.classList.add('hidden');
        cmdInput.value = ''; // reset on close
        // Trigger input event to reset list
        cmdInput.dispatchEvent(new Event('input'));
      }, 200);
    }
  };

  document.addEventListener('keydown', (e) => {
    // Cmd+K or Ctrl+K or Cmd/Ctrl+Shift+P
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    
    if ((modifier && e.key === 'k') || (modifier && e.shiftKey && (e.key === 'p' || e.key === 'P'))) {
      e.preventDefault();
      toggleCommandPalette();
    }
    if (e.key === 'Escape') {
      if (cmdOverlay && !cmdOverlay.classList.contains('hidden')) {
        toggleCommandPalette();
      }
    }
  });

  if (cmdOverlay) {
    cmdOverlay.addEventListener('click', (e) => {
      if (e.target === cmdOverlay) toggleCommandPalette();
    });
  }

  document.querySelectorAll('.cmd-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'theme') {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.click();
      } else if (action === 'home') {
        window.location.href = 'index.html';
      }
      toggleCommandPalette();
    });
  });

  // 3. Sidebar Search Filter
  const sidebarSearch = document.getElementById('sidebar-repo-search');
  if (sidebarSearch) {
    sidebarSearch.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      // Target file-items inside the explorer tree (both map and repos)
      document.querySelectorAll('#explorer-tree .file-item').forEach(item => {
        const name = item.textContent.toLowerCase();
        if (name.includes(term)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  // 4. Initializing Graph, Chart, and Palette Repos
  window.initIDEAnalytics = function(allRepos) {
    if (!allRepos || allRepos.length === 0) return;
    
    // Sort and filter out forks for main analytics
    const originalRepos = allRepos.filter(r => !r.fork).sort((a,b) => b.stargazers_count - a.stargazers_count);

    // --- Command Palette Repo Injection ---
    const cmdRepoList = document.getElementById('cmd-repo-list');
    if (cmdRepoList) {
      cmdRepoList.innerHTML = originalRepos.map(r => `
        <button class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-3 transition-colors text-sm cmd-repo-btn group" data-repo="${r.name}">
          <svg class="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          <span class="truncate w-full">${r.name}</span>
        </button>
      `).join('');

      // Filter palette list on type — supports 'search: <query>' prefix
      if (cmdInput) {
        cmdInput.addEventListener('input', (e) => {
          const raw = e.target.value;
          const term = raw.toLowerCase();
          const isSearchMode = term.startsWith('search:');
          const searchQuery = isSearchMode ? term.slice(7).trim() : term;
          let repoCount = 0;

          const header = document.getElementById('cmd-repo-header');
          let noResultsEl = document.getElementById('cmd-no-results');

          // Show/hide command actions
          document.querySelectorAll('.cmd-action').forEach(b => {
            const show = !isSearchMode && b.textContent.toLowerCase().includes(term);
            b.style.display = show ? 'flex' : 'none';
          });

          // Filter repos with highlight
          cmdRepoList.querySelectorAll('.cmd-repo-btn').forEach(b => {
            const repoName = (b.getAttribute('data-repo') || '').toLowerCase();
            const matches = repoName.includes(searchQuery) || (!isSearchMode && b.textContent.toLowerCase().includes(searchQuery));
            b.style.display = matches ? 'flex' : 'none';
            if (matches) repoCount++;

            // Highlight matching text
            const labelEl = b.querySelector('span.truncate');
            if (labelEl && searchQuery) {
              const original = b.getAttribute('data-repo') || '';
              const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
              labelEl.innerHTML = original.replace(regex, '<mark class="bg-primary/30 text-primary rounded px-0.5">$1</mark>');
            } else if (labelEl) {
              labelEl.textContent = b.getAttribute('data-repo') || '';
            }
          });

          if (header) header.style.display = repoCount > 0 ? 'block' : 'none';

          // No results notice
          if (repoCount === 0 && searchQuery) {
            if (!noResultsEl) {
              noResultsEl = document.createElement('div');
              noResultsEl.id = 'cmd-no-results';
              noResultsEl.className = 'px-4 py-3 text-xs text-slate-400 italic';
              cmdRepoList.appendChild(noResultsEl);
            }
            noResultsEl.textContent = `No repositories match "${searchQuery}"...`;
            noResultsEl.style.display = 'block';
          } else if (noResultsEl) {
            noResultsEl.style.display = 'none';
          }

          // Visual cue for search mode
          const cmdHeader = document.querySelector('#cmd-results .px-3.py-1\.5:first-child');
          if (cmdHeader) {
            if (isSearchMode) {
              cmdHeader.textContent = `Semantic Search: "${searchQuery}"`;
              cmdHeader.style.color = '#f20d46';
            } else {
              cmdHeader.textContent = 'Commands';
              cmdHeader.style.color = '';
            }
          }
        });
      }

      // Simulate clicking the explorer tree to open the tab
      cmdRepoList.querySelectorAll('.cmd-repo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
           const repoName = btn.getAttribute('data-repo');
           // Find it in the sidebar
           const sidebarItems = document.querySelectorAll('#explorer-tree .file-item');
           let found = false;
           sidebarItems.forEach(item => {
             if (item.dataset.repo === repoName) {
               item.click();
               found = true;
             }
           });
           
           if(window.logToTerminal) {
               window.logToTerminal(`Received command to open: ${repoName}`, 'system');
           }
           
           toggleCommandPalette();
        });
      });
    }

    // --- Dashboard Stats & Chart ---
    const statTotal = document.getElementById('stat-total-repos');
    const statLang = document.getElementById('stat-top-lang');
    if (statTotal) statTotal.textContent = originalRepos.length;
    
    const langCounts = {};
    originalRepos.forEach(r => { if(r.language) langCounts[r.language] = (langCounts[r.language]||0)+1; });
    let topLang = "-", max = 0;
    for(const l in langCounts) { if(langCounts[l] > max) { max = langCounts[l]; topLang = l; } }
    if (statLang) statLang.textContent = topLang;

    const canvas = document.getElementById('activity-chart');
    if (canvas && window.Chart) {
      // Pick top 6 most updated/recent repos
      const sortedByUpdate = [...originalRepos].sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6);
      
      const chartCtx = canvas.getContext('2d');
      const gradient = chartCtx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // blue-500
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');
      
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: sortedByUpdate.map(r => r.name.length > 12 ? r.name.substring(0,10)+'...' : r.name),
          datasets: [{
            label: 'Commit Frequency (Simulated)',
            data: sortedByUpdate.map(r => Math.max(5, Math.floor(Math.random() * 40) + (r.stargazers_count*2))),
            backgroundColor: gradient,
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 'flex',
            maxBarThickness: 40
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { display: false, beginAtZero: true },
            x: { 
              grid: { display: false }, 
              border: { display: false },
              ticks: { color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b', font: { family: "'Fira Code', monospace", size: 10 } }
            }
          },
          interaction: { mode: 'index', intersect: false },
        }
      });
    }

    // --- Knowledge Graph ---
    const graphContainer = document.getElementById('codebase-graph');
    if (graphContainer && window.vis && window.ENGINE) {
      const loader = document.getElementById('graph-loading');
      if (loader) loader.style.display = 'none';

      const graphData = window.ENGINE.buildCodebaseGraph(originalRepos.slice(0, 16)); // top 16 for clarity
      
      const mappedNodes = graphData.nodes.map(n => ({
        id: n.id,
        label: n.label,
        color: { background: n.color, border: 'rgba(255,255,255,0.1)' },
        font: { color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#1e293b', size: 12, face: 'Inter, sans-serif' },
        shape: n.type === 'project' ? 'dot' : (n.type === 'language' ? 'square' : 'hexagon'),
        size: n.type === 'project' ? 8 : (n.type === 'language' ? 12 : 14),
        borderWidth: 1.5,
      }));

      const container = document.getElementById('codebase-graph');
      const data = { nodes: mappedNodes, edges: graphData.edges.map(e => ({ from: e.source, to: e.target, color: { color: document.documentElement.classList.contains('dark') ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.3)' }, arrows: { to: { enabled: true, scaleFactor: 0.3 } } })) };
      const options = {
        interaction: { hover: true, tooltipDelay: 200, dragView: true, zoomView: true },
        physics: {
          forceAtlas2Based: { gravitationalConstant: -30, centralGravity: 0.003, springLength: 80, springConstant: 0.04 },
          maxVelocity: 40,
          solver: 'forceAtlas2Based',
          timestep: 0.25,
          stabilization: { iterations: 100 }
        }
      };

      new vis.Network(container, data, options);
    }

    // 5. Live GitHub Activity Feed
    initLiveActivityFeed();
  };

  // Expose refresh function globally for the Refresh button in HTML
  window.refreshActivityFeed = initLiveActivityFeed;

  // --- Live Activity Feed ---
  async function initLiveActivityFeed() {
    const feedContainer = document.getElementById('live-activity-feed');
    if (!feedContainer) return;

    // Show loading skeleton
    feedContainer.innerHTML = `
      <div class="space-y-3">
        ${[1,2,3].map(() => `
          <div class="flex items-start gap-3 animate-pulse">
            <div class="w-7 h-7 rounded-full bg-slate-200 shrink-0"></div>
            <div class="flex-1 space-y-1.5">
              <div class="h-3 bg-slate-200 rounded w-3/4"></div>
              <div class="h-2 bg-slate-100 rounded w-1/2"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    try {
      const res = await fetch('https://api.github.com/users/YogamruthReddy/events?per_page=15');
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const events = await res.json();

      if (!events || events.length === 0) {
        feedContainer.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">No recent activity.</p>';
        return;
      }

      feedContainer.innerHTML = events.slice(0, 10).map(ev => {
        const info = getEventDisplay(ev);
        const repo = ev.repo.name.replace('YogamruthReddy/', '');
        const when = timeAgoFeed(new Date(ev.created_at));
        return `
          <div class="flex items-start gap-3 group hover:bg-slate-50 rounded-xl p-2 -mx-2 transition-colors">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${info.bgClass}">${info.icon}</div>
            <div class="flex-1 min-w-0">
              <p class="text-[12px] text-slate-700 font-medium leading-tight truncate">
                ${info.verb} <span class="text-primary font-bold">${repo}</span>
              </p>
              <p class="text-[10px] text-slate-400 mt-0.5">${when}</p>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      feedContainer.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">Could not fetch activity (API rate limit may apply).</p>`;
      console.warn('[IDE] Activity feed fetch failed:', err);
    }
  }

  function getEventDisplay(ev) {
    const types = {
      PushEvent:         { icon: '↑', bgClass: 'bg-emerald-100  text-emerald-600',   verb: 'Pushed to' },
      PullRequestEvent:  { icon: '⑃', bgClass: 'bg-purple-100  text-purple-600',     verb: 'Opened PR in' },
      CreateEvent:       { icon: '+', bgClass: 'bg-sky-100  text-sky-500',               verb: `Created ${ev.payload?.ref_type || 'branch'} in` },
      DeleteEvent:       { icon: '−', bgClass: 'bg-rose-100  text-rose-500',            verb: 'Deleted from' },
      WatchEvent:        { icon: '★', bgClass: 'bg-yellow-100  text-yellow-500',      verb: 'Starred' },
      ForkEvent:         { icon: '⑂', bgClass: 'bg-indigo-100  text-indigo-500',     verb: 'Forked' },
      IssuesEvent:       { icon: '!', bgClass: 'bg-orange-100  text-orange-500',     verb: 'Opened issue in' },
      IssueCommentEvent: { icon: '…', bgClass: 'bg-slate-100  text-slate-500',           verb: 'Commented in' },
      ReleaseEvent:      { icon: '🚀', bgClass: 'bg-emerald-100  text-emerald-600', verb: 'Released in' },
      PublicEvent:       { icon: '🌐', bgClass: 'bg-sky-100  text-sky-500',             verb: 'Made public' },
    };
    return types[ev.type] || { icon: '•', bgClass: 'bg-slate-100  text-slate-400', verb: ev.type.replace('Event','') + ' in' };
  }

  function timeAgoFeed(date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  // 5. AI Explainer UI Simulation
  window.simulateAIExplanation = function(repoName) {
    if (window.logToTerminal) {
      window.logToTerminal(`Initiated AI Code Analysis for architecture of ${repoName}...`, 'info');
    }
    
    // Check if the AI AI chat panel exists
    const chatPanel = document.getElementById('ai-chat-history');
    if (!chatPanel) return;

    // Open chat sidebar if it's hidden on mobile
    const aiSidebar = chatPanel.closest('aside');
    if (aiSidebar) {
      aiSidebar.classList.remove('hidden');
      aiSidebar.classList.add('flex'); // Ensure it's showing if they manually toggle it normally
    }
    
    // Add User Message
    const userMsg = document.createElement('div');
    userMsg.className = "flex gap-3 items-start justify-end group animate-fadeIn";
    userMsg.innerHTML = `
      <div class="bg-primary text-white border border-primary/20 p-3 rounded-2xl rounded-tr-sm text-[13px] shadow-sm font-sans max-w-[85%]">
        <p class="leading-relaxed">Please explain the architecture for <strong>${repoName}</strong>.</p>
      </div>
      <div class="w-7 h-7 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 shadow-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
      </div>
    `;
    chatPanel.appendChild(userMsg);
    chatPanel.scrollTop = chatPanel.scrollHeight;

    // Add Thinking Bubble
    const aiMsgId = 'ai-msg-' + Date.now();
    const aiThinking = document.createElement('div');
    aiThinking.id = aiMsgId;
    aiThinking.className = "flex gap-3 items-start group mt-4";
    aiThinking.innerHTML = `
      <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </div>
      <div class="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm text-[13px] text-slate-700 shadow-sm font-sans flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 150ms;"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 300ms;"></span>
      </div>
    `;
    chatPanel.appendChild(aiThinking);
    chatPanel.scrollTop = chatPanel.scrollHeight;

    // Simulate Network/Thinking delay
    setTimeout(() => {
      const el = document.getElementById(aiMsgId);
      if (el) {
        el.innerHTML = `
          <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div class="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm text-[13px] text-slate-700 shadow-sm font-sans flex flex-col gap-2 w-[85%]">
            <p>Based on static analysis of <strong>${repoName}</strong>, the repository is structured into distinct modular components. It uses automated CI/CD pipelines, separates the business logic from presentation, and implements strong typing schemas.</p>
            <div class="p-2 mt-2 bg-slate-50 border border-slate-200 rounded-md">
               <pre class="text-[10px] text-emerald-600 m-0 font-mono overflow-x-auto">
// Analysis Complete
status: 200 OK
language: auto-detected
architecture: modular-monolith
confidence: 0.94</pre>
            </div>
          </div>
        `;
        chatPanel.scrollTop = chatPanel.scrollHeight;
        if (window.logToTerminal) {
          window.logToTerminal(`AI Analysis returned for ${repoName}.`, 'success');
        }
      }
    }, 1800);
  };
});
