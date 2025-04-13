// content_script.js

// Use the Utils object defined in other files
const {
    copyToClipboard,
    extractTextNodes,
    findCodeElement,
    applyHighlight,
    removeHighlight
} = window.TextExtractorUtils;

// --- State Management ---
// Encapsulate state within an object for better organization
const state = {
    isSelectingActive: false,
    isCodeModeActive: false,
    listenersAttached: false // Track if listeners are currently active
};

// --- Event Handlers ---

function handleMouseOver(event) {
    if (!state.isSelectingActive) return;

    let targetElement = null;
    let highlightStyle = 'default';

    if (state.isCodeModeActive) {
        // In code mode, find the nearest code block
        targetElement = findCodeElement(event.target);
        if (targetElement) {
            highlightStyle = 'code';
        } else {
            // If not over code, don't highlight anything in code mode
            removeHighlight(); // Clear any previous highlight
            return; // Exit early
        }
    } else {
        // Default mode: highlight the element directly under cursor
        targetElement = event.target;
    }

    applyHighlight(targetElement, highlightStyle);
}

function handleClick(event) {
    if (!state.isSelectingActive) return;

    event.preventDefault();
    event.stopPropagation();

    const clickedElement = window.TextExtractorUtils.highlightedElement || event.target; // Use highlighted element if available

    if (state.isCodeModeActive) {
        const codeElement = findCodeElement(clickedElement); // Find code block again for certainty
        if (codeElement) {
            const codeText = codeElement.textContent; // Get all text content
            copyToClipboard(codeText).then(success => {
                if (success) {
                    // Optional: Provide feedback (e.g., brief flash)
                    codeElement.style.transition = 'background-color 0.1s ease-in-out';
                    codeElement.style.backgroundColor = 'rgba(0, 255, 0, 0.3)'; // Light green flash
                    setTimeout(() => {
                        codeElement.style.backgroundColor = '';
                        codeElement.style.transition = '';
                    }, 300);
                    console.log("Code snippet copied.");
                }
            });
            stopSelectionMode(); // Stop after copying code
        } else {
            console.log("Code mode click, but no code element found.");
            // Optional: Cancel mode here? Or just do nothing? Let's do nothing.
        }
    } else {
        // Default mode: Extract text parts and send to background
        let texts = extractTextNodes(clickedElement, []); // Pass empty array to start
         if (texts.length === 0 && clickedElement.textContent?.trim()) {
             // Fallback for elements with direct text only (avoiding script/style)
             const tagName = clickedElement.tagName.toLowerCase();
              if (tagName !== 'script' && tagName !== 'style') {
                   texts.push(clickedElement.textContent.trim());
              }
         }

        const uniqueTexts = [...new Set(texts)].filter(t => t); // Remove empty strings and duplicates

        console.log("Extracted texts:", uniqueTexts);
        stopSelectionMode(); // Stop after extracting text parts

        if (uniqueTexts.length > 0) {
             chrome.runtime.sendMessage({ action: "elementClicked", data: uniqueTexts }, (response) => {
                 if (chrome.runtime.lastError) {
                     console.error("Error sending element data:", chrome.runtime.lastError.message);
                 } else {
                     console.log("Background script received data:", response);
                 }
             });
        } else {
            console.log("No text parts extracted.");
            // No need to send message or open popup if nothing was found.
             // Inform background to reset icon state anyway if it was expecting data?
             // Background already resets state based on receiving elementClicked message.
             // If no message is sent, background state stays 'ON'. Need to fix this.
             // Let's send a specific message or just rely on stopSelectionMode to inform background via ESC flow.
             // Easiest: Assume background will reset state when popup closes or via ESC.
             // Let's stick with not sending a message if empty. User can ESC or click icon.
        }
    }
}

function handleKeyDown(event) {
    if (!state.isSelectingActive) return;

    if (event.key === "Escape") {
        console.log("Selection cancelled by Escape key.");
        stopSelectionMode();
        // Inform background script to update icon state
        chrome.runtime.sendMessage({ action: "selectionCancelled" }).catch(e => console.log("Error sending cancel msg:",e));
    } else if (event.key.toLowerCase() === "c") {
        event.preventDefault(); // Prevent browser's default 'c' action if any
        toggleCodeMode();
    }
}

// --- Mode Control ---

function toggleCodeMode() {
    if (!state.isSelectingActive) return;

    state.isCodeModeActive = !state.isCodeModeActive;
    console.log(`Code selection mode ${state.isCodeModeActive ? 'ENABLED' : 'DISABLED'}`);

    // Clear current highlight when toggling modes
    removeHighlight();

    // Update cursor for the whole body to give immediate feedback
    document.body.style.cursor = state.isCodeModeActive ? 'copy' : 'crosshair';

    // Manually trigger a highlight check on the element currently under the mouse, if any
    // This is tricky, might be better to just wait for the next mouse move.
    // Let's rely on the next mouse move.
}

function startSelectionMode() {
    if (state.isSelectingActive) {
        console.log("Selection mode already active.");
        return;
    }
    console.log("Starting selection mode (Default)");
    state.isSelectingActive = true;
    state.isCodeModeActive = false; // Always start in default mode
    document.body.style.cursor = 'crosshair';

    // Attach listeners only if not already attached
    if (!state.listenersAttached) {
        document.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleKeyDown, true);
        // We don't need mouseout anymore if applyHighlight handles clearing previous highlight
        // document.addEventListener('mouseout', removeHighlight, true); // Keep or remove? Remove for now.
        state.listenersAttached = true;
        console.log("Event listeners attached.");
    }
}

function stopSelectionMode() {
    if (!state.isSelectingActive) return;
    console.log("Stopping selection mode");
    state.isSelectingActive = false;
    state.isCodeModeActive = false; // Ensure code mode is off
    removeHighlight(); // Clean up any highlight
    document.body.style.cursor = 'default';

    // Detach listeners
    if (state.listenersAttached) {
        document.removeEventListener('mouseover', handleMouseOver, true);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown, true);
        // document.removeEventListener('mouseout', removeHighlight, true);
        state.listenersAttached = false;
         console.log("Event listeners detached.");
    }
}

// --- Initialization and Message Handling ---

// Ensure a clean state on script load/reload
stopSelectionMode();

// Only add the message listener once
if (!window.textExtractorMessageListenerAdded) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Content script received message:", message);
        if (message.action === "startSelection") {
            startSelectionMode();
            sendResponse({ status: "started" });
        } else if (message.action === "cancelSelection") {
            stopSelectionMode();
            sendResponse({ status: "cancelled" });
        }
        // No async response needed here
    });
    window.textExtractorMessageListenerAdded = true;
    console.log("Content script message listener added.");
} else {
     console.log("Content script message listener already exists.");
}

console.log("Content script processed.");