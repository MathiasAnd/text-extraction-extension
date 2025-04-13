const tableBody = document.getElementById('resultsTable').querySelector('tbody');
const copyBtn = document.getElementById('copyBtn');
const exportBtn = document.getElementById('exportBtn'); // Double check this line!
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const delimiterSelect = document.getElementById('delimiterSelect');
let lastSelectedRowIndex = -1;

function renderTable(texts) {
    // --- ADD LOGS INSIDE RENDER ---
    console.log("[Results] renderTable called with:", texts);
    tableBody.innerHTML = '';
    if (!texts || !Array.isArray(texts) || texts.length === 0) { // Added Array.isArray check
        console.log("[Results] No texts to render or input is not a non-empty array.");
        tableBody.innerHTML = '<tr><td colspan="1">No text parts found or extracted.</td></tr>'; // Use colspan if needed later
        return;
    }

    console.log(`[Results] Starting loop to render ${texts.length} rows.`);
    texts.forEach((text, index) => {
        // --- ADD LOG FOR EACH ROW ---
        console.log(`[Results] Rendering row ${index}: "${text}"`);
        // --- END LOG ---
        const row = tableBody.insertRow();
        row.dataset.index = index;
        const cell = row.insertCell();
        if (typeof text === 'string') { // Add type check for safety
             cell.textContent = text;
        } else {
             console.warn(`[Results] Item at index ${index} is not a string:`, text);
             cell.textContent = `[Invalid Data Type: ${typeof text}]`;
        }
        row.addEventListener('click', (event) => handleRowClick(event, row, index));
    });
    console.log("[Results] Finished rendering rows.");
     // --- END LOGS ---
}

function handleRowClick(event, row, index) {
    const isShiftClick = event.shiftKey;
    const rows = Array.from(tableBody.querySelectorAll('tr'));

    if (isShiftClick && lastSelectedRowIndex !== -1) {
        const start = Math.min(index, lastSelectedRowIndex);
        const end = Math.max(index, lastSelectedRowIndex);
        // When shift-clicking, typically you want to clear previous selections
        // and select only the range. Adjust if different behavior is desired.
        rows.forEach(r => r.classList.remove('selected'));
        for (let i = start; i <= end; i++) {
             if(rows[i]) { // Make sure row exists
                 rows[i].classList.add('selected');
             }
        }
        // Do not update lastSelectedRowIndex on shift-click to keep the anchor
    } else {
        // Normal click or first click (or shift-click without prior selection)
        row.classList.toggle('selected');
        // Update anchor *only* if selecting, or reset if deselecting the anchor
        if (row.classList.contains('selected')) {
            lastSelectedRowIndex = index;
        } else if (index === lastSelectedRowIndex) {
            lastSelectedRowIndex = -1; // Reset if anchor was deselected
        }
        // If it wasn't the anchor being deselected, keep the anchor index
    }
}


function getSelectedTexts() {
    const selectedRows = tableBody.querySelectorAll('tr.selected');
    const texts = [];
    selectedRows.forEach(row => {
        texts.push(row.cells[0].textContent);
    });
    return texts;
}

// --- NEW HELPER FUNCTION ---
function getActualDelimiter(selectedValue) {
    switch (selectedValue) {
        case '\\n\\n': return '\n\n'; // Convert string literal to actual newlines
        case '\\n':   return '\n';   // Convert string literal to actual newline
        case '\\t':   return '\t';   // Convert string literal to actual tab
        case ' ':     return ' ';
        case ', ':    return ', ';
        case ',':     return ',';
        case '':      return '';
        default:      return '\n\n'; // Fallback to default
    }
}
// --- END HELPER FUNCTION ---

copyBtn.addEventListener('click', () => {
    const textsToCopy = getSelectedTexts();
    if (textsToCopy.length > 0) {
        // --- USE CONVERTED DELIMITER ---
        const selectedValue = delimiterSelect.value;
        const actualDelimiter = getActualDelimiter(selectedValue); // Get the real character(s)
        navigator.clipboard.writeText(textsToCopy.join(actualDelimiter)) // Use the actual delimiter
            .then(() => {
        // --- END DELIMITER USE ---
                console.log('Text copied to clipboard!');
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy Selected'; }, 1500);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                alert("Could not copy text. See console for details.");
            });
    } else {
        alert("No text selected to copy.");
    }
});

exportBtn.addEventListener('click', () => {
    const textsToExport = getSelectedTexts();
    if (textsToExport.length > 0) {
        // --- USE CONVERTED DELIMITER ---
        const selectedValue = delimiterSelect.value;
        const actualDelimiter = getActualDelimiter(selectedValue); // Get the real character(s)
        const textContent = textsToExport.join(actualDelimiter); // Use the actual delimiter
        // --- END DELIMITER USE ---
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url: url,
            filename: 'extracted_text.txt',
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error("Download failed:", chrome.runtime.lastError);
                alert("Could not start download. Check permissions or console.");
            } else {
                console.log("Download started with ID:", downloadId);
                 exportBtn.textContent = 'Exported!';
                 setTimeout(() => { exportBtn.textContent = 'Export Selected (.txt)'; }, 1500);
            }
             setTimeout(() => URL.revokeObjectURL(url), 1000);
        });

    } else {
        alert("No text selected to export.");
    }
});

// (Keep selectAllBtn, deselectAllBtn listeners)
selectAllBtn.addEventListener('click', () => {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => row.classList.add('selected'));
    if(rows.length > 0) lastSelectedRowIndex = rows.length - 1;
});

deselectAllBtn.addEventListener('click', () => {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => row.classList.remove('selected'));
    lastSelectedRowIndex = -1;
});


// --- Initialization ---
console.log("[Results] Initializing..."); // Log start

chrome.storage.local.get('extractedTexts', (result) => {
    // --- ADD LOGS INSIDE CALLBACK ---
    console.log("[Results] Storage get callback executed.");
    if (chrome.runtime.lastError) {
        console.error("[Results] Error retrieving stored text:", chrome.runtime.lastError);
        renderTable(["Error loading data."]);
    } else {
        console.log("[Results] Retrieved from storage:", result); // Log the whole result object
        const texts = result ? result.extractedTexts : null; // Safer access
        console.log("[Results] Texts variable assigned:", texts); // Log the extracted array specifically
        if (texts && Array.isArray(texts)) {
             console.log("[Results] Calling renderTable with texts.");
             renderTable(texts);
             // Clear storage ONLY after successful rendering setup
             chrome.storage.local.remove('extractedTexts', () => {
                 console.log("[Results] Cleared stored texts.");
             });
        } else {
            console.warn("[Results] No valid 'extractedTexts' array found in storage result.", result);
            renderTable([]); // Render an empty table explicitly
        }
    }
    // --- END LOGS ---
});