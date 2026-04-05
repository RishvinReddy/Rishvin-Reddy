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

  // ─── RAG: SEMANTIC VECTOR DB SEARCH (LOCAL MEMORY) ────────────────────────
  
  function calculateMockSimilarity(query, tokens) {
    if (!tokens) return 0;
    const qWords = query.toLowerCase().split(/\\W+/).filter(w => w.length > 2);
    let score = 0;
    qWords.forEach(w => {
      if (tokens.includes(w)) score += 1.0;
    });
    return score;
  }

  async function performVectorSearch(question) {
    // Ensure Vector DB is loaded globally
    if (!window.APP || !window.APP.contextDB || window.APP.contextDB.length === 0) {
       if (window.ENGINE && window.ENGINE.buildAIContext) {
          await window.ENGINE.buildAIContext();
       } else {
          return [];
       }
    }
    
    const knowledgeIndex = window.APP.contextDB || [];
    
    // Calculate TD-IDF style score (Mocked)
    const ranked = knowledgeIndex.map(chunk => {
       return {
          ...chunk,
          score: calculateMockSimilarity(question, chunk.tokens)
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
    
    // Knowledge Base Context injection
    const HIDDEN_CONTEXT = `Erolla Rishvin Reddy is an IoT Engineer, Cybersecurity Enthusiast, and Blockchain Developer. Co-inventor of an IoT Connectivity Device patent.`;
    
    // In production:
    // const prompt = `Context: ${JSON.stringify(contextChunks)} \\n Knowledge Base: ${HIDDEN_CONTEXT} \\n\\n Question: ${query}`;
    // const response = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({prompt}) });
    
    if(q.includes("patent")){
      return `Rishvin is a co-inventor of a Government of India registered design patent for an IoT Connectivity Device (Design No. 470097-001).`;
    }
    
    if (q.includes("who is") || q.includes("who are") || q.includes("identity") || q.includes("about rishvin")) {
      return `Erolla Rishvin Reddy is an IoT Engineer, Cybersecurity Enthusiast, and Blockchain Developer based in Hyderabad, India. He is notably a co-inventor of a Government of India registered design patent for an IoT Connectivity Device and specializes in secure, scalable systems.`;
    }

    // ─── RESUME GENERATOR INTEGRATION ───
    if (q.includes("resume") || q.includes("generate resume")) {
       if (window.ENGINE && window.ENGINE.generateResumeSystem) {
          const res = window.ENGINE.generateResumeSystem("Software Engineer");
          return `I have dynamically generated a resume based on the current GitHub analysis:\n\n<div class="mt-3 p-3 bg-slate-100 rounded-md border border-slate-200 shadow-inner overflow-x-auto custom-scrollbar"><pre class="text-[10px] text-slate-700 font-mono m-0 whitespace-pre leading-relaxed">${escapeHtml(res)}</pre></div>\n\n*In a full deployment, this would trigger a PDF download.*`;
       }
    }

    if (q.includes('tech stack') || q.includes('technologies')) {
      const skills = window.APP && window.APP.tools ? Array.from(window.APP.tools) : [];
      let extra = skills.length ? ` My telemetry detects heavy usage of: **${skills.slice(0, 6).join(', ')}**.` : "";
      return "My core stack focuses on modern web and system development. I rely heavily on Python, JavaScript/Node.js, HTML/CSS, and various frameworks depending on the project." + extra;
    }

    if (contextChunks.length > 0) {
      // ─── "REAL INTELLIGENCE" CODE EXPLAINER LOGIC ───
      const bestChunk = contextChunks[0];
      
      let repoDetails = null;
      if (window.APP && window.APP.repos) {
         repoDetails = window.APP.repos.find(r => r.name === bestChunk.repo);
      }
      
      let explainStr = `Based on semantic vector search, this matches **${bestChunk.repo}**.\n\n`;
      
      if (repoDetails) {
         const classification = window.ENGINE ? window.ENGINE.classifyRepo(repoDetails) : "Software";
         explainStr += `**Architecture Context:** Written primarily in ${repoDetails.language || "multiple languages"}, this project has ${repoDetails.stargazers_count} stars and is classified as a ${classification} system.\n\n`;
      }
      
      // Provide a "deep read" summary of the chunk instead of just dumping text
      if (bestChunk.type === 'readme') {
         explainStr += `**AI Synthesis:** My read of the documentation implies this module handles structured capabilities. Here is the exact extracted context:\n\n> "${bestChunk.text.slice(0, 150)}..."\n\n`;
      }
      
      explainStr += `*In a production DevOS, an LLM would stream a line-by-line explanation over this context tree.*`;
      
      return explainStr;
    }

    return "I couldn't find a direct match in the vector index for that query. If you ask about a specific project (like 'OS Simulation' or 'BioShield'), I will retrieve its README chunks and answer you contextually!";
  }

  // Expose to window for external IDE triggers (e.g., Code Explainer button)
  window.sendAIChatMessage = sendChatMessage;

});
