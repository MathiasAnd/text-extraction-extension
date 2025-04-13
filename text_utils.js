// text_utils.js

window.TextExtractorUtils = window.TextExtractorUtils || {};

// Original text extraction logic
window.TextExtractorUtils.extractTextNodes = function(element, texts = []) {
    if (!element) return texts;

    element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                // Avoid adding duplicates right away if possible?
                // Let's keep the Set logic at the end for simplicity now.
                texts.push(text);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Avoid extracting text from script/style tags within the element
            const tagName = node.tagName.toLowerCase();
            if (tagName !== 'script' && tagName !== 'style') {
                 window.TextExtractorUtils.extractTextNodes(node, texts); // Recurse
            }
        }
    });
    return texts; // Return the array being built
}

// Function to find the nearest code block ancestor or self
window.TextExtractorUtils.findCodeElement = function(startElement) {
    let current = startElement;
    while (current) {
        const tagName = current.tagName.toLowerCase();
        if (tagName === 'code' || tagName === 'pre') {
            return current; // Found it!
        }
        // Optional: Add class-based detection later if needed
        // if (current.classList.contains('code-block') || current.classList.contains('highlight')) {
        //     return current;
        // }
        current = current.parentElement; // Move up
    }
    return null; // Not found
}