// The Hindu UI Transformer
console.log("SinkIt: The Hindu UI Transformer Injected - AI Edition with CSP Bypass");

async function generateAISummary() {
    const title = document.querySelector('h1')?.textContent || document.title || 'This Article';
    const contentBody = document.querySelector('article') || document.querySelector('[itemprop="articleBody"]') || document.querySelector('.article-body') || document.querySelector('.article') || document.body;
    let allText = "No content found.";
    
    if (contentBody) {
        const clone = contentBody.cloneNode(true);
        const refElements = clone.querySelectorAll('.advertisement, .social-share, footer, nav, aside, .related-articles, .comments, .ad, script, style, .share-block, .related-topics');
        refElements.forEach(el => el.remove());
        // Gemini handles a lot of context, let's pass a decent chunk of the page
        allText = clone.textContent.replace(/\s+/g, ' ').substring(0, 30000); 
    }
    
    const prompt = `You are an expert summarizer. Read the following news article about "${title}" and provide a highly comprehensive summary. 
    You must extract many data points because these articles are long. Extract AT LEAST 8-12 key points and AT LEAST 5-8 trending/important topics.
    Provide the response exactly in this JSON format, nothing else (no markdown blocks, just raw JSON):
    {
      "overview": "A concise 2-sentence overview",
      "key_points": [
        "Key point 1 carefully extracted from the whole text", 
        "Key point 2...", 
        "... generate as many key points as necessary to cover the entire page comprehensively (at least 8-10)"
      ],
      "trending_topics": [
        "Trending term/topic 1", 
        "Important topic 2", 
        "... generate 5 to 8 important topics"
      ],
      "topic_summaries": [
        {"topic": "Trending term/topic 1", "summary": "1-sentence summary of this topic"},
        {"topic": "Important topic 2", "summary": "1-sentence summary of this topic"}
        // ... one object for EVERY trending/important topic identified
      ]
    }
    
    Article Text:
    ${allText}
    `;

    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'fetch_ai', prompt: prompt }, (res) => {
                if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(res);
                }
            });
        });

        if (response && response.success) {
            return response.data;
        } else {
            console.error("SinkIt AI Error from background:", response?.error);
            return {
                overview: "AI API encountered an error. Check Gemini API key in background.js.",
                key_points: ["Wikipedia blocked the request", "Issue with the AI parser"],
                trending_topics: ["Error"],
                topic_summaries: [{"topic": "Error", "summary": "Logs: " + (response?.error || 'Unknown messaging error')}]
            };
        }
    } catch (e) {
        console.error("SinkIt AI Extension Messaging Error:", e);
        return {
            overview: "AI processing failed abruptly.",
            key_points: ["Check network connection", "Message passing to background script failed."],
            trending_topics: ["Exception"],
            topic_summaries: [{"topic": "Exception", "summary": e.toString()}]
        };
    }
}

async function activateQuickInfo() {
    if (document.getElementById('sinkit-quick-info-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'sinkit-quick-info-banner';
    
    // Initial loading state
    banner.innerHTML = `
        <div class="sinkit-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:15px;">
            <div>
                <h3 style="margin:0; font-size:22px; color:#1f80e0;">✨ AI Quick Scan</h3>
                <small style="color:#666; font-weight:bold;">Reading entire page via AI...</small>
            </div>
            <div style="display:flex; gap: 10px;">
                <button id="sinkit-download-scan-btn" style="background:#00a859; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; display:none;">Download PDF</button>
                <button id="sinkit-close-btn" style="background:#333; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">Close</button>
            </div>
        </div>
        <div class="sinkit-summary-content" style="text-align:center; padding: 20px;">
            <p style="font-size: 16px; color: #666;">🧠 Analyzing overview, extracting key points, and discovering impact...</p>
            <div style="margin-top: 15px; width: 100%; height: 6px; background: #eee; border-radius: 4px; overflow: hidden; position: relative;">
                <div id="sinkit-loader-bar" style="position: absolute; left: 0; top: 0; width: 30%; height: 100%; background: #1f80e0; border-radius: 4px;"></div>
            </div>
        </div>
    `;
    
    banner.style.position = 'fixed';
    banner.style.top = '25px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.width = '750px';
    banner.style.maxWidth = '95%';
    banner.style.background = '#ffffff';
    banner.style.border = '1px solid #ddd';
    banner.style.borderRadius = '12px';
    banner.style.padding = '25px';
    banner.style.boxShadow = '0 15px 40px rgba(0,0,0,0.3)';
    banner.style.zIndex = '9999999';
    banner.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    document.body.appendChild(banner);
    document.body.classList.add('sinkit-quick-mode-active');
    
    // Animate loader securely without CSS keyframes
    let loaderPos = -30;
    const loaderInterval = setInterval(() => {
        const bar = document.getElementById('sinkit-loader-bar');
        if (bar) {
            loaderPos += 2;
            if (loaderPos > 100) loaderPos = -30;
            bar.style.left = loaderPos + '%';
        } else {
            clearInterval(loaderInterval);
        }
    }, 20);
    
    const content = document.getElementById('content');
    if (content) {
        content.style.filter = 'blur(6px)';
        content.style.opacity = '0.4';
    }
    
    document.getElementById('sinkit-close-btn').addEventListener('click', () => {
        clearInterval(loaderInterval);
        banner.remove();
        document.body.classList.remove('sinkit-quick-mode-active');
        if (content) {
            content.style.filter = 'none';
            content.style.opacity = '1';
        }
        window.dispatchEvent(new Event('SinkIt_ResetMode'));
    });

    // Fetch actual AI data
    const summaryData = await generateAISummary();
    clearInterval(loaderInterval);
    
    if (!document.getElementById('sinkit-quick-info-banner')) return;

    let pointsHtml = summaryData.key_points ? summaryData.key_points.map(p => `<li style="margin-bottom: 8px;">${p}</li>`).join('') : '';
    let trendingHtml = summaryData.trending_topics ? summaryData.trending_topics.map(t => `<span style="display:inline-block; background:#1f80e0; color:white; padding:4px 8px; border-radius:4px; font-size:13px; margin:2px 4px 2px 0;">#${t}</span>`).join('') : '';
    let summariesHtml = summaryData.topic_summaries ? summaryData.topic_summaries.map(ts => `<div style="margin-bottom:10px;"><strong style="color:#00a859;">${ts.topic}:</strong> ${ts.summary}</div>`).join('') : '';

    document.querySelector('.sinkit-summary-content').innerHTML = `
        <div style="background: #f9f9f9; padding: 12px; border-left: 4px solid #1f80e0; margin-bottom: 15px; text-align: left;">
            <p style="margin: 0; font-size: 16px;"><strong>Overview:</strong> ${summaryData.overview}</p>
        </div>
        
        <div style="margin-bottom: 15px; text-align: left;">
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #444; font-size: 16px;">🔥 Trending & Important Topics:</p>
            <div>${trendingHtml}</div>
        </div>

        <div style="background: #fff8e1; padding: 12px; border-left: 4px solid #ffcc00; margin-bottom: 15px; text-align: left;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #ff9900; font-size: 16px;">📝 Topic Summaries</p>
            <div style="font-size: 14px; color: #555;">${summariesHtml}</div>
        </div>
        
        <p style="margin-bottom: 5px; font-weight: bold; color: #444; font-size: 16px; text-align: left;">🔑 AI Extracted Key Points:</p>
        <ul style="margin-top: 5px; padding-left: 20px; color: #444; font-size: 15px; text-align: left;">
            ${pointsHtml}
        </ul>
    `;
    
    const subt = banner.querySelector('small');
    if (subt) {
        subt.textContent = "AI Analysis Complete ✨";
        subt.style.color = "#00a859";
    }

    // Enable PDF Download
    const downloadBtn = document.getElementById('sinkit-download-scan-btn');
    if (downloadBtn) {
        downloadBtn.style.display = 'block';
        downloadBtn.onclick = () => {
            document.body.classList.add('sinkit-printing-quick-scan');
            setTimeout(() => {
                window.print();
                document.body.classList.remove('sinkit-printing-quick-scan');
            }, 150);
        };
    }
}

async function generateAITopics() {
    const title = document.querySelector('h1')?.textContent || document.title || 'This Topic';
    const contentBody = document.querySelector('article') || document.querySelector('[itemprop="articleBody"]') || document.querySelector('.article-body') || document.querySelector('.article') || document.body;
    let allText = "No content found.";
    
    if (contentBody) {
        const clone = contentBody.cloneNode(true);
        const refElements = clone.querySelectorAll('.advertisement, .social-share, footer, nav, aside, .related-articles, .comments, .ad, script, style, .share-block, .related-topics');
        refElements.forEach(el => el.remove());
        allText = clone.textContent.replace(/\s+/g, ' ').substring(0, 30000); 
    }
    
    const prompt = `You are a specialized AI. Read the following article about "${title}". 
    Extract the 5-10 most important trending or key topics discussed.
    Provide the response EXACTLY in this JSON array format of strings, nothing else:
    ["Topic 1", "Topic 2", "Topic 3"]
    
    Article Text:
    ${allText}
    `;

    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'fetch_ai', prompt: prompt }, (res) => {
                if (chrome.runtime.lastError) resolve({ success: false });
                else resolve(res);
            });
        });

        if (response && response.success) {
            if (Array.isArray(response.data)) return response.data;
            if (response.data.trending_topics) return response.data.trending_topics;
        }
    } catch(e) {}
    return ["Failed to load topics"];
}

let stickyNotesListener = null;
let imagePasteListener = null;
let activeNotes = [];

function activateResearchMode(initialText) {
    if (document.getElementById('sinkit-research-banner')) return;

    document.body.classList.add('sinkit-research-mode-active');
    
    // Create Research Mode Banner
    const banner = document.createElement('div');
    banner.id = 'sinkit-research-banner';
    banner.innerHTML = `
        <span style="font-size: 16px;">📚 <strong>Research Mode Active:</strong> Distractions hidden. Select text to add to Sticky Notes!</span>
        <button id="sinkit-research-close-btn" style="background:#ff4444; color:white; border:none; padding:8px 16px; border-radius:20px; cursor:pointer; font-weight:bold; margin-left: 20px;">Exit Research Mode</button>
    `;
    
    banner.style.position = 'fixed';
    banner.style.bottom = '20px';
    banner.style.right = '20px';
    banner.style.background = '#2a2a2a';
    banner.style.color = 'white';
    banner.style.padding = '15px 25px';
    banner.style.borderRadius = '30px';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.zIndex = '9999999';
    banner.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';

    document.body.appendChild(banner);

    // Create Sticky Notes Panel
    const stickyPanel = document.createElement('div');
    stickyPanel.id = 'sinkit-sticky-notes';
    stickyPanel.innerHTML = `
        <div id="sinkit-sticky-notes-header" style="align-items: flex-start;">
            <div>
                <h2 style="margin-bottom: 4px;">📝 Sticky Notes</h2>
                <div style="font-size: 13px; color: #666; font-style: italic;">Source: The Hindu</div>
            </div>
            <button id="sinkit-sticky-notes-download" style="margin-top: 2px;">Download</button>
        </div>
        <div id="sinkit-sticky-notes-content"></div>
        <div style="font-size: 11px; color: #888; text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0dbba; padding-bottom: 5px;">
            💡 Tip: Click anywhere on the article text before pressing Ctrl+V
        </div>
    `;
    document.body.appendChild(stickyPanel);

    // Create Trending Panel
    const trendingPanel = document.createElement('div');
    trendingPanel.id = 'sinkit-trending-panel';
    trendingPanel.innerHTML = `
        <div id="sinkit-trending-panel-header">
            <h2>📈 Trending Topics</h2>
        </div>
        <div id="sinkit-trending-panel-content">
            <div style="color: #666; font-size: 13px; font-style: italic; text-align: center; margin-top: 20px;" id="sinkit-trending-loader">
                Fetching live topics...
            </div>
        </div>
    `;
    document.body.appendChild(trendingPanel);
    
    // Asynchronously fetch and render topics sequentially (simulated stream)
    generateAITopics().then(topics => {
        const tContent = document.getElementById('sinkit-trending-panel-content');
        if (!tContent) return; // panel might be closed before API answers
        
        tContent.innerHTML = ''; // clear loader
        
        topics.forEach((topic, index) => {
            setTimeout(() => {
                const tEl = document.createElement('div');
                tEl.className = 'sinkit-trending-item';
                tEl.innerHTML = `<strong>#</strong> ${topic}`;
                tContent.appendChild(tEl);
                tContent.scrollTop = tContent.scrollHeight;
            }, index * 600); // 600ms cascading delay!
        });
    });

    activeNotes = [];
    
    function addNote(type, content) {
        if (!content) return;
        
        const contentDiv = document.getElementById('sinkit-sticky-notes-content');
        const noteEl = document.createElement('div');
        noteEl.className = 'sinkit-sticky-note-item';
        
        if (type === 'text') {
            const text = content.trim();
            if (text.length === 0) return;
            // Prevent adding duplicate consecutive texts
            if (activeNotes.length > 0 && activeNotes[activeNotes.length - 1].type === 'text' && activeNotes[activeNotes.length - 1].content === text) return;
            
            activeNotes.push({ type: 'text', content: text });
            noteEl.textContent = text;
            
        } else if (type === 'image') {
            const imgDataUrl = content;
            // Removed duplicate prevention; if OS clipboard is slow, let them paste it.

            activeNotes.push({ type: 'image', content: imgDataUrl });
            
            const imgEl = document.createElement('img');
            imgEl.src = imgDataUrl;
            imgEl.style.maxWidth = '100%';
            imgEl.style.borderRadius = '4px';
            imgEl.style.display = 'block';
            noteEl.appendChild(imgEl);
        }

        contentDiv.appendChild(noteEl);
        contentDiv.scrollTop = contentDiv.scrollHeight;
    }

    // Listen for new text selections during research mode
    stickyNotesListener = () => {
        const selection = window.getSelection().toString();
        // Ignore the exact text that originally triggered research mode
        if (selection.length > 10 && selection.trim() !== (initialText || '').trim()) {
            addNote('text', selection);
        }
    };

    // Listen for clipboard pasting images
    imagePasteListener = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    addNote('image', event.target.result);
                };
                reader.readAsDataURL(blob);
                e.preventDefault();
                break;
            }
        }
    };
    
    // Add a slight delay before attaching so the browser's current mouseup event finishes first
    setTimeout(() => {
        document.addEventListener('mouseup', stickyNotesListener);
        window.addEventListener('paste', imagePasteListener, true); // use capture phase
    }, 150);

    // Download functionality (PDF)
    document.getElementById('sinkit-sticky-notes-download').addEventListener('click', () => {
        if (activeNotes.length === 0) return;
        
        // Add class to format page for printing just the notes
        document.body.classList.add('sinkit-printing-notes');
        
        // Allow DOM to update before triggering print dialog
        setTimeout(() => {
            window.print();
            // Remove the print class after the dialog closes
            document.body.classList.remove('sinkit-printing-notes');
        }, 150);
    });

    document.getElementById('sinkit-research-close-btn').addEventListener('click', () => {
        banner.remove();
        stickyPanel.remove();
        const tp = document.getElementById('sinkit-trending-panel');
        if (tp) tp.remove();
        if (stickyNotesListener) {
            document.removeEventListener('mouseup', stickyNotesListener);
            stickyNotesListener = null;
        }
        if (imagePasteListener) {
            window.removeEventListener('paste', imagePasteListener, true);
            imagePasteListener = null;
        }
        document.body.classList.remove('sinkit-research-mode-active');
        window.dispatchEvent(new Event('SinkIt_ResetMode'));
    });
}

window.addEventListener('SinkIt_IntentDetected', (e) => {
    if (e.detail.mode === 'quick_info') {
        activateQuickInfo();
    } else if (e.detail.mode === 'research_mode') {
        activateResearchMode(e.detail.initialText);
    }
});
