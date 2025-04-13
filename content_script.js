// In content_script.js

console.log("[CS] Script execution start.");

// --- GUARD ---
// Use a unique window property to check if the main script logic has run
if (typeof window.textExtractorMainScriptLoaded === 'undefined') { // <--- Opening brace for main IF
    console.log("[CS] Running main script logic for the first time.");

    // --- State Management --- (Inside the guard)
    const state = {
        isSelectingActive: false,
        isCodeModeActive: false,
        downloadCodeEnabled: false,
        listenersAttached: false
    };

    // --- Event Handlers --- (Inside the guard)
    function handleMouseOver(event) {
        // console.log("[CS] handleMouseOver: Triggered.");
        if (!window.TextExtractorUtils?.applyHighlight || !window.TextExtractorUtils?.removeHighlight || !window.TextExtractorUtils?.findCodeElement) {
            console.error("[CS] handleMouseOver: ERROR - Required TextExtractorUtils functions not found!"); return;
        }
        if (!state.isSelectingActive) return;
        let targetElement = null;
        let highlightStyle = 'default';
        if (state.isCodeModeActive) {
            targetElement = window.TextExtractorUtils.findCodeElement(event.target);
            if (targetElement) { highlightStyle = 'code'; }
            else { window.TextExtractorUtils.removeHighlight(); return; }
        } else { targetElement = event.target; }
        window.TextExtractorUtils.applyHighlight(targetElement, highlightStyle);
    }

    function handleClick(event) {
        console.log("[CS] handleClick: >>> CLICK EVENT DETECTED <<<");
        if (!window.TextExtractorUtils?.findCodeElement || !window.TextExtractorUtils?.extractTextNodes || (!state.downloadCodeEnabled && !window.TextExtractorUtils?.copyToClipboard) || !window.TextExtractorUtils?.removeHighlight) {
            console.error("[CS] handleClick: ERROR - Required TextExtractorUtils functions not found! Aborting click handler.");
            if (typeof stopSelectionMode === 'function') stopSelectionMode();
            chrome.runtime.sendMessage({ action: "selectionCancelled" }).catch(e => console.log("Error sending cancel msg:",e)); return;
        }
        if (!state.isSelectingActive) { console.log("[CS] handleClick: Exiting - state.isSelectingActive is false."); return; }
        console.log("[CS] handleClick: State is active. Preventing default and stopping propagation.");
        try { event.preventDefault(); event.stopPropagation(); }
        catch (e) { console.error("[CS] handleClick: Error during preventDefault/stopPropagation:", e); }
        const clickedElement = window.TextExtractorUtils?.highlightedElement || event.target;
        if (!clickedElement) { console.warn("[CS] handleClick: No valid clicked element found. Aborting."); return; }
        console.log("[CS] handleClick: Clicked Element:", clickedElement);
        console.log(`[CS] handleClick: Checking mode. isCodeModeActive = ${state.isCodeModeActive}`);
        if (state.isCodeModeActive) {
            console.log("[CS] handleClick: In Code Mode branch.");
            const codeElement = window.TextExtractorUtils.findCodeElement(clickedElement);
            console.log("[CS] handleClick: Found code element:", codeElement);
            if (codeElement) {
                const codeText = codeElement.textContent;
                if (state.downloadCodeEnabled) {
                    console.log("[CS] handleClick: Requesting download...");
                    chrome.runtime.sendMessage({ action: "downloadCodeSnippet", data: codeText }, (response) => { /* ... */ });
                    window.TextExtractorUtils.removeHighlight();
                } else {
                    console.log("[CS] handleClick: Attempting to copy code to clipboard...");
                    window.TextExtractorUtils.copyToClipboard(codeText).then(success => {
                        console.log("[CS] handleClick: copyToClipboard promise resolved. Success:", success);
                        if (success) { /* ... feedback ... */ }
                        window.TextExtractorUtils.removeHighlight();
                    }).catch(err => {
                        console.error("[CS] handleClick: Error during copyToClipboard:", err);
                        window.TextExtractorUtils.removeHighlight();
                    });
                }
            } else {
                console.log("[CS] handleClick: Code Mode - No code element found for this click.");
                window.TextExtractorUtils.removeHighlight();
            }
        } else {
            console.log("[CS] handleClick: In Standard Mode branch.");
            let texts = window.TextExtractorUtils.extractTextNodes(clickedElement, []);
            if (texts.length === 0 && clickedElement.textContent?.trim()) {
                const tagName = clickedElement.tagName.toLowerCase();
                if (tagName !== 'script' && tagName !== 'style') { texts.push(clickedElement.textContent.trim()); }
            }
            const uniqueTexts = [...new Set(texts)].filter(t => t);
            console.log("[CS] handleClick: Extracted texts:", uniqueTexts);
            window.TextExtractorUtils.removeHighlight();
            if (uniqueTexts.length > 0) {
                console.log("[CS] handleClick: Attempting to send elementClicked message...");
                chrome.runtime.sendMessage({ action: "elementClicked", data: uniqueTexts }, (response) => {
                    if (chrome.runtime.lastError) { console.error("[CS] handleClick: Error sending elementClicked:", chrome.runtime.lastError.message); }
                    else { console.log("[CS] handleClick: Background response received for elementClicked:", response); }
                });
            } else { console.log("[CS] handleClick: Standard Mode - No text parts extracted."); }
        }
        console.log("[CS] handleClick: <<< HANDLER FINISHED >>>");
    }

    function handleKeyDown(event) {
        // console.log("[CS] handleKeyDown: Key pressed:", event.key);
        if (!state.isSelectingActive) return;
        if (event.key === "Escape") {
            // console.log("Selection cancelled by Escape key.");
            stopSelectionMode();
            chrome.runtime.sendMessage({ action: "selectionCancelled" }).catch(e => console.log("Error sending cancel msg:",e));
        } else if (event.key.toLowerCase() === "c") {
            event.preventDefault();
            toggleCodeMode();
        }
    }

    // --- Mode Control --- (Inside the guard)
    function toggleCodeMode() {
        if (!state.isSelectingActive) return;
        state.isCodeModeActive = !state.isCodeModeActive;
        // console.log(`Code selection mode ${state.isCodeModeActive ? 'ENABLED' : 'DISABLED'}`);
        if (window.TextExtractorUtils?.removeHighlight) { window.TextExtractorUtils.removeHighlight(); }
        else { console.error("[CS] toggleCodeMode: ERROR - removeHighlight not found!"); }
        document.body.style.cursor = state.isCodeModeActive ? 'copy' : 'crosshair';
    }

    async function startSelectionMode() {
        console.log("[CS] startSelectionMode: Entered function.");
        if (state.isSelectingActive) { console.log("[CS] startSelectionMode: Already active."); return; }
        state.isSelectingActive = true;
        try {
            const options = await chrome.storage.sync.get({ defaultMode: 'standard', downloadCode: false });
            state.isCodeModeActive = (options.defaultMode === 'code');
            state.downloadCodeEnabled = options.downloadCode;
        } catch (err) { console.error("[CS] Error reading options:", err); state.isCodeModeActive = false; state.downloadCodeEnabled = false; }
        console.log(`[CS] startSelectionMode: Initial mode set. Mode: ${state.isCodeModeActive ? 'Code' : 'Standard'}. Download: ${state.downloadCodeEnabled}`);
        document.body.style.cursor = state.isCodeModeActive ? 'copy' : 'crosshair';
        if (!state.listenersAttached) {
            console.log("[CS] startSelectionMode: Attaching listeners (mouseover, click, keydown)...");
            document.addEventListener('mouseover', handleMouseOver, true);
            document.addEventListener('click', handleClick, true);
            document.addEventListener('keydown', handleKeyDown, true);
            state.listenersAttached = true;
            console.log("[CS] startSelectionMode: Listeners attached.");
        } else { console.log("[CS] startSelectionMode: Listeners were already attached."); }
        console.log("[CS] startSelectionMode: Exiting function.");
    }

    function stopSelectionMode() {
        if (!state.isSelectingActive) return;
        console.log("[CS] Stopping selection mode");
        state.isSelectingActive = false;
        state.isCodeModeActive = false;
        state.downloadCodeEnabled = false;
        if (window.TextExtractorUtils?.removeHighlight) { window.TextExtractorUtils.removeHighlight(); }
        else { console.error("[CS] stopSelectionMode: ERROR - removeHighlight not found!"); }
        document.body.style.cursor = 'default';
        if (state.listenersAttached) {
            console.log("[CS] stopSelectionMode: Removing listeners (mouseover, click, keydown)...");
            document.removeEventListener('mouseover', handleMouseOver, true);
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('keydown', handleKeyDown, true);
            state.listenersAttached = false;
            console.log("[CS] stopSelectionMode: Listeners removed.");
        }
    }

    // --- Initialization and Message Handling --- (Inside the guard)
    console.log("[CS] Setting up message listener check...");
    if (!window.textExtractorMessageListenerAdded) {
        console.log("[CS] Adding message listener NOW.");
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log("[CS] <<< Message Received:", message);
            if (message.action === "startSelection") {
                console.log("[CS] Message Listener: Matched 'startSelection'. Calling startSelectionMode().");
                startSelectionMode().catch(err => { console.error("[CS] Error during async startSelectionMode:", err); stopSelectionMode(); chrome.runtime.sendMessage({ action: "selectionCancelled" }).catch(e => console.log("Error sending cancel msg:",e)); });
                console.log("[CS] Message Listener: Called startSelectionMode(). Preparing to send response.");
                sendResponse({ status: "started" });
                console.log("[CS] Message Listener: Response sent for 'startSelection'.");
                return false;
            } else if (message.action === "cancelSelection") {
                console.log("[CS] Message Listener: Matched 'cancelSelection'. Calling stopSelectionMode().");
                stopSelectionMode();
                console.log("[CS] Message Listener: Called stopSelectionMode(). Preparing to send response.");
                sendResponse({ status: "cancelled" });
                console.log("[CS] Message Listener: Response sent for 'cancelSelection'.");
                return false;
            } else { console.warn("[CS] Message Listener: Received unknown action:", message.action); }
            return false;
        });
        window.textExtractorMessageListenerAdded = true;
        console.log("[CS] Message listener ADDED.");
    } else { console.log("[CS] Message listener already exists."); }

    // Run initial stopSelectionMode *after* ensuring listener is set up
    console.log("[CS] Running initial stopSelectionMode().");
    stopSelectionMode();

    // Set flag at the end of the first-time setup block
    window.textExtractorMainScriptLoaded = true;
    console.log("[CS] First time setup complete. Flag set.");

} else { // <--- This ELSE corresponds to the main IF guard
    console.log("[CS] Main script logic already loaded. Skipping re-initialization.");
    // If re-injected, the existing listener should handle messages.
    // We might want to ensure the state reflects the current options if re-injected?
    // For now, rely on the listener being active.
} // <--- THIS IS THE MISSING CLOSING BRACE for the main IF block

// --- END GUARD ---

console.log("[CS] Script execution end.");