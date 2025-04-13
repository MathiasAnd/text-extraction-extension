// clipboard_utils.js

window.TextExtractorUtils = window.TextExtractorUtils || {};

// --- ADD GUARD ---
if (typeof window.TextExtractorUtils.copyToClipboard === 'undefined') {
    console.log("[Clipboard] Initializing..."); // Log initialization

    window.TextExtractorUtils.copyToClipboard = function(text) {
        if (!text) {
            console.warn("Copy attempt with empty text ignored.");
            return Promise.resolve(false);
        }
        return navigator.clipboard.writeText(text)
            .then(() => {
                console.log('Text copied to clipboard successfully!');
                return true;
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                return false;
            });
    }

} else {
    console.log("[Clipboard] Already initialized."); // Log skip
}
// --- END GUARD ---