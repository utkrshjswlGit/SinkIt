// Wikipedia Behavior Tracker
let lastScrollY = window.scrollY;
let lastScrollTime = Date.now();
let fastScrollCount = 0;
let currentMode = 'normal';

// Thresholds
const FAST_SCROLL_SPEED = 2000; // pixels per second
const SLOW_SCROLL_SPEED = 100;

document.addEventListener('scroll', () => {
    if (currentMode !== 'normal') return; // Don't track if already in a mode

    const currentScrollY = window.scrollY;
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastScrollTime) / 1000; // in seconds
    const distance = Math.abs(currentScrollY - lastScrollY);
    
    if (timeDiff > 0.1) {
        const speed = distance / timeDiff;
        
        if (speed > FAST_SCROLL_SPEED) {
            fastScrollCount++;
            if (fastScrollCount > 2) {
                currentMode = 'quick_info';
                window.dispatchEvent(new CustomEvent('SinkIt_IntentDetected', { detail: { mode: 'quick_info' }}));
            }
        }
        
        lastScrollY = currentScrollY;
        lastScrollTime = currentTime;
    }
});

// A simple research mode trigger: User selecting a relatively large chunk of text to read/research
document.addEventListener('selectionchange', () => {
    if (currentMode !== 'normal') return;
    const selection = window.getSelection().toString();
    if (selection.length > 50) {
        currentMode = 'research_mode';
        window.dispatchEvent(new CustomEvent('SinkIt_IntentDetected', { detail: { mode: 'research_mode', initialText: selection }}));
    }
});

// Allow resetting mode from UI
window.addEventListener('SinkIt_ResetMode', () => {
    currentMode = 'normal';
    fastScrollCount = 0;
});
