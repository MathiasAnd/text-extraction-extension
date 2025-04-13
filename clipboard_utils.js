// clipboard_utils.js

// Using a global object to avoid polluting the window directly,
// while still being accessible from other scripts loaded in the same execution context.
window.TextExtractorUtils = window.TextExtractorUtils || {};

window.TextExtractorUtils.copyToClipboard = function(text) {
    if (!text) {
        console.warn("Copy attempt with empty text ignored.");
        return Promise.resolve(false); // Indicate nothing was copied
    }
    return navigator.clipboard.writeText(text)
        .then(() => {
            console.log('Text copied to clipboard successfully!');
            return true; // Indicate success
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            // Maybe provide user feedback here if possible/needed
            return false; // Indicate failure
        });
}