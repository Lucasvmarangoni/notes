// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class NotesManager {
    constructor(app, markdownProcessor, storageManager) {
        this.app = app;
        this.markdownProcessor = markdownProcessor;
        this.storageManager = storageManager;
        this.draggingNote = null;
        this.resizingNote = null;
        this.selectedNotes = new Set();
        this.multiDragStartPositions = null;
        this.SNAP_THRESHOLD = 5;
        this.GUIDE_THRESHOLD = 20;
        this.guides = [];
    }

    clearGuides() {
        this.guides.forEach(guide => guide.remove());
        this.guides = [];
    }

    drawGuides(guides, sectionContent) {
        this.clearGuides();
        if (!sectionContent) return;

        guides.forEach(guide => {
            const line = document.createElement('div');
            line.classList.add('alignment-guide');

            if (guide.type === 'vertical') {
                line.classList.add('vertical');
                line.style.left = `${guide.x}px`;
                line.style.top = `${Math.min(guide.y1, guide.y2)}px`;
                line.style.height = `${Math.abs(guide.y2 - guide.y1)}px`;
            } else {
                line.classList.add('horizontal');
                line.style.top = `${guide.y}px`;
                line.style.left = `${Math.min(guide.x1, guide.x2)}px`;
                line.style.width = `${Math.abs(guide.x2 - guide.x1)}px`;
            }

            sectionContent.appendChild(line);
            this.guides.push(line);
        });
    }

    getSnapLines(noteRect, otherNotes, sectionRect) {
        const snaps = { x: null, y: null };
        const guides = [];

        // Horizontal candidates (y-axis)
        const hCandidates = [
            { y: noteRect.top, type: 'top' },
            { y: noteRect.top + noteRect.height / 2, type: 'center' },
            { y: noteRect.bottom, type: 'bottom' }
        ];

        // Vertical candidates (x-axis)
        const vCandidates = [
            { x: noteRect.left, type: 'left' },
            { x: noteRect.left + noteRect.width / 2, type: 'center' },
            { x: noteRect.right, type: 'right' }
        ];

        let closestH = { diff: Infinity, snapY: null, guideY: null, otherRect: null };
        let closestV = { diff: Infinity, snapX: null, guideX: null, otherRect: null };

        otherNotes.forEach(other => {
            const otherRect = other.getBoundingClientRect();

            // Check horizontal alignment
            const otherH = [
                otherRect.top,
                otherRect.top + otherRect.height / 2,
                otherRect.bottom
            ];

            hCandidates.forEach(candidate => {
                otherH.forEach(targetY => {
                    const diff = Math.abs(candidate.y - targetY);

                    // Check for guide (visual cue)
                    if (diff < this.GUIDE_THRESHOLD && diff < closestH.diff) {
                        closestH = {
                            diff,
                            snapY: diff < this.SNAP_THRESHOLD ? targetY - (candidate.y - noteRect.top) : null,
                            guideY: targetY,
                            otherRect
                        };
                    }
                });
            });

            // Check vertical alignment
            const otherV = [
                otherRect.left,
                otherRect.left + otherRect.width / 2,
                otherRect.right
            ];

            vCandidates.forEach(candidate => {
                otherV.forEach(targetX => {
                    const diff = Math.abs(candidate.x - targetX);

                    // Check for guide (visual cue)
                    if (diff < this.GUIDE_THRESHOLD && diff < closestV.diff) {
                        closestV = {
                            diff,
                            snapX: diff < this.SNAP_THRESHOLD ? targetX - (candidate.x - noteRect.left) : null,
                            guideX: targetX,
                            otherRect
                        };
                    }
                });
            });
        });

        if (closestH.diff < Infinity) {
            snaps.y = closestH.snapY;
            // Calculate guide line segment
            // We want the line to span between the two notes
            const x1 = Math.min(noteRect.left, closestH.otherRect.left);
            const x2 = Math.max(noteRect.right, closestH.otherRect.right);
            guides.push({
                type: 'horizontal',
                y: closestH.guideY - sectionRect.top,
                x1: x1 - sectionRect.left,
                x2: x2 - sectionRect.left
            });
        }

        if (closestV.diff < Infinity) {
            snaps.x = closestV.snapX;
            const y1 = Math.min(noteRect.top, closestV.otherRect.top);
            const y2 = Math.max(noteRect.bottom, closestV.otherRect.bottom);
            guides.push({
                type: 'vertical',
                x: closestV.guideX - sectionRect.left,
                y1: y1 - sectionRect.top,
                y2: y2 - sectionRect.top
            });
        }

        return { snaps, guides };
    }

    addNote(title = 'New Note', content = '', x = null, y = null, width = 230, height = 200, style = {}, id = null, sectionId = null) {
        // Se sectionId for fornecido, usar essa section; caso contrário, usar a section ativa
        const targetSectionId = sectionId !== null ? sectionId : (this.app.activeSection ? this.app.activeSection.id : null);

        if (targetSectionId === null || targetSectionId === undefined) return;

        // Converter para Number para garantir comparação correta (os IDs podem ser números ou strings)
        const targetSectionIdNum = Number(targetSectionId);
        const targetSection = this.app.sections.find(s => Number(s.id) === targetSectionIdNum);
        if (!targetSection) return;

        const sectionContent = document.querySelector(`.section-content[data-section-id="${targetSectionId}"]`);
        if (!sectionContent) return;

        const noteId = id || Date.now() + Math.random();

        if (x === null || y === null) {
            const sectionRect = sectionContent.getBoundingClientRect();
            const scrollX = sectionContent.scrollLeft;
            const scrollY = sectionContent.scrollTop;
            const viewportCenterX = window.innerWidth / 2;
            const viewportCenterY = window.innerHeight / 2;

            x = (viewportCenterX - sectionRect.left + scrollX) - (width / 2);
            y = (viewportCenterY - sectionRect.top + scrollY) - 50;

            x = Math.max(0, Math.min(x, sectionContent.scrollWidth - width));
            y = Math.max(0, Math.min(y, sectionContent.scrollHeight - height));
        }

        const noteElement = document.createElement('div');
        noteElement.classList.add('note');
        noteElement.dataset.noteId = noteId;
        noteElement.style.left = `${x}px`;
        noteElement.style.top = `${y}px`;
        noteElement.style.width = `${width}px`;
        noteElement.style.height = `${height}px`;

        noteElement.innerHTML = `
        <div class="drag">
            <div class="note-header">
                <div class="note-title" contenteditable="true">${title}</div>
                <button class="delete-btn" title="Excluir nota">✖</button>
            </div>
            <div class="note-content" contenteditable="true">${content}</div>      
            <div class="resize-handle"></div>
        </div>
    `;

        if (style) {
            const noteContent = noteElement.querySelector('.note-content');
            Object.assign(noteContent.style, style);
        }

        this.setupNoteDragAndResize(noteElement);
        this.setupNoteActions(noteElement);

        sectionContent.appendChild(noteElement);

        const note = {
            id: noteId,
            title,
            content,
            x,
            y,
            width,
            height,
            style
        };

        targetSection.notes.push(note);

        if (this.app.autoSaveEnabled) {
            this.storageManager.saveNotesToLocalStorage(true);
        }

        return noteElement;
    }

    setupNoteDragAndResize(noteElement) {
        const header = noteElement.querySelector('.drag');
        const resizeHandle = noteElement.querySelector('.resize-handle');

        header.addEventListener('mousedown', (e) => {
            if (e.target.isContentEditable) return;

            const rect = noteElement.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const isMultiDrag = this.selectedNotes.size > 1 && this.selectedNotes.has(noteElement);

            if (isMultiDrag) {
                this.multiDragStartPositions = Array.from(this.selectedNotes).map(n => {
                    const rect = n.getBoundingClientRect();
                    return {
                        element: n,
                        startX: rect.left,
                        startY: rect.top,
                        offsetX: e.clientX - rect.left,
                        offsetY: e.clientY - rect.top
                    };
                });
            } else {
                this.app.draggingNote = {
                    element: noteElement,
                    offsetX,
                    offsetY
                };
                this.draggingNote = this.app.draggingNote;
            }
        });

        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const startWidth = parseInt(getComputedStyle(noteElement).width);
            const startHeight = parseInt(getComputedStyle(noteElement).height);

            this.app.resizingNote = {
                element: noteElement,
                startWidth,
                startHeight,
                startX: e.clientX,
                startY: e.clientY
            };
            this.resizingNote = this.app.resizingNote;
        });
    }

    handleMouseMove(e) {
        if (this.multiDragStartPositions) {
            const sectionContent = this.app.activeSection
                ? document.querySelector(`.section-content[data-section-id="${this.app.activeSection.id}"]`)
                : null;
            if (!sectionContent) return;

            const sectionRect = sectionContent.getBoundingClientRect();

            this.multiDragStartPositions.forEach(pos => {
                const x = e.clientX - pos.offsetX - sectionRect.left;
                const y = e.clientY - pos.offsetY - sectionRect.top;
                pos.element.style.left = `${Math.max(0, x)}px`;
                pos.element.style.top = `${Math.max(0, y)}px`;
            });
            return;
        }

        if (this.app.draggingNote) {
            const sectionContent = this.app.draggingNote.element.closest('.section-content');
            const sectionRect = sectionContent.getBoundingClientRect();

            const x = e.clientX - sectionRect.left - this.app.draggingNote.offsetX;
            const y = e.clientY - sectionRect.top - this.app.draggingNote.offsetY;

            // Get other notes for snapping
            const otherNotes = Array.from(sectionContent.querySelectorAll('.note')).filter(n => n !== this.app.draggingNote.element);

            // Calculate potential new position rect
            const currentRect = this.app.draggingNote.element.getBoundingClientRect();
            const newRect = {
                left: e.clientX - this.app.draggingNote.offsetX,
                top: e.clientY - this.app.draggingNote.offsetY,
                width: currentRect.width,
                height: currentRect.height,
                right: e.clientX - this.app.draggingNote.offsetX + currentRect.width,
                bottom: e.clientY - this.app.draggingNote.offsetY + currentRect.height
            };

            const { snaps, guides } = this.getSnapLines(newRect, otherNotes, sectionRect);

            const finalX = snaps.x !== null ? snaps.x - sectionRect.left : x;
            const finalY = snaps.y !== null ? snaps.y - sectionRect.top : y;

            this.app.draggingNote.element.style.left = `${Math.max(0, finalX)}px`;
            this.app.draggingNote.element.style.top = `${Math.max(0, finalY)}px`;

            this.drawGuides(guides, sectionContent);
        }

        if (this.app.resizingNote) {
            const dx = e.clientX - this.app.resizingNote.startX;
            const dy = e.clientY - this.app.resizingNote.startY;

            const newWidth = Math.max(130, this.app.resizingNote.startWidth + dx);
            const newHeight = Math.max(85, this.app.resizingNote.startHeight + dy);

            this.app.resizingNote.element.style.width = `${newWidth}px`;
            this.app.resizingNote.element.style.height = `${newHeight}px`;
        }
    }

    setupNoteActions(noteElement) {
        const deleteBtn = noteElement.querySelector('.delete-btn');
        const noteContent = noteElement.querySelector('.note-content');

        noteContent.addEventListener('blur', () => {
            this.markdownProcessor.processMarkdown(noteContent);
            this.markdownProcessor.removeEmptyBullets(noteContent);
        });

        noteContent.addEventListener('input', (e) => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.startContainer;
                const parentElement = container.nodeType === Node.TEXT_NODE
                    ? container.parentElement
                    : container;
                const isInListItem = parentElement?.closest('li');
                const isInCheckbox = parentElement?.closest('.checkbox-item');

                if (isInListItem || isInCheckbox) {
                    return;
                }
            }

            clearTimeout(noteContent._markdownTimeout);
            noteContent._markdownTimeout = setTimeout(() => {
                this.markdownProcessor.processMarkdown(noteContent);
            }, 300);
        });

        noteContent.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                const selection = window.getSelection();
                if (!selection.rangeCount) return;

                const range = selection.getRangeAt(0);
                const container = range.startContainer;
                const parentElement = container.nodeType === Node.TEXT_NODE
                    ? container.parentElement
                    : container;
                const li = parentElement?.closest('li');
                const list = parentElement?.closest('ul, ol');

                // Handle backspace when inside a list but NOT inside an li
                // This happens when content is directly inside ul/ol (like the example with <b>Ex</b>)
                if (list && !li && selection.isCollapsed) {
                    // Check if cursor is at the start of the content
                    const isAtStart = this.isCursorAtElementStart(parentElement, range, list);

                    if (isAtStart) {
                        e.preventDefault();

                        // Move the content element outside the list
                        const elementToMove = this.getTopLevelElementInList(parentElement, list);
                        if (elementToMove) {
                            const listParent = list.parentNode;
                            const listNextSibling = list.nextSibling;

                            // Move element before the list
                            listParent.insertBefore(elementToMove, list);

                            // Place cursor at start of moved element
                            const newRange = document.createRange();
                            if (elementToMove.nodeType === Node.TEXT_NODE) {
                                newRange.setStart(elementToMove, 0);
                                newRange.setEnd(elementToMove, 0);
                            } else {
                                // Find first text node in element
                                const walker = document.createTreeWalker(
                                    elementToMove,
                                    NodeFilter.SHOW_TEXT,
                                    null
                                );
                                const firstTextNode = walker.nextNode();
                                if (firstTextNode) {
                                    newRange.setStart(firstTextNode, 0);
                                    newRange.setEnd(firstTextNode, 0);
                                } else {
                                    newRange.selectNodeContents(elementToMove);
                                    newRange.collapse(true);
                                }
                            }
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                        }
                        return;
                    }
                }

                if (li) {
                    const liText = li.textContent.trim();
                    const isAtStart = range.startOffset === 0 ||
                        (container.nodeType === Node.TEXT_NODE && container === li.firstChild && range.startOffset === 0);

                    if (isAtStart && (!liText || liText.length === 0)) {
                        e.preventDefault();

                        const list = li.parentElement;
                        const parent = list.parentNode;

                        const br = document.createElement('br');
                        const textNode = document.createTextNode('');

                        li.parentNode.insertBefore(br, li);
                        li.parentNode.insertBefore(textNode, br.nextSibling);
                        li.remove();

                        if (list.children.length === 0) {
                            list.remove();
                        }

                        const newRange = document.createRange();
                        newRange.setStart(textNode, 0);
                        newRange.setEnd(textNode, 0);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        return;
                    }

                    if (isAtStart && liText.length > 0) {
                        setTimeout(() => {
                            const liTextAfter = li.textContent.trim();
                            if (!liTextAfter || liTextAfter.length === 0) {
                                const list = li.parentElement;

                                const br = document.createElement('br');
                                const textNode = document.createTextNode('');

                                li.parentNode.insertBefore(br, li);
                                li.parentNode.insertBefore(textNode, br.nextSibling);
                                li.remove();

                                if (list.children.length === 0) {
                                    list.remove();
                                }

                                const newRange = document.createRange();
                                newRange.setStart(textNode, 0);
                                newRange.setEnd(textNode, 0);
                                const sel = window.getSelection();
                                sel.removeAllRanges();
                                sel.addRange(newRange);
                            }
                        }, 0);
                    }
                }
            }
        });

        noteElement.addEventListener('mousedown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                if (this.selectedNotes.has(noteElement)) {
                    this.selectedNotes.delete(noteElement);
                    noteElement.classList.remove('selected');
                } else {
                    this.selectedNotes.add(noteElement);
                    noteElement.classList.add('selected');
                }
            } else if (!e.target.classList.contains('delete-btn') && !e.target.isContentEditable) {
                if (!this.selectedNotes.has(noteElement)) {
                    this.clearSelectedNotes();
                }
            }
        });

        deleteBtn.addEventListener('click', () => {
            const noteId = Number(noteElement.dataset.noteId);
            const sectionId = Number(noteElement.closest('.section-content').dataset.sectionId);
            noteElement.remove();
            const section = this.app.sections.find(section => section.id === sectionId);
            if (section) {
                section.notes = section.notes.filter(note => note.id !== noteId);
            }
            if (this.app.autoSaveEnabled) {
                this.storageManager.saveNotesToLocalStorage(true);
            }
        });
    }

    clearSelectedNotes() {
        this.selectedNotes.forEach(n => n.classList.remove('selected'));
        this.selectedNotes.clear();
    }

    escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    handlePasteEvent(e) {
        const noteContent = e.target.closest('.note-content');
        if (!noteContent) return;

        e.preventDefault();

        const clipboardData = e.clipboardData || window.clipboardData;
        const htmlContent = clipboardData.getData('text/html');
        const plainContent = clipboardData.getData('text/plain');

        let content;

        if (htmlContent) {
            content = htmlContent;
        } else if (plainContent) {
            content = this.escapeHtml(plainContent).replace(/\n/g, '<br>');
        } else {
            return;
        }

        const temp = document.createElement('div');
        temp.innerHTML = content;

        temp.querySelectorAll('*').forEach(el => {
            ['background', 'backgroundColor'].forEach(prop => {
                if (el.style[prop]) el.style[prop] = '';
            });
            if (el.hasAttribute('bgcolor')) el.removeAttribute('bgcolor');

            el.style.width = '';
            el.style.minWidth = '';
            el.style.maxWidth = '';
            el.style.whiteSpace = 'pre-wrap';
            el.style.wordWrap = 'break-word';
            el.style.wordBreak = 'break-word';
            el.style.overflowWrap = 'break-word';
        });

        const cleanContent = temp.innerHTML;

        document.execCommand('insertHTML', false, cleanContent);

        const inputEvent = new InputEvent('input', {
            bubbles: true,
            inputType: 'insertFromPaste'
        });
        e.target.dispatchEvent(inputEvent);
    }

    setupGlobalEventListeners() {
        document.addEventListener('mouseup', () => {
            // Verificar se estava arrastando ou redimensionando uma nota individual
            if (this.app.draggingNote && this.app.autoSaveEnabled) {
                this.storageManager.saveNotesToLocalStorage(true);
            }
            if (this.app.resizingNote && this.app.autoSaveEnabled) {
                this.storageManager.saveNotesToLocalStorage(true);
            }
            // Verificar se estava arrastando múltiplas notas
            if (this.multiDragStartPositions && this.app.autoSaveEnabled) {
                this.storageManager.saveNotesToLocalStorage(true);
            }

            this.app.draggingNote = null;
            this.app.resizingNote = null;
            this.multiDragStartPositions = null;
            this.clearGuides();
        });

        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        document.addEventListener('paste', (e) => this.handlePasteEvent(e));

        document.addEventListener('mousedown', (e) => {
            if (e.ctrlKey && e.shiftKey) return;

            const clickedNote = e.target.closest('.note');

            const clickedBorderOfSelected = clickedNote && this.selectedNotes.has(clickedNote)
                && (e.target.classList.contains('note-border') || e.target === clickedNote);

            if (!clickedBorderOfSelected) {
                this.clearSelectedNotes();
            }
        });

        document.addEventListener('focusout', () => {
            this.markdownProcessor.removeEmptyBullets();
        });
    }
}

