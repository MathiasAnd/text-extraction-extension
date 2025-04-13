// --- State Management ---
let isSelecting = false;
let currentTabId = null;

// --- Helper Functions ---

function getFormattedDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}


async function ensureContentScriptInjected(tabId) {
  try {
    // Inject utility scripts first, then the main content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: [
          'clipboard_utils.js',
          'text_utils.js',
          'highlighter.js',
          'content_script.js' // Main script last
      ]
    });
     console.log("Content scripts injected or already present for tab:", tabId);
  } catch (e) {
    console.error("Failed to inject content script:", e);
    if (e.message.includes("Cannot access") || e.message.includes("Cannot script")) {
         chrome.action.setBadgeText({ text: '!', tabId: tabId });
         chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId });
         chrome.action.setTitle({ title: 'Cannot run on this page', tabId: tabId });
         isSelecting = false;
         currentTabId = null;
    }
    throw e; // Re-throw so the caller knows injection failed
  }
}

function updateIconAndState(tabId, selecting, mode = 'standard') {
    // --- ADD LOGGING ---
    console.log(`[Background] updateIconAndState called for tab ${tabId}. Setting selecting=${selecting}. Current isSelecting was: ${isSelecting}`);
    // --- END LOGGING ---

    isSelecting = selecting; // Update background state
    currentTabId = selecting ? tabId : null; // Update background state

    const badgeText = selecting ? (mode === 'code' ? 'CODE' : 'ON') : '';
    const title = selecting ? `Click element (${mode} mode) - Press 'c' to toggle / 'Esc' to cancel` : 'Extract Text from Element';
    const badgeColor = selecting ? (mode === 'code' ? '#4488FF' : '#00FF00') : '#FFFFFF';

    chrome.action.setBadgeText({ text: badgeText, tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId: tabId });
    chrome.action.setTitle({ title: title, tabId: tabId });
     // --- ADD LOGGING ---
    console.log(`[Background] updateIconAndState finished for tab ${tabId}. New isSelecting: ${isSelecting}, currentTabId: ${currentTabId}`);
    // --- END LOGGING ---
}



// Action Click Listener
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab || !tab.id) {
        console.error("[Background] onClicked: Invalid tab object received.");
        return;
    }
    // --- ADD LOGGING ---
    console.log(`[Background] Icon clicked on tab ${tab.id}. Current background state: isSelecting=${isSelecting}, currentTabId=${currentTabId}`);
    // --- END LOGGING ---

    // If background state says we are selecting on THIS tab, then cancel.
    if (isSelecting && tab.id === currentTabId) {
         console.log(`[Background] onClicked: State is selecting on this tab. Sending cancel message.`);
         // Send cancel message to content script
         chrome.tabs.sendMessage(tab.id, { action: "cancelSelection" }).catch(err => console.log("Error sending cancel:", err));
         // Update background state and icon immediately
         updateIconAndState(tab.id, false);
    } else {
        // If background state says we are selecting on a DIFFERENT tab, cancel that first.
        if (isSelecting && currentTabId && currentTabId !== tab.id) {
             console.log(`[Background] onClicked: State is selecting on different tab ${currentTabId}. Cancelling old tab.`);
             try {
                 // Send cancel to old tab's content script
                 chrome.tabs.sendMessage(currentTabId, { action: "cancelSelection" }).catch(err => console.log("Error sending cancel to old tab:", err));
                 // Update background state and icon for the old tab
                 updateIconAndState(currentTabId, false);
             } catch (e) { console.warn("Could not cancel selection on previous tab", e); }
             // Note: isSelecting is now false after updateIconAndState(false)
        }

        // Now, activate on the current tab (since isSelecting should be false now, or was already false)
        console.log(`[Background] onClicked: Activating on tab ${tab.id}.`);
        try {
            await ensureContentScriptInjected(tab.id);
            console.log(`[Background] onClicked: Injection ensured. Sending startSelection message.`);
            chrome.tabs.sendMessage(tab.id, { action: "startSelection" }, (response) => {
                 if (chrome.runtime.lastError) {
                      console.error("[Background] onClicked: Error sending startSelection message:", chrome.runtime.lastError.message);
                      updateIconAndState(tab.id, false); // Ensure state is off if message fails
                 } else if (response && response.status === "started") {
                      console.log(`[Background] onClicked: Content script started on tab ${tab.id}. Updating icon to ON.`);
                      // Update background state and icon to ON
                      updateIconAndState(tab.id, true);
                 } else {
                      console.warn("[Background] onClicked: Content script did not confirm start. Response:", response);
                      updateIconAndState(tab.id, false); // Ensure state is off if response is not 'started'
                 }
            });
        } catch (injectionError) {
            console.error(`[Background] onClicked: Injection failed for tab ${tab.id}. State remains off.`);
            // State should already be off or was reset by ensureContentScriptInjected's catch block
            // updateIconAndState(tab.id, false); // Redundant? Ensure it's off.
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[Background] Received message:", message, "from tab:", sender.tab?.id);

if (message.action === "elementClicked" && message.data) {
    console.log("[Background] Received elementClicked message with data:", message.data);
    // Store data first
    chrome.storage.local.set({ extractedTexts: message.data }, () => {
        if (chrome.runtime.lastError) {
            console.error("[Background] elementClicked: Error setting storage:", chrome.runtime.lastError);
        } else {
            console.log("[Background] elementClicked: Data stored successfully. Creating popup window...");
            // Create popup
            chrome.windows.create({
                url: chrome.runtime.getURL("results.html"),
                type: "popup",
                width: 600,
                height: 700
            }, (newWindow) => {
                 if (chrome.runtime.lastError) {
                     console.error("[Background] elementClicked: Error creating window:", chrome.runtime.lastError.message);
                 } else {
                     console.log("[Background] elementClicked: Popup window created successfully. ID:", newWindow.id);
                 }
                 // Try resetting state *after* window creation attempt
                 if (sender.tab && sender.tab.id) {
                     console.log("[Background] elementClicked: (After window create attempt) Calling updateIconAndState(false) for tab", sender.tab.id);
                     // --- PUTTING THIS BACK FOR TESTING ---
                     updateIconAndState(sender.tab.id, false);
                     // --- END TEST ---
                 }
            });
        }
    });

    // Send response immediately
    console.log("[Background] elementClicked: Sending response {status: 'received'}");
    sendResponse({ status: "received" });
    return false; // Synchronous response handling

    } else if (message.action === "downloadCodeSnippet" && typeof message.data === 'string') {
        // ... (logic for download) ...
        // State is reset by content script stopping itself, background doesn't need to here
        // But we need to return true for async response
        // The FileReader handles the async response sending
        const reader = new FileReader();
        reader.onload = function() { /* ... download logic ... sendResponse(...) ... */ };
        reader.onerror = function() { /* ... error handling ... sendResponse(...) ... */ };
        reader.readAsDataURL(new Blob([message.data], { type: 'text/plain;charset=utf-8' }));
        return true; // Indicate async response

    } else if (message.action === "selectionCancelled") {
        console.log("[Background] Received selection cancelled message from tab", sender.tab?.id);
        if (sender.tab && sender.tab.id) {
            // --- THIS IS THE KEY PART FOR ESC ---
            console.log("[Background] selectionCancelled: Calling updateIconAndState(false) for tab", sender.tab.id);
            updateIconAndState(sender.tab.id, false); // Explicitly reset state and icon
            // --- END KEY PART ---
        } else {
             console.warn("[Background] selectionCancelled received without valid sender tab ID.");
        }
        sendResponse({ status: "acknowledged cancellation" });
        return false; // Synchronous response

    } else {
        console.warn("[Background] Received unknown message:", message);
    }

    // Default return false if not handled asynchronously
    return false;
});



// Optional: Reset state if the tab is closed or navigated away
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === currentTabId) {
        updateIconAndState(tabId, false); // Implicitly cancels
    }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // If the selected tab navigates away, cancel selection
    if (tabId === currentTabId && changeInfo.status === 'loading') {
         // Don't message content script as it might be gone. Just update state.
         updateIconAndState(tabId, false);
    }
});