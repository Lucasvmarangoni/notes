// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class MultiCursorManager {
    constructor(app) {
        this.app = app;
        this.selections = []; // Array of { range: Range, type: 'caret' | 'range' }
        this.activeNote = null;
        this.isAltDown = false;
        this.undoStack = [];

        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && this.selections.length > 0 && this.activeNote) {
                if (this.undoStack.length > 0) {
                    e.preventDefault();
                    this.restoreState();
                }
            }
        });
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

    saveState() {
        if (!this.activeNote) return;
        if (this.undoStack.length > 20) this.undoStack.shift();

        this.undoStack.push({
            html: this.activeNote.innerHTML,
            note: this.activeNote
        });
    }

    restoreState() {
        const state = this.undoStack.pop();
        if (state && state.note) {
            state.note.innerHTML = state.html;
            this.clearSelections();
        }
    }

    handleMouseDown(e, noteContent) {
        if (!e.altKey || !e.ctrlKey) {
            this.clearSelections();
            this.activeNote = noteContent;
            return;
        }

        if (this.activeNote && this.activeNote !== noteContent) {
            this.clearSelections();
        }
        this.activeNote = noteContent;

        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0).cloneRange();
            this.addSelection(range);
        }
    }

    handleMouseUp(e) {
        if (e.altKey && e.ctrlKey && this.activeNote) {
            this.renderSelections();
        }
    }

    addSelection(range) {
        if (!this.activeNote.contains(range.commonAncestorContainer)) return;

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
                    div.style.left = `${r.left - rect.left + this.activeNote.scrollLeft}px`;
                    div.style.top = `${r.top - rect.top + this.activeNote.scrollTop}px`;
                    div.style.width = `${r.width}px`;
                    div.style.height = `${r.height}px`;
                    this.activeNote.appendChild(div);
                }
            } else {
                let r = sel.range.getBoundingClientRect();
                const rects = sel.range.getClientRects();
                if (rects.length > 0) {
                    r = rects[0];
                }

                let left = r.left;
                let top = r.top;
                let height = r.height;

                if (height === 0) {
                    const span = document.createElement('span');
                    span.textContent = '\u200b';
                    sel.range.insertNode(span);
                    const spanRect = span.getBoundingClientRect();
                    left = spanRect.left;
                    top = spanRect.top;
                    height = spanRect.height;
                    span.remove();
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

        this.saveState();

        document.execCommand(command, showUI, value);
        const selection = window.getSelection();
        const liveRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

        this.selections.forEach(sel => {
            selection.removeAllRanges();
            selection.addRange(sel.range);
            document.execCommand(command, showUI, value);
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

        const selection = window.getSelection();
        const liveRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

        if (e.inputType === 'insertText' && e.data) {
            const text = e.data;
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
                    if (range.startOffset > 0) {
                        range.setStart(range.startContainer, range.startOffset - 1);
                        range.deleteContents();
                    } else {
                        selection.removeAllRanges();
                        selection.addRange(range);
                        document.execCommand('delete');
                        sel.range = selection.getRangeAt(0).cloneRange();
                    }
                }
            }
        }

        if (liveRange) {
            selection.removeAllRanges();
            selection.addRange(liveRange);
        }

        this.renderSelections();
    }

    applyToSelections(action) {
    }
}
