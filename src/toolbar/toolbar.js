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
                    <button class="code-format-btn" title="Format as code (Ctrl+E)">&lt;/</button>
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
            this.applyColor(colorPicker.value);

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
                this.applyColor(color);
            });
        });

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

        const container = range.commonAncestorContainer;
        if (container.nodeType === Node.ELEMENT_NODE) {
            noteContent = container.closest('.note-content');
        } else {
            noteContent = container.parentElement?.closest('.note-content');
        }

        if (!noteContent) return;

        let text = selection.toString();

        if (!text.trim()) {
            const lineText = this.markdownProcessor.getCurrentLineText(noteContent, range);
            if (lineText.trim()) {
                text = lineText.trim();
            } else {
                return;
            }
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0) return;

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

        const html = this.markdownProcessor.markdownToHTML(markdownText);

        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('insertHTML', false, html);

        setTimeout(() => {
            const newSelection = window.getSelection();
            if (newSelection.rangeCount > 0) {
                const newRange = newSelection.getRangeAt(0);
                const container = newRange.commonAncestorContainer;
                const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                const lists = noteContent.querySelectorAll('ul, ol');
                const checkboxes = noteContent.querySelectorAll('.checkbox-item');

                let targetElement = null;
                if (lists.length > 0) {
                    const lastList = lists[lists.length - 1];
                    const items = lastList.querySelectorAll('li');
                    if (items.length > 0) {
                        targetElement = items[items.length - 1];
                    }
                } else if (checkboxes.length > 0) {
                    targetElement = checkboxes[checkboxes.length - 1].querySelector('span');
                }

                if (targetElement) {
                    const finalRange = document.createRange();
                    if (targetElement.tagName === 'SPAN') {
                        finalRange.selectNodeContents(targetElement);
                        finalRange.collapse(false);
                    } else {
                        if (targetElement.firstChild && targetElement.firstChild.nodeType === Node.TEXT_NODE) {
                            const textNode = targetElement.firstChild;
                            finalRange.setStart(textNode, textNode.textContent.length);
                            finalRange.setEnd(textNode, textNode.textContent.length);
                        } else {
                            finalRange.selectNodeContents(targetElement);
                            finalRange.collapse(false);
                        }
                    }
                    newSelection.removeAllRanges();
                    newSelection.addRange(finalRange);
                }
            }
        }, 0);
    }

    applyColor(color) {
        document.execCommand('foreColor', false, color);
        this.fixUnderlineColor();
    }

    fixUnderlineColor() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;

        const container = commonAncestor.nodeType === Node.TEXT_NODE
            ? commonAncestor.parentElement
            : commonAncestor;

        const candidates = [];
        if (this.isColorNode(container)) {
            candidates.push(container);
        }

        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    if (this.isColorNode(node)) return NodeFilter.FILTER_ACCEPT;
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        while (walker.nextNode()) {
            candidates.push(walker.currentNode);
        }

        const processed = new Set();
        candidates.forEach(node => {
            if (processed.has(node)) return;

            if (range.intersectsNode(node)) {
                const uParent = node.closest('u');
                if (uParent) {
                    this.swapUAndColor(node);
                    processed.add(node);
                }
            }
        });
    }

    isColorNode(node) {
        return node.tagName === 'FONT' || (node.tagName === 'SPAN' && node.style.color);
    }

    swapUAndColor(colorNode) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(colorNode);
        selection.removeAllRanges();
        selection.addRange(range);

        if (document.queryCommandState('underline')) {
            document.execCommand('underline');
            document.execCommand('underline');
        }
    }
}

