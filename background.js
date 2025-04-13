// --- State Management ---
let isSelecting = false;
let currentTabId = null;

// --- Helper Functions ---
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

function updateIconAndState(tabId, selecting) {
    isSelecting = selecting;
    currentTabId = selecting ? tabId : null;
    const badgeText = selecting ? 'ON' : '';
    const title = selecting ? 'Click element to extract (Click icon again to cancel)' : 'Extract Text from Element';
    const badgeColor = selecting ? '#00FF00' : '#FFFFFF'; // Green when ON

    chrome.action.setBadgeText({ text: badgeText, tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId: tabId });
    chrome.action.setTitle({ title: title, tabId: tabId });
}



// Action Click Listener
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  if (isSelecting && tab.id === currentTabId) {
    // Send cancel message even if script might be stuck, it won't hurt
    chrome.tabs.sendMessage(tab.id, { action: "cancelSelection" }).catch(err => console.log("Error sending cancel, expected if page changed:", err)); // Ignore error here
    updateIconAndState(tab.id, false);
  } else {
    if(isSelecting && currentTabId && currentTabId !== tab.id) {
         try {
             chrome.tabs.sendMessage(currentTabId, { action: "cancelSelection" }).catch(err => console.log("Error sending cancel to old tab:", err)); // Ignore error
             updateIconAndState(currentTabId, false);
         } catch(e) { console.warn("Could not cancel selection on previous tab", e); }
    }

    try {
         await ensureContentScriptInjected(tab.id);
         // Send message only after ensuring injection *attempt* was made
         chrome.tabs.sendMessage(tab.id, { action: "startSelection" }, (response) => {
              if (chrome.runtime.lastError) {
                   console.error("Error sending startSelection message:", chrome.runtime.lastError.message);
                   // This likely means injection failed or content script crashed
                   updateIconAndState(tab.id, false); // Reset state
              } else if (response && response.status === "started") {
                   updateIconAndState(tab.id, true);
              } else {
                   console.warn("Content script did not confirm startSelection. Response:", response);
                   updateIconAndState(tab.id, false); // Reset state
              }
         });
    } catch(injectionError) {
         // Error already handled inside ensureContentScriptInjected (badge updated, state reset)
         console.log("Injection failed, state handled by ensureContentScriptInjected catch block.");
         // No need to do more here, state should already be reset.
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Received message:", message); // Log all messages

  if (message.action === "elementClicked" && message.data) {
    console.log("[Background] Handling elementClicked");
    // Store data and open popup (existing logic)
    chrome.storage.local.set({ extractedTexts: message.data }, () => {
    if (chrome.runtime.lastError) {
        console.error("[Background] Error setting storage:", chrome.runtime.lastError);
    } else {
        console.log("[Background] Data stored successfully.");
    }

    // --- VERIFY THIS BLOCK ---
    chrome.windows.create({
        url: chrome.runtime.getURL("results.html"),
        type: "popup", // <--- THIS IS CRITICAL! Make sure it says "popup"
        width: 600,    // Or your desired size
        height: 700   // Or your desired size
    });
    // --- END VERIFICATION ---

    });

    // Make sure the rest of the listener (updating icon state, sendResponse) is still there
    if (sender.tab && sender.tab.id) {
       updateIconAndState(sender.tab.id, false);
    }
    sendResponse({ status: "received" });

  } else if (message.action === "codeCopied") {
    // --- HANDLE NEW MESSAGE ---
    console.log("[Background] Handling codeCopied");
    // Code was copied directly by content script. Just reset the state/icon.
    if (sender.tab && sender.tab.id) {
        updateIconAndState(sender.tab.id, false);
    }
    sendResponse({ status: "acknowledged code copy" });
    // --- END NEW MESSAGE HANDLING ---

  } else if (message.action === "selectionCancelled") {
    console.log("[Background] Handling selectionCancelled");
    // User cancelled (e.g., Esc key). Reset state/icon.
    if (sender.tab && sender.tab.id) {
        updateIconAndState(sender.tab.id, false);
    }
    sendResponse({ status: "acknowledged cancellation" });
  }
  return true; // Still needed for async potential
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