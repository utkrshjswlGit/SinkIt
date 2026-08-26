// Background Service Worker for SinkIt
chrome.runtime.onInstalled.addListener(() => {
    console.log('SinkIt Extension Installed');
});

// Broadcast SPA navigation changes to content scripts so they can reset their state
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    chrome.tabs.sendMessage(details.tabId, { action: 'spa_navigation', url: details.url }).catch(() => {
        // Ignore errors for tabs without content scripts
    });
});

// Gemini API Integration Placeholder
const GEMINI_API_KEY = "AIzaSyBoGqOLkcWDNT9H27a2xlExM3Q8zjYVtH4";

// Function with robust Retry Logic and Model Fallback for Hackathon Demos
async function getGeminiResponseWithRetry(promptText) {
    // We explicitly sequence fallback models in case the primary is overloaded
    const models = ["gemini-flash-latest", "gemini-flash-latest", "gemini-flash-latest"];
    let lastError = null;

    for (let i = 0; i < models.length; i++) {
        const currentModel = models[i];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${GEMINI_API_KEY}`;
        
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            
            const data = await res.json();
            
            if (data.error) {
                // If it's a 503 Overloaded error, throw exception to trigger retry loop
                if (data.error.code === 503 || (data.error.message || "").includes("high demand") || (data.error.message || "").includes("overloaded")) {
                    console.warn(`SinkIt Overload: ${currentModel} failed. Swapping models...`);
                    throw new Error(data.error.message);
                }
                // Return standard errors immediately (like invalid API keys)
                return { success: false, error: data.error.message };
            }
            
            // Extract text from Gemini output
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            let cleanJson = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
            
            // Safely parse out just the JSON object or Array
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            const firstBracket = cleanJson.indexOf('[');
            const lastBracket = cleanJson.lastIndexOf(']');
            
            if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            } else if (firstBracket !== -1 && lastBracket !== -1) {
                cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
            }

            try {
                const parsed = JSON.parse(cleanJson);
                return { success: true, data: parsed };
            } catch (parseError) {
                return { success: false, error: "JSON Parse failed: " + cleanJson };
            }

        } catch (e) {
            lastError = e.message;
            // Wait 1.5 seconds before hitting the fallback model
            await new Promise(r => setTimeout(r, 1500));
        }
    }
    
    return { success: false, error: "SinkIt Fallback Protocol Exhausted: " + lastError };
}

// Proxy fetch requests to bypass Content Script CSP restrictions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetch_ai') {
        getGeminiResponseWithRetry(request.prompt)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.toString() }));
        return true; // Keep the message channel open for async response
    }
});
