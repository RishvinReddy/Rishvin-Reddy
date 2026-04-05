/**
 * Terminal Simulator for AI Portfolio Engine v4.0
 * Full interactive shell with repo search, graph, explain, and activity commands
 */

// Make logToTerminal available globally so other scripts can use it
window.logToTerminal = function(message, type = "info") {
  const terminalOutput = document.getElementById('terminal-output');
  if (!terminalOutput) return;

  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  
  let colorClass = "text-slate-500 ";
  if (type === "success") colorClass = "text-emerald-500";
  if (type === "error") colorClass = "text-rose-500";
  if (type === "warning") colorClass = "text-yellow-500";
  if (type === "system") colorClass = "text-indigo-500";
  if (type === "ai") colorClass = "text-amber-400";

  const logEl = document.createElement('div');
  logEl.className = `mb-1 ${colorClass} text-[13px] opacity-90`;
  logEl.innerHTML = `<span class="text-slate-400 opacity-50 mr-2">[${timestamp}]</span> ${message}`;
  
  // Insert before the input line if it exists
  const inputLine = terminalOutput.lastElementChild;
  if (inputLine && inputLine.tagName === 'DIV' && inputLine.querySelector('input')) {
    terminalOutput.insertBefore(logEl, inputLine);
  } else {
    terminalOutput.appendChild(logEl);
  }
  
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
};

document.addEventListener('DOMContentLoaded', () => {
  const terminalOutput = document.getElementById('terminal-output');
  const terminalInput = document.getElementById('terminal-input');
  
  if (!terminalOutput || !terminalInput) return;

  // Command history for ↑/↓ navigation
  let cmdHistory = [];
  let historyIdx = -1;

  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIdx < cmdHistory.length - 1) {
        historyIdx++;
        terminalInput.value = cmdHistory[cmdHistory.length - 1 - historyIdx];
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        historyIdx--;
        terminalInput.value = cmdHistory[cmdHistory.length - 1 - historyIdx];
      } else {
        historyIdx = -1;
        terminalInput.value = '';
      }
      return;
    }

    if (e.key === 'Enter') {
      const command = terminalInput.value.trim();
      if (!command) return;

      // Add to history
      cmdHistory.push(command);
      historyIdx = -1;

      // Echo command with prompt styling
      const cmdEl = document.createElement('div');
      cmdEl.className = 'mb-1 text-slate-800 ';
      cmdEl.innerHTML = `<span class="text-emerald-500">➜</span> <span class="text-blue-400 font-bold">portfolio</span> <span class="text-slate-400">git:(</span><span class="text-rose-400 font-bold">main</span><span class="text-slate-400">)</span> ${command}`;
      terminalOutput.insertBefore(cmdEl, terminalOutput.lastElementChild);

      processCommand(command);

      terminalInput.value = '';
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
  });

  function processCommand(cmd) {
    const parts = cmd.trim().split(/\s+/);
    const base = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (base) {
      case 'help':
        printHelp();
        break;

      case 'clear':
        while (terminalOutput.children.length > 1) {
          terminalOutput.removeChild(terminalOutput.firstChild);
        }
        break;

      case 'whoami':
        window.logToTerminal(`<span class="text-indigo-400 font-bold">Yogamruth Reddy</span> — AI/ML & IoT Engineer | Hyderabad, India`, "info");
        break;

      case 'repos':
        cmdRepos();
        break;

      case 'stats':
        cmdStats();
        break;

      case 'skills':
        cmdSkills();
        break;

      case 'search':
        if (!arg) {
          window.logToTerminal(`Usage: <span class="text-yellow-400">search &lt;query&gt;</span> — e.g., "search python"`, "warning");
        } else {
          cmdSearch(arg);
        }
        break;

      case 'graph':
        cmdGraph();
        break;

      case 'explain':
        if (!arg) {
          window.logToTerminal(`Usage: <span class="text-yellow-400">explain &lt;repo-name&gt;</span>`, "warning");
        } else {
          cmdExplain(arg);
        }
        break;

      case 'activity':
        cmdActivity();
        break;

      case 'open':
        if (!arg) {
          window.logToTerminal(`Usage: <span class="text-yellow-400">open &lt;repo-name&gt;</span>`, "warning");
        } else {
          cmdOpen(arg);
        }
        break;

      case 'ls':
        cmdRepos();
        break;

      default:
        window.logToTerminal(`<span class="text-rose-400">Command not found:</span> ${base}. Type <span class="text-emerald-400 font-bold">help</span> for available commands.`, "error");
    }
  }

  // ── Command Handlers ────────────────────────────────────────

  function printHelp() {
    const cmds = [
      { cmd: 'help', desc: 'Show this help message' },
      { cmd: 'repos / ls', desc: 'List top repositories' },
      { cmd: 'stats', desc: 'Show GitHub portfolio statistics' },
      { cmd: 'skills', desc: 'Show top languages by repo count' },
      { cmd: 'search &lt;query&gt;', desc: 'Semantic search across repositories' },
      { cmd: 'graph', desc: 'Open the interactive Codebase Map' },
      { cmd: 'explain &lt;repo&gt;', desc: 'Trigger AI architecture explanation' },
      { cmd: 'open &lt;repo&gt;', desc: 'Open a repository in the editor' },
      { cmd: 'activity', desc: 'Show live GitHub activity feed' },
      { cmd: 'whoami', desc: 'Display developer identity' },
      { cmd: 'clear', desc: 'Clear terminal output' },
    ];

    window.logToTerminal(`<span class="text-indigo-400 font-bold">AI Portfolio Engine v4.0</span> — Available Commands:`, "system");
    cmds.forEach(c => {
      window.logToTerminal(`  <span class="text-emerald-400 font-mono w-32 inline-block">${c.cmd}</span> <span class="text-slate-400">— ${c.desc}</span>`, "info");
    });
  }

  function cmdRepos() {
    if (!window.ENGINE) return noEngine();
    const cache = window.ENGINE.getEngineCache();
    const reps = window.ENGINE.getTopRepos(cache.repos || [], 8);
    if (!reps.length) { window.logToTerminal("No repositories cached yet. Reload the page.", "warning"); return; }
    window.logToTerminal(`<span class="text-indigo-400 font-bold">Top Repositories:</span>`, "system");
    reps.forEach((r, i) => {
      window.logToTerminal(`  <span class="text-slate-400">${String(i+1).padStart(2,'0')}</span>  <span class="text-sky-400 font-bold">${r.name}</span>  <span class="text-slate-500">${r.language || '?'}</span>  <span class="text-yellow-400">⭐ ${r.stargazers_count}</span>`, "info");
    });
  }

  function cmdStats() {
    if (!window.ENGINE) return noEngine();
    const cache = window.ENGINE.getEngineCache();
    const st = window.ENGINE.calculateStats(cache.repos || []);
    window.logToTerminal(`<span class="text-indigo-400 font-bold">Portfolio Stats:</span>`, "system");
    window.logToTerminal(`  Total Repos    <span class="text-white font-bold">${st.totalRepos}</span>`, "info");
    window.logToTerminal(`  Original Repos <span class="text-white font-bold">${st.originalRepos}</span>`, "info");
    window.logToTerminal(`  Total ⭐ Stars  <span class="text-yellow-400 font-bold">${st.totalStars}</span>`, "info");
    window.logToTerminal(`  Total Forks    <span class="text-white font-bold">${st.totalForks}</span>`, "info");
    window.logToTerminal(`  Languages Used <span class="text-emerald-400 font-bold">${st.languageCount}</span>`, "info");
  }

  function cmdSkills() {
    if (!window.ENGINE) return noEngine();
    const cache = window.ENGINE.getEngineCache();
    const sk = window.ENGINE.detectSkills(cache.repos || []).slice(0, 8);
    if (!sk.length) { window.logToTerminal("No language data yet. Repos may be loading.", "warning"); return; }
    window.logToTerminal(`<span class="text-indigo-400 font-bold">Top Languages:</span>`, "system");
    sk.forEach(s => {
      const bar = '█'.repeat(Math.min(s.count * 2, 20));
      window.logToTerminal(`  <span class="text-sky-400 font-mono w-16 inline-block">${s.lang}</span> <span class="text-primary">${bar}</span> <span class="text-slate-400">${s.count} repos</span>`, "info");
    });
  }

  function cmdSearch(query) {
    if (!window.ENGINE) return noEngine();
    const cache = window.ENGINE.getEngineCache();
    const results = window.ENGINE.searchRepos(cache.repos || [], query);
    if (!results.length) {
      window.logToTerminal(`No repositories found matching "<span class="text-yellow-400">${query}</span>".`, "warning");
      return;
    }
    window.logToTerminal(`<span class="text-indigo-400 font-bold">Search results for "${query}":</span>`, "system");
    results.slice(0, 6).forEach(r => {
      window.logToTerminal(`  <span class="text-sky-400 font-bold">${r.name}</span>  <span class="text-slate-500 text-[11px]">${(r.description || 'No description').substring(0, 60)}</span>`, "info");
    });
    if (results.length > 6) {
      window.logToTerminal(`  … and ${results.length - 6} more. Refine your query.`, "info");
    }
  }

  function cmdGraph() {
    // Try to find the Codebase Map item and click it
    const mapItem = document.querySelector('#explorer-tree .file-item[data-repo="Codebase Map"]');
    if (mapItem) {
      mapItem.click();
      window.logToTerminal(`Opening Interactive Codebase Map...`, "success");
    } else {
      window.logToTerminal(`Codebase Map not ready. Repos may still be loading.`, "warning");
    }
  }

  function cmdExplain(repoName) {
    if (window.simulateAIExplanation) {
      window.simulateAIExplanation(repoName);
      window.logToTerminal(`Triggered AI architecture analysis for <span class="text-sky-400 font-bold">${repoName}</span>. Check the AI panel →`, "ai");
    } else {
      window.logToTerminal(`AI explainer not initialized yet.`, "warning");
    }
  }

  function cmdOpen(repoName) {
    const targetItem = document.querySelector(`#explorer-tree .file-item[data-repo="${repoName}"]`);
    if (targetItem) {
      targetItem.click();
      window.logToTerminal(`Opening <span class="text-sky-400 font-bold">${repoName}</span> in editor...`, "success");
    } else {
      window.logToTerminal(`Repository "<span class="text-yellow-400">${repoName}</span>" not found in explorer. Try <span class="text-emerald-400">repos</span> to see available ones.`, "warning");
    }
  }

  async function cmdActivity() {
    window.logToTerminal(`Fetching live GitHub events for <span class="text-sky-400">YogamruthReddy</span>...`, "info");
    try {
      const res = await fetch('https://api.github.com/users/YogamruthReddy/events?per_page=10');
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const events = await res.json();
      if (!events.length) { window.logToTerminal("No recent activity found.", "warning"); return; }
      
      window.logToTerminal(`<span class="text-indigo-400 font-bold">Recent GitHub Activity:</span>`, "system");
      events.slice(0, 8).forEach(ev => {
        const type = formatEventType(ev.type);
        const repo = ev.repo.name.replace('YogamruthReddy/', '');
        const when = timeAgo(new Date(ev.created_at));
        window.logToTerminal(`  ${type.icon} <span class="text-slate-400 text-[11px]">${type.label}</span>  <span class="text-sky-400">${repo}</span>  <span class="text-slate-500 text-[10px]">(${when})</span>`, "info");
      });
    } catch (err) {
      window.logToTerminal(`Failed to fetch activity: ${err.message}. API rate limit may apply.`, "error");
    }
  }

  function noEngine() {
    window.logToTerminal("Portfolio Engine not initialised yet. Please wait.", "warning");
  }

  function formatEventType(type) {
    const map = {
      PushEvent:            { icon: '<span class="text-emerald-400">↑</span>', label: 'push' },
      PullRequestEvent:     { icon: '<span class="text-purple-400">⑃</span>', label: 'pull request' },
      CreateEvent:          { icon: '<span class="text-sky-400">+</span>',  label: 'create' },
      DeleteEvent:          { icon: '<span class="text-rose-400">−</span>', label: 'delete' },
      WatchEvent:           { icon: '<span class="text-yellow-400">⭐</span>', label: 'starred' },
      ForkEvent:            { icon: '<span class="text-indigo-400">⑂</span>', label: 'fork' },
      IssuesEvent:          { icon: '<span class="text-orange-400">!</span>', label: 'issue' },
      IssueCommentEvent:    { icon: '<span class="text-slate-400">💬</span>', label: 'comment' },
      ReleaseEvent:         { icon: '<span class="text-emerald-400">🚀</span>', label: 'release' },
      PublicEvent:          { icon: '<span class="text-sky-400">🌐</span>', label: 'made public' },
    };
    return map[type] || { icon: '<span class="text-slate-400">•</span>', label: type.replace('Event','') };
  }

  function timeAgo(date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff/60)}m ago`;
    if (diff < 86400) return `${Math.round(diff/3600)}h ago`;
    return `${Math.round(diff/86400)}d ago`;
  }
});
