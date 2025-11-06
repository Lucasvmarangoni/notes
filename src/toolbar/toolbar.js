// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class ToolbarManager {
    constructor(app, markdownProcessor, layoutManager) {
        this.app = app;
        this.markdownProcessor = markdownProcessor;
        this.layoutManager = layoutManager;
    }

    createToolbar() {
        const toolbarElement = document.createElement('div');
        toolbarElement.id = 'global-toolbar';
        toolbarElement.innerHTML = `
            <div class="note-actions">
                <div class="note-toolbar">
                    <button class="bold-btn" title="Bold (Ctrl+B)">B</button>
                    <button class="underline-btn" title="Underline (Ctrl+U)">U</button>
                    <button class="reset-format" title="Reset formatting (Ctrl+\\)">C</button>
                    <button class="code-format-btn" title="Format as code (Ctrl+F)">&lt;/</button>
                    <button class="bullet-list-btn" title="Convert to bullet list">•</button>
                    <button class="numbered-list-btn" title="Convert to numbered list">1.</button>
                    <button class="checkbox-list-btn" title="Convert to checkbox list">☐</button>
                    <input type="color" class="color-picker" value="#ffffff" title="Text color">
                    <button class="color-preset" style="background-color: ${this.app.color1};" title="Color 1 (Ctrl+1)"></button>
                    <button class="color-preset" style="background-color: ${this.app.color2};" title="Color 2 (Ctrl+2)"></button>
                    <button class="color-preset" style="background-color: ${this.app.color3};" title="Color 3 (Ctrl+3)"></button>
                    <button class="color-preset" style="background-color: ${this.app.color4};" title="Color 4 (Ctrl+4)"></button>  
                </div>
            </div>`;

        const sectionsContent = document.getElementById('sections-content');
        const parentElement = sectionsContent.parentElement;
        parentElement.insertBefore(toolbarElement, sectionsContent);

        this.setupToolbarEvents(toolbarElement);
        
        // Update layout positions after toolbar is created
        setTimeout(() => this.layoutManager.updateLayoutPositions(), 0);
    }

    setupToolbarEvents(toolbar) {
        const boldBtn = toolbar.querySelector('.bold-btn');
        const underlineBtn = toolbar.querySelector('.underline-btn');
        const colorPicker = toolbar.querySelector('.color-picker');
        const resetFormatBtn = toolbar.querySelector('.reset-format');
        const colorPresets = toolbar.querySelectorAll('.color-preset');
        const codeFormatBtn = toolbar.querySelector('.code-format-btn');

        codeFormatBtn.addEventListener('click', () => {
            this.app.formatAsCode();
        });
        boldBtn.addEventListener('click', () => {
            document.execCommand('bold', false, null);
        });

        underlineBtn.addEventListener('click', () => {
            document.execCommand('underline', false, null);
        });

        colorPicker.addEventListener('input', () => {
            this.app.colorPickerCurrentColor = colorPicker.value;
            document.execCommand('foreColor', false, colorPicker.value);

            if (this.app.autoSaveEnabled) {
                this.app.storageManager.saveNotesToLocalStorage(true);
            }
        });

        resetFormatBtn.addEventListener('click', (e) => {
            this.app.cleanFormatting(e)
        });

        colorPresets.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const colorProperty = `color${index + 1}`;
                const color = this.app[colorProperty];
                document.execCommand('foreColor', false, color);
            });
        });

        // List conversion buttons
        const bulletBtn = toolbar.querySelector('.bullet-list-btn');
        const numberedBtn = toolbar.querySelector('.numbered-list-btn');
        const checkboxBtn = toolbar.querySelector('.checkbox-list-btn');

        bulletBtn.addEventListener('click', () => {
            this.convertSelectionToList('bullet');
        });

        numberedBtn.addEventListener('click', () => {
            this.convertSelectionToList('numbered');
        });

        checkboxBtn.addEventListener('click', () => {
            this.convertSelectionToList('checkbox');
        });
    }

    convertSelectionToList(type) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let noteContent = null;
        
        // Find the note-content element
        const container = range.commonAncestorContainer;
        if (container.nodeType === Node.ELEMENT_NODE) {
            noteContent = container.closest('.note-content');
        } else {
            noteContent = container.parentElement?.closest('.note-content');
        }
        
        if (!noteContent) return;

        // Get selected text
        let text = selection.toString();
        
        // If nothing is selected, try to get the current line
        if (!text.trim()) {
            const lineText = this.markdownProcessor.getCurrentLineText(noteContent, range);
            if (lineText.trim()) {
                text = lineText.trim();
            } else {
                return; // Nothing to convert
            }
        }

        // Split text into lines and filter empty lines
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0) return;

        // Create markdown text based on type
        let markdownText = '';
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed) {
                if (type === 'bullet') {
                    markdownText += `* ${trimmed}`;
                } else if (type === 'numbered') {
                    markdownText += `${index + 1}. ${trimmed}`;
                } else if (type === 'checkbox') {
                    markdownText += `> ${trimmed}`;
                }
                if (index < lines.length - 1) {
                    markdownText += '\n';
                }
            }
        });

        // Delete the selected content
        range.deleteContents();
        
        // Insert the markdown text
        const textNode = document.createTextNode(markdownText);
        range.insertNode(textNode);
        
        // Move cursor to end of inserted text
        const newRange = document.createRange();
        newRange.setStartAfter(textNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // Process markdown to convert to list
        setTimeout(() => {
            this.markdownProcessor.processMarkdown(noteContent);
        }, 0);
    }
}

