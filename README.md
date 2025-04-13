# Element Text Extractor

A simple browser extension to easily select web page elements, extract their distinct text parts, and copy or export them. Includes a standard mode for extracting all text parts into a popup and a code mode for quickly copying text content from `<code>` or `<pre>` blocks.

## Features

*   Click-to-select interface for targeting elements on a webpage.
*   Visual highlighting of elements on hover (red outline for standard mode, blue for code mode).
*   **Standard Mode (Default):**
    *   Extracts distinct text nodes found within the selected element and its children.
    *   Displays extracted text parts in a popup table.
    *   Allows multi-selection (click, Shift+Click) of text parts in the table.
    *   Copies selected text parts to the clipboard using a chosen delimiter (newline, space, comma, etc.).
    *   Exports selected text parts to a `.txt` file in your Downloads folder.
*   **Code Mode:**
    *   Toggleable by pressing the `c` key while selection is active.
    *   Highlights the nearest parent `<code>` or `<pre>` block on hover.
    *   Copies the entire text content of the clicked code block directly to the clipboard.
*   Cancel selection anytime with the `Esc` key or by clicking the extension icon again.

## Supported Browsers

*   Primarily developed and tested on **Google Chrome** (using Manifest V3).
*   Adaptation for Mozilla Firefox may be possible but is not explicitly supported here.

## Installation (Local Development Mode)

Since this is not published on the Chrome Web Store, you need to load it manually in Developer Mode:

1.  **Download/Clone:** Get the extension files onto your computer (e.g., download as ZIP and extract, or clone the repository if you're using Git).
2.  **Open Chrome Extensions:** Open Google Chrome and navigate to `chrome://extensions/`.
3.  **Enable Developer Mode:** Find the "Developer mode" toggle switch (usually in the top-right corner) and turn it **ON**.
4.  **Load Unpacked:** Click the "Load unpacked" button that appears.
5.  **Select Folder:** In the file browser window that opens, navigate to and select the main folder containing the extension's files (the folder where `manifest.json` is located, e.g., `text_extractor_extension/`). Click "Select Folder".
6.  **Done:** The "Element Text Extractor" extension should now appear in your list of extensions, and its icon should be available in your Chrome toolbar (you might need to click the puzzle piece icon and pin it).

## Usage

1.  Navigate to the webpage where you want to extract text.
2.  Click the "Element Text Extractor" icon in your browser toolbar. The icon should indicate it's active (e.g., show an 'ON' badge), and your mouse cursor should change to a crosshair.
3.  **Standard Mode (Default):**
    *   Hover over elements on the page; they will be highlighted with a red outline.
    *   Click the desired element.
    *   A popup window will appear displaying the distinct text parts found within that element.
    *   In the popup:
        *   Click rows to select/deselect individual text parts.
        *   Hold `Shift` and click another row to select a range.
        *   Use the "Join with:" dropdown to choose how selected text should be combined when copied or exported.
        *   Click "Copy Selected" to copy the combined text to your clipboard.
        *   Click "Export Selected (.txt)" to save the combined text to a file in your Downloads folder.
        *   Use "Select All" / "Deselect All" buttons as needed.
4.  **Code Mode:**
    *   While the selection cursor (crosshair) is active, press the `c` key on your keyboard. The cursor should change (e.g., to a 'copy' cursor), indicating Code Mode is active.
    *   Hover over code blocks on the page (elements within `<code>` or `<pre>` tags); they will be highlighted with a blue outline. Non-code elements will not be highlighted.
    *   Click the highlighted code block.
    *   The code block's full text content will be copied directly to your clipboard, and the selection mode will automatically end.
    *   Press `c` again while active to toggle back to Standard Mode.
5.  **Cancelling:** At any point while the selection cursor is active (crosshair or copy), you can:
    *   Press the `Esc` key on your keyboard.
    *   Click the extension icon in the toolbar again.
    This will cancel the selection mode and return your cursor to normal.

## File Structure
/
├── manifest.json # Extension configuration and permissions
├── background.js # Service worker: handles extension activation, communication, popup creation
├── content_script.js # Main script injected into pages: handles user interaction (hover, click, keys), state management
├── highlighter.js # Utility script: handles DOM element highlighting logic
├── text_utils.js # Utility script: handles text extraction and code finding logic
├── clipboard_utils.js # Utility script: handles clipboard interaction logic
├── results.html # Popup window HTML structure
├── results.js # Popup window JavaScript logic (table rendering, selection, copy/export actions)
├── results.css # Popup window styling
└── icons/ # Folder containing extension icons (16x16, 48x48, 128x128)