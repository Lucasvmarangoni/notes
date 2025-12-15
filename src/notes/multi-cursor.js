// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class MultiCursorManager {
    constructor(app) {
        this.app = app;
        this.selections = []; // Array of { range: Range, type: 'caret' | 'range' }
        this.activeNote = null;
        this.isAltDown = false;

        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Alt') this.isAltDown = true;
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Alt') this.isAltDown = false;
        });

        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.note-content')) {
                this.clearSelections();
            }
        });
    }

    handleMouseDown(e, noteContent) {
        if (!e.altKey) {
            // If clicking without Alt, clear previous multi-selections unless we are just starting a drag
            // We'll clear on mouseup if no multi-selection was added? 
            // Actually standard behavior: click without modifier clears other cursors.
            this.clearSelections();
            this.activeNote = noteContent;
            return;
        }

        if (this.activeNote && this.activeNote !== noteContent) {
            this.clearSelections();
        }
        this.activeNote = noteContent;

        // We need to capture the *previous* selection before the browser updates it for the new click
        // But mousedown happens *before* selection change usually.
        // Wait, Alt+Click in VSCode adds a cursor.
        // The browser will set the caret to the clicked location.
        // We want to KEEP the existing selection.

        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0).cloneRange();
            this.addSelection(range);
        }

        // The browser will now process the click and create a NEW selection at the click target.
        // We need to let that happen, then add THAT new selection to our list?
        // No, the browser only supports ONE selection.
        // So we store the OLD one as a "virtual" selection, and let the browser hold the NEW one.
    }

    handleMouseUp(e) {
        if (e.altKey && this.activeNote) {
            // The click has finished, the browser has set the new selection.
            // We don't need to do anything, the "live" selection is the one the user just made.
            // Our stored selections are the "previous" ones.
            this.renderSelections();
        }
    }

    addSelection(range) {
        // Check if range is valid and inside active note
        if (!this.activeNote.contains(range.commonAncestorContainer)) return;

        // Avoid duplicates
        const isDuplicate = this.selections.some(s =>
            s.range.compareBoundaryPoints(Range.START_TO_START, range) === 0 &&
            s.range.compareBoundaryPoints(Range.END_TO_END, range) === 0
        );

        if (!isDuplicate) {
            this.selections.push({
                range: range,
                type: range.collapsed ? 'caret' : 'range'
            });
        }
    }

    clearSelections() {
        this.selections = [];
        this.removeVisuals();
        this.activeNote = null;
    }

    removeVisuals() {
        document.querySelectorAll('.multi-cursor-highlight, .multi-cursor-caret').forEach(el => el.remove());
    }

    renderSelections() {
        this.removeVisuals();
        if (!this.activeNote) return;

        const rect = this.activeNote.getBoundingClientRect();

        this.selections.forEach(sel => {
            if (sel.type === 'range') {
                const rects = sel.range.getClientRects();
                for (const r of rects) {
                    const div = document.createElement('div');
                    div.className = 'multi-cursor-highlight';
                    // Fix: Use offset relative to the note content container
                    div.style.left = `${r.left - rect.left + this.activeNote.scrollLeft}px`;
                    div.style.top = `${r.top - rect.top + this.activeNote.scrollTop}px`;
                    div.style.width = `${r.width}px`;
                    div.style.height = `${r.height}px`;
                    this.activeNote.appendChild(div);
                }
            } else {
                // Caret
                let r = sel.range.getBoundingClientRect();

                // If collapsed, getBoundingClientRect might be 0 width/height or wrong position if at start of line
                // Try to use getClientRects first
                const rects = sel.range.getClientRects();
                if (rects.length > 0) {
                    r = rects[0];
                }

                let left = r.left;
                let top = r.top;
                let height = r.height;

                // Fallback for empty lines or weird positions
                if (height === 0) {
                    // Create a temp span to measure position
                    const span = document.createElement('span');
                    span.textContent = '\u200b'; // Zero-width space
                    sel.range.insertNode(span);
                    const spanRect = span.getBoundingClientRect();
                    left = spanRect.left;
                    top = spanRect.top;
                    height = spanRect.height;
                    span.remove();
                    // Normalize range
                    sel.range.collapse(true);
                }

                if (height > 0) {
                    const div = document.createElement('div');
                    div.className = 'multi-cursor-caret';
                    div.style.left = `${left - rect.left + this.activeNote.scrollLeft}px`;
                    div.style.top = `${top - rect.top + this.activeNote.scrollTop}px`;
                    div.style.height = `${height}px`;
                    this.activeNote.appendChild(div);
                }
            }
        });
    }

    // This method will be called by ToolbarManager
    execCommand(command, showUI, value) {
        if (this.selections.length === 0) {
            // Normal behavior
            return document.execCommand(command, showUI, value);
        }

        // Apply to all selections
        // 1. Apply to the current "live" selection (handled by browser or we do it explicitly)
        document.execCommand(command, showUI, value);

        // 2. Apply to stored selections
        const selection = window.getSelection();
        const liveRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

        this.selections.forEach(sel => {
            selection.removeAllRanges();
            selection.addRange(sel.range);
            document.execCommand(command, showUI, value);
            // Update the range in our list because formatting might have split nodes
            sel.range = selection.getRangeAt(0).cloneRange();
        });

        // Restore live selection
        if (liveRange) {
            selection.removeAllRanges();
            selection.addRange(liveRange);
        }

        this.renderSelections();
    }

    // Handle typing (basic support)
    handleInput(e) {
        if (this.selections.length === 0) return;

        // We need to apply the same action to all stored selections.
        // Important: Process in reverse order to avoid invalidating ranges due to offsets shifting.
        // But for typing, we want to insert at each cursor.

        const selection = window.getSelection();
        const liveRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

        // We temporarily remove the live range to avoid interference, or just be careful.
        // Actually, the live event ALREADY happened for the live cursor.
        // So we only need to apply to the stored selections.

        if (e.inputType === 'insertText' && e.data) {
            const text = e.data;
            // Reverse order is crucial for insertions
            for (let i = this.selections.length - 1; i >= 0; i--) {
                const sel = this.selections[i];
                const range = sel.range;

                range.deleteContents();
                const textNode = document.createTextNode(text);
                range.insertNode(textNode);

                // Move cursor to end of inserted text
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                sel.type = 'caret';
            }
        } else if (e.inputType === 'deleteContentBackward') {
            for (let i = this.selections.length - 1; i >= 0; i--) {
                const sel = this.selections[i];
                const range = sel.range;

                if (!range.collapsed) {
                    range.deleteContents();
                    sel.type = 'caret';
                } else {
                    // Backspace on caret
                    // Move start back by 1 character
                    if (range.startOffset > 0) {
                        range.setStart(range.startContainer, range.startOffset - 1);
                        range.deleteContents();
                    } else {
                        // Complex case: crossing node boundaries. 
                        // Simplified: try execCommand 'delete' on the range?
                        selection.removeAllRanges();
                        selection.addRange(range);
                        document.execCommand('delete');
                        sel.range = selection.getRangeAt(0).cloneRange();
                    }
                }
            }
        }

        // Restore live selection
        if (liveRange) {
            selection.removeAllRanges();
            selection.addRange(liveRange);
        }

        this.renderSelections();
    }

    applyToSelections(action) {
        // Not used anymore, logic moved to handleInput for better control
    }
}
