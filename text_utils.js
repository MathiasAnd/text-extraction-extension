// text_utils.js

window.TextExtractorUtils = window.TextExtractorUtils || {};

// --- ADD GUARD ---
// Check if one of the functions exists as a proxy for initialization
if (typeof window.TextExtractorUtils.extractTextNodes === 'undefined') {
    console.log("[Text Utils] Initializing..."); // Log initialization

    window.TextExtractorUtils.extractTextNodes = function(element, texts = []) {
        if (!element) return texts;
        element.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) {
                    texts.push(text);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                if (tagName !== 'script' && tagName !== 'style') {
                     window.TextExtractorUtils.extractTextNodes(node, texts);
                }
            }
        });
        return texts;
    }

    window.TextExtractorUtils.findCodeElement = function(startElement) {
        let current = startElement;
        while (current) {
            const tagName = current.tagName.toLowerCase();
            if (tagName === 'code' || tagName === 'pre') {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

} else {
    console.log("[Text Utils] Already initialized."); // Log skip
}
// --- END GUARD ---