/**
 * AI Assistant Panel Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const chatHistory = document.getElementById('ai-chat-history');
  const chatInput = document.getElementById('ai-chat-input');
  const chatSend = document.getElementById('ai-chat-send');
  
  if (!chatHistory || !chatInput || !chatSend) return;

  // Quick prompt buttons
  document.querySelectorAll('.ai-prompt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prompt = e.currentTarget.textContent;
      sendChatMessage(prompt);
      chatInput.value = '';
    });
  });

  chatSend.addEventListener('click', () => {
    if (chatInput.value.trim()) {
      sendChatMessage(chatInput.value.trim());
      chatInput.value = '';
      chatInput.style.height = 'auto'; // Reset height
    }
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.value.trim()) {
        sendChatMessage(chatInput.value.trim());
        chatInput.value = '';
        chatInput.style.height = 'auto';
      }
    }
  });

  // ─── RAG: KNOWNLEDGE GATHERING & CHUNKING ──────────────────────────────────
  
  function chunkText(text, size = 400) {
    if (!text) return [];
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }

  async function getKnowledgeIndex() {
    let indexData = localStorage.getItem("rag_vector_index");
    if (indexData) {
      return JSON.parse(indexData);
    }
    
    // Build index if it doesn't exist
    if (window.logToTerminal) window.logToTerminal("Building local RAG vector index...", "system");
    
    const repos = window.ENGINE ? await window.ENGINE.getRepos() : [];
    const topRepos = window.ENGINE ? window.ENGINE.getTopRepos(repos, 5) : []; // Index top 5 for speed
    
    const newIndex = [];
    
    for (const repo of topRepos) {
      // Index Repo Description
      const descText = `${repo.name}: ${repo.description || 'No description.'}`;
      newIndex.push({ repo: repo.name, text: descText, type: 'metadata' });
      
      // Index README chunks
      const readme = window.ENGINE ? await window.ENGINE.fetchReadme(repo.name) : null;
      if (readme) {
        const chunks = chunkText(readme, 400);
        chunks.forEach((chunk, idx) => {
          newIndex.push({ repo: repo.name, text: chunk, type: 'readme', chunkId: idx });
        });
      }
    }
    
    try {
      localStorage.setItem("rag_vector_index", JSON.stringify(newIndex));
      if (window.logToTerminal) window.logToTerminal(`Index built with ${newIndex.length} knowledge chunks.`, "success");
    } catch (e) {
      console.warn("Could not save vector index to localStorage (might be too large).", e);
    }
    
    return newIndex;
  }

  // ─── RAG: SEMANTIC SEARCH (MOCKED PIPELINE) ────────────────────────────────
  
  // In production, this calls a real embedding endpoint
  // async function embedText(text) {
  //   const res = await fetch("/api/embed", { method: "POST", body: JSON.stringify({text}) });
  //   const data = await res.json();
  //   return data.vector;
  // }
  
  // Simulated TF-IDF overlap to fake "Semantic Cosine Similarity" without an ML model
  function calculateMockSimilarity(query, text) {
    const words = query.toLowerCase().split(/\\W+/).filter(w => w.length > 2);
    let score = 0;
    const target = (text || "").toLowerCase();
    words.forEach(w => {
      if (target.includes(w)) score += 1.0;
    });
    return score;
  }

  async function performVectorSearch(question) {
    const knowledgeIndex = await getKnowledgeIndex();
    
    // In production, we'd compare cosine similarities of vectors here.
    const ranked = knowledgeIndex.map(chunk => {
       return {
          ...chunk,
          score: calculateMockSimilarity(question, chunk.text)
       };
    }).sort((a, b) => b.score - a.score);
    
    // Return top 3 most relevant context chunks
    return ranked.slice(0, 3).filter(r => r.score > 0);
  }

  // ─── CHAT INTERFACE & LLM MOCK ──────────────────────────────────────────────
  
  async function sendChatMessage(text) {
    // 1. Add User Message
    const userMsg = document.createElement('div');
    userMsg.className = "flex gap-3 items-end justify-end group mt-4";
    userMsg.innerHTML = `
      <div class="bg-primary text-white p-3 rounded-2xl rounded-tr-sm text-[13px] shadow-sm max-w-[85%] font-sans">
        <p class="leading-relaxed">${escapeHtml(text)}</p>
      </div>
    `;
    chatHistory.appendChild(userMsg);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // 2. Add "Typing/Searching" indicator
    const aiContextMsg = document.createElement('div');
    aiContextMsg.className = "flex gap-3 items-start group mt-4";
    aiContextMsg.innerHTML = `
      <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <div class="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm text-[13px] text-slate-700 shadow-sm flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
        </div>
        <span class="text-[10px] text-slate-400 animate-pulse" id="rag-status">Searching vector embeddings...</span>
      </div>
    `;
    chatHistory.appendChild(aiContextMsg);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Simulate RAG pipeline latency
    await new Promise(r => setTimeout(r, 600));
    const statusText = document.getElementById('rag-status');
    
    // 3. Perform Vector Search
    const topChunks = await performVectorSearch(text);
    
    if (statusText) statusText.innerText = "Injecting context into prompt...";
    await new Promise(r => setTimeout(r, 500));

    // Remove typing
    aiContextMsg.remove();
    
    // 4. Generate LLM Response based on injected Context
    const responseText = await generateMockLLMResponse(text, topChunks);
    
    // Optional: Log context chunks to Terminal to show how RAG works
    if (topChunks.length > 0 && window.logToTerminal) {
       window.logToTerminal(`[RAG] Found ${topChunks.length} relevant context chunks from GitHub.`, "system");
    }

    const aiResponse = document.createElement('div');
    aiResponse.className = "flex gap-3 items-start group mt-4 transition-all";
    aiResponse.innerHTML = `
      <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <div class="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm text-[13px] text-slate-700 shadow-sm font-sans flex flex-col gap-2 relative">
        <p class="leading-relaxed whitespace-pre-line">${responseText}</p>
        
        ${topChunks.length > 0 ? `
        <div class="mt-2 pt-2 border-t border-slate-100">
          <p class="text-[10px] text-slate-400 mb-1">Citations:</p>
          <div class="flex flex-wrap gap-1">
            ${topChunks.map(c => `<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">${c.repo} (${c.type})</span>`).join('')}
          </div>
        </div>
        ` : ''}
        
        <span class="text-[9px] text-slate-400 absolute" style="bottom:-18px; right:4px">Engine v4 - RAG Modal</span>
      </div>
    `;
    chatHistory.appendChild(aiResponse);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  async function generateMockLLMResponse(query, contextChunks) {
    const q = query.toLowerCase();
    
    // In production:
    // const prompt = \`Context: \${JSON.stringify(contextChunks)} \\n\\n Question: \${query}\`;
    // const response = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({prompt}) });
    
    if (contextChunks.length > 0) {
      // Pull heavily from the injected vector context to prove RAG works
      const bestChunk = contextChunks[0];
      return `Based on your semantic search, this matches the repository **${bestChunk.repo}**.\n\nAccording to my injected file context:\n"${bestChunk.text.slice(0, 150)}..."\n\nI can verify that this project aligns closely with your question. In a full deployment, an LLM would synthesize this chunk into a conversational answer.`;
    }

    if (q.includes('tech stack') || q.includes('technologies')) {
      const skills = window.ENGINE ? window.ENGINE.getEngineCache().skills : null;
      let extra = skills ? ` Based on my repo analysis, I frequently use ${Array.from(skills).slice(0, 5).join(', ')}.` : "";
      return "My core stack focuses on modern web and system development. I rely heavily on Python, JavaScript/Node.js, HTML/CSS, and various frameworks depending on the project." + extra;
    }

    return "I couldn't find a direct match in the vector index for that query. If you ask about a specific project (like 'OS Simulation' or 'BioShield'), I will retrieve its README chunks and answer you contextually!";
  }
});
