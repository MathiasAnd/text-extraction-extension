// highlighter.js

window.TextExtractorUtils = window.TextExtractorUtils || {};

// Store highlighted element globally within our namespace
window.TextExtractorUtils.highlightedElement = null;
window.TextExtractorUtils.currentHighlightStyle = null;

const HIGHLIGHT_STYLES = {
    default: { outline: '2px solid red', cursor: 'pointer' },
    code:    { outline: '2px solid blue', cursor: 'copy' } // Use 'copy' cursor for code mode
};

window.TextExtractorUtils.applyHighlight = function(element, styleName = 'default') {
    if (!element) return;
    const style = HIGHLIGHT_STYLES[styleName] || HIGHLIGHT_STYLES.default;

    // Avoid reapplying the exact same style to the same element
    if (window.TextExtractorUtils.highlightedElement === element &&
        window.TextExtractorUtils.currentHighlightStyle === styleName) {
        return;
    }

    // Remove previous highlight before applying new one
    window.TextExtractorUtils.removeHighlight();

    window.TextExtractorUtils.highlightedElement = element;
    window.TextExtractorUtils.currentHighlightStyle = styleName;

    // Apply new styles
    Object.assign(element.style, style);
}

window.TextExtractorUtils.removeHighlight = function() {
    const el = window.TextExtractorUtils.highlightedElement;
    if (el) {
        const style = HIGHLIGHT_STYLES[window.TextExtractorUtils.currentHighlightStyle] || HIGHLIGHT_STYLES.default;
        // Reset only the styles we changed
        for (const prop in style) {
            el.style[prop] = '';
        }
        window.TextExtractorUtils.highlightedElement = null;
        window.TextExtractorUtils.currentHighlightStyle = null;
    }
}