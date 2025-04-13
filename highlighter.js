// In highlighter.js

window.TextExtractorUtils = window.TextExtractorUtils || {};

if (typeof window.TextExtractorUtils.applyHighlight === 'undefined') {
    // console.log("[Highlighter] Initializing..."); // Optional

    window.TextExtractorUtils.highlightedElement = null;
    window.TextExtractorUtils.currentHighlightStyle = null;

    const HIGHLIGHT_STYLES = {
        default: { outline: '2px solid red', cursor: 'pointer' },
        code:    { outline: '2px solid blue', cursor: 'copy' }
    };

    window.TextExtractorUtils.applyHighlight = function(element, styleName = 'default') {
        // --- ADD DETAILED LOGS ---
        // <-- Is this function called?
        console.log("[Highlighter] applyHighlight: Called with element:", element, "styleName:", styleName);

        if (!element) {
            console.log("[Highlighter] applyHighlight: Exiting - element is null/undefined.");
            return;
        }
        const style = HIGHLIGHT_STYLES[styleName] || HIGHLIGHT_STYLES.default;
        console.log("[Highlighter] applyHighlight: Style object to apply:", style); // <-- Is style correct?

        if (window.TextExtractorUtils.highlightedElement === element &&
            window.TextExtractorUtils.currentHighlightStyle === styleName) {
            // console.log("[Highlighter] applyHighlight: Exiting - element and style already applied."); // Optional
            return;
        }

        // console.log("[Highlighter] applyHighlight: Removing previous highlight (if any)."); // Optional
        window.TextExtractorUtils.removeHighlight();

        window.TextExtractorUtils.highlightedElement = element;
        window.TextExtractorUtils.currentHighlightStyle = styleName;

        console.log("[Highlighter] applyHighlight: Applying new styles via Object.assign."); // <-- Is this reached?
        try {
             Object.assign(element.style, style);
             // <-- Does it succeed?
             console.log("[Highlighter] applyHighlight: Styles applied successfully.");
        } catch (e) {
             console.error("[Highlighter] applyHighlight: Error applying styles:", e);
        }
        // --- END LOGS ---
    }

    window.TextExtractorUtils.removeHighlight = function() {
        const el = window.TextExtractorUtils.highlightedElement;
        if (el) {
            const style = HIGHLIGHT_STYLES[window.TextExtractorUtils.currentHighlightStyle] || HIGHLIGHT_STYLES.default;
            for (const prop in style) {
                el.style[prop] = '';
            }
            window.TextExtractorUtils.highlightedElement = null;
            window.TextExtractorUtils.currentHighlightStyle = null;
        }
    }

} else {
     // console.log("[Highlighter] Already initialized.");
}