// options.js

const defaultModeSelect = document.getElementById('defaultModeSelect');
const downloadCodeToggle = document.getElementById('downloadCodeToggle');
const statusDiv = document.getElementById('status');

// --- Default values ---
const defaultOptions = {
    defaultMode: 'standard', // 'standard' or 'code'
    downloadCode: false     // true or false
};

// --- Functions ---
function saveOptions() {
    const options = {
        defaultMode: defaultModeSelect.value,
        downloadCode: downloadCodeToggle.checked
    };

    // Use chrome.storage.sync to sync options across devices
    chrome.storage.sync.set(options, () => {
        // Update status to let user know options were saved.
        if (chrome.runtime.lastError) {
            console.error("Error saving options:", chrome.runtime.lastError);
            statusDiv.textContent = 'Error saving options.';
            statusDiv.style.color = 'red';
        } else {
            console.log("Options saved:", options);
            statusDiv.textContent = 'Options saved.';
            statusDiv.style.color = 'green';
        }
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 1500); // Hide status message after 1.5 seconds
    });
}

function loadOptions() {
    // Get options from storage, using defaults if not found
    chrome.storage.sync.get(defaultOptions, (items) => {
         if (chrome.runtime.lastError) {
            console.error("Error loading options:", chrome.runtime.lastError);
            // Keep default UI values if loading fails
            return;
        }
        console.log("Options loaded:", items);
        defaultModeSelect.value = items.defaultMode;
        downloadCodeToggle.checked = items.downloadCode;
    });
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', loadOptions);
defaultModeSelect.addEventListener('change', saveOptions);
downloadCodeToggle.addEventListener('change', saveOptions);