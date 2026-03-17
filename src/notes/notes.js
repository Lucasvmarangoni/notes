// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

import { MultiCursorManager } from './multi-cursor.js';

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
        this.multiCursorManager = new MultiCursorManager(app);
        this.lastCreatedNotes = new Map(); // sectionId -> lastNoteId
        this.isUnplacedNotePending = false;
        this.dragStartPos = null;
    }

    checkOverlap(rect, excludeElement = null, sectionContent = null) {
        const targetSection = sectionContent || (excludeElement ? excludeElement.closest('.section-content') : null);
        if (!targetSection) return false;

        const otherNotes = Array.from(targetSection.querySelectorAll('.note'))
            .filter(n => n !== excludeElement);

        return otherNotes.some(other => {
            const otherRect = other.getBoundingClientRect();
            return this.rectsOverlap(rect, otherRect);
        });
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

    getSnapLines(noteRect, otherNotes, sectionRect, isResize = false) {
        const snaps = { x: null, y: null };
        const guides = [];

        const hCandidates = isResize
            ? [{ y: noteRect.bottom, type: 'bottom' }]
            : [
                { y: noteRect.top, type: 'top' },
                { y: noteRect.top + noteRect.height / 2, type: 'center' },
                { y: noteRect.bottom, type: 'bottom' }
            ];

        const vCandidates = isResize
            ? [{ x: noteRect.right, type: 'right' }]
            : [
                { x: noteRect.left, type: 'left' },
                { x: noteRect.left + noteRect.width / 2, type: 'center' },
                { x: noteRect.right, type: 'right' }
            ];

        let closestH = { diff: Infinity, snapY: null, guideY: null, otherRect: null };
        let closestV = { diff: Infinity, snapX: null, guideX: null, otherRect: null };

        otherNotes.forEach(other => {
            const otherRect = other.getBoundingClientRect();

            const otherH = [
                otherRect.top,
                otherRect.top + otherRect.height / 2,
                otherRect.bottom
            ];

            hCandidates.forEach(candidate => {
                otherH.forEach(targetY => {
                    const diff = Math.abs(candidate.y - targetY);

                    if (diff < this.GUIDE_THRESHOLD && diff < closestH.diff) {
                        let snapValue = null;
                        if (diff < this.SNAP_THRESHOLD) {
                            snapValue = isResize ? targetY : targetY - (candidate.y - noteRect.top);
                        }

                        closestH = {
                            diff,
                            snapY: snapValue,
                            guideY: targetY,
                            otherRect
                        };
                    }
                });
            });

            const otherV = [
                otherRect.left,
                otherRect.left + otherRect.width / 2,
                otherRect.right
            ];

            vCandidates.forEach(candidate => {
                otherV.forEach(targetX => {
                    const diff = Math.abs(candidate.x - targetX);

                    if (diff < this.GUIDE_THRESHOLD && diff < closestV.diff) {
                        let snapValue = null;
                        if (diff < this.SNAP_THRESHOLD) {
                            snapValue = isResize ? targetX : targetX - (candidate.x - noteRect.left);
                        }

                        closestV = {
                            diff,
                            snapX: snapValue,
                            guideX: targetX,
                            otherRect
                        };
                    }
                });
            });
        });

        if (closestH.diff < Infinity) {
            snaps.y = closestH.snapY;
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
        const targetSectionId = sectionId !== null ? sectionId : (this.app.activeSection ? this.app.activeSection.id : null);

        if (targetSectionId === null || targetSectionId === undefined) return;

        const targetSectionIdNum = Number(targetSectionId);
        const targetSection = this.app.sections.find(s => Number(s.id) === targetSectionIdNum);
        if (!targetSection) return;

        const sectionContent = document.querySelector(`.section-content[data-section-id="${targetSectionId}"]`);
        if (!sectionContent) return;

        const noteId = id || Date.now() + Math.random();

        if (x === null || y === null) {
            const lastNoteId = this.lastCreatedNotes.get(targetSectionIdNum);
            const lastNote = targetSection.notes.find(n => n.id === lastNoteId);

            if (this.isUnplacedNotePending) {
                this.showNotification('The current note must be positioned first.', 'error');
                return;
            }

            const space = this.findEmptySpace(sectionContent, width, height, lastNote);
            if (space) {
                x = space.x;
                y = space.y;
            } else {
                const sectionRect = sectionContent.getBoundingClientRect();
                const scrollX = sectionContent.scrollLeft;
                const scrollY = sectionContent.scrollTop;
                const viewportCenterX = window.innerWidth / 2;
                const viewportCenterY = window.innerHeight / 2;

                x = (viewportCenterX - sectionRect.left + scrollX) - (width / 2);
                y = (viewportCenterY - sectionRect.top + scrollY) - 50;

                x = Math.max(0, Math.min(x, sectionContent.scrollWidth - width));
                y = Math.max(0, Math.min(y, sectionContent.scrollHeight - height));

                if (!id) {
                    this.isUnplacedNotePending = true;
                }
            }
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

        if (this.isUnplacedNotePending && !id) {
            noteElement.classList.add('unplaced-note');
        }

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
        this.lastCreatedNotes.set(targetSectionIdNum, noteId);

        if (this.app.autoSaveEnabled) {
            this.storageManager.saveNotesToLocalStorage(true);
        }

        return noteElement;
    }

    findEmptySpace(sectionContent, width, height, lastNote) {
        const step = 20;
        const maxRange = 1000;
        const startX = lastNote ? lastNote.x : 20;
        const startY = lastNote ? lastNote.y : 20;

        const sectionWidth = sectionContent.scrollWidth || 2000;
        const sectionHeight = sectionContent.scrollHeight || 2000;

        // Spiral search
        for (let r = step; r < maxRange; r += step) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const x = Math.round(startX + r * Math.cos(angle));
                const y = Math.round(startY + r * Math.sin(angle));

                if (x < 0 || y < 0 || x + width > sectionWidth || y + height > sectionHeight) continue;

                const sectionRect = sectionContent.getBoundingClientRect();
                const testRect = {
                    left: sectionRect.left + x,
                    top: sectionRect.top + y,
                    right: sectionRect.left + x + width,
                    bottom: sectionRect.top + y + height
                };

                if (!this.checkOverlap(testRect, null, sectionContent)) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type === 'error' ? 'error-message' : 'success-message'}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 1500);
        }, 3000);
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
                    const sectionRect = n.closest('.section-content').getBoundingClientRect();
                    return {
                        element: n,
                        startX: rect.left - sectionRect.left,
                        startY: rect.top - sectionRect.top,
                        offsetX: e.clientX - rect.left,
                        offsetY: e.clientY - rect.top
                    };
                });
                this.app.draggingNote = {
                    element: noteElement,
                    offsetX,
                    offsetY
                };
                this.draggingNote = this.app.draggingNote;
                this.startAutoScroll();
            } else {
                const rect = noteElement.getBoundingClientRect();
                const sectionRect = noteElement.closest('.section-content').getBoundingClientRect();
                this.dragStartPos = {
                    left: rect.left - sectionRect.left,
                    top: rect.top - sectionRect.top
                };

                this.app.draggingNote = {
                    element: noteElement,
                    offsetX,
                    offsetY
                };
                this.draggingNote = this.app.draggingNote;
                this.startAutoScroll();
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
                startX: e.pageX,
                startY: e.pageY
            };
            this.resizingNote = this.app.resizingNote;
            this.startAutoScroll();
        });
    }

    handleMouseMove(e) {
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        if (this.multiDragStartPositions) {
            this.updateMultiDragPosition(e.clientX, e.clientY);
            return;
        }

        if (this.app.draggingNote) {
            this.updateDragPosition(e.clientX, e.clientY);
        }

        if (this.app.resizingNote) {
            this.updateResizeDimensions(e.clientX, e.clientY);
        }
    }

    updateMultiDragPosition(clientX, clientY) {
        const sectionContent = this.app.activeSection
            ? document.querySelector(`.section-content[data-section-id="${this.app.activeSection.id}"]`)
            : null;
        if (!sectionContent) return;

        const sectionRect = sectionContent.getBoundingClientRect();

        this.multiDragStartPositions.forEach(pos => {
            const x = clientX - pos.offsetX - sectionRect.left;
            const y = clientY - pos.offsetY - sectionRect.top;
            pos.element.style.left = `${Math.max(0, x)}px`;
            pos.element.style.top = `${Math.max(0, y)}px`;
        });
    }

    updateDragPosition(clientX, clientY) {
        const sectionContent = this.app.draggingNote.element.closest('.section-content');
        const sectionRect = sectionContent.getBoundingClientRect();

        const x = clientX - sectionRect.left - this.app.draggingNote.offsetX;
        const y = clientY - sectionRect.top - this.app.draggingNote.offsetY;

        const otherNotes = Array.from(sectionContent.querySelectorAll('.note')).filter(n => n !== this.app.draggingNote.element);

        const currentRect = this.app.draggingNote.element.getBoundingClientRect();
        const newRect = {
            left: clientX - this.app.draggingNote.offsetX,
            top: clientY - this.app.draggingNote.offsetY,
            width: currentRect.width,
            height: currentRect.height,
            right: clientX - this.app.draggingNote.offsetX + currentRect.width,
            bottom: clientY - this.app.draggingNote.offsetY + currentRect.height
        };

        const { snaps, guides } = this.getSnapLines(newRect, otherNotes, sectionRect);

        const finalX = snaps.x !== null ? snaps.x - sectionRect.left : x;
        const finalY = snaps.y !== null ? snaps.y - sectionRect.top : y;

        this.app.draggingNote.element.style.left = `${Math.max(0, finalX)}px`;
        this.app.draggingNote.element.style.top = `${Math.max(0, finalY)}px`;

        this.drawGuides(guides, sectionContent);
    }

    updateResizeDimensions(clientX, clientY) {
        const sectionContent = this.app.resizingNote.element.closest('.section-content');
        const sectionRect = sectionContent.getBoundingClientRect();

        const pageX = clientX + window.scrollX;
        const pageY = clientY + window.scrollY;

        const dx = pageX - this.app.resizingNote.startX;
        const dy = pageY - this.app.resizingNote.startY;

        let newWidth = Math.max(130, this.app.resizingNote.startWidth + dx);
        let newHeight = Math.max(85, this.app.resizingNote.startHeight + dy);

        const otherNotes = Array.from(sectionContent.querySelectorAll('.note')).filter(n => n !== this.app.resizingNote.element);

        const currentRect = this.app.resizingNote.element.getBoundingClientRect();
        const newRect = {
            left: currentRect.left,
            top: currentRect.top,
            width: newWidth,
            height: newHeight,
            right: currentRect.left + newWidth,
            bottom: currentRect.top + newHeight
        };

        const { snaps, guides } = this.getSnapLines(newRect, otherNotes, sectionRect, true);

        if (snaps.x !== null) {
            newWidth = snaps.x - currentRect.left;
        }
        if (snaps.y !== null) {
            newHeight = snaps.y - currentRect.top;
        }

        const widthChange = newWidth - parseFloat(this.app.resizingNote.element.style.width);
        const heightChange = newHeight - parseFloat(this.app.resizingNote.element.style.height);

        this.app.resizingNote.element.style.width = `${newWidth}px`;
        this.app.resizingNote.element.style.height = `${newHeight}px`;

        if (widthChange > 0 || heightChange > 0) {
            this.pushNotes(this.app.resizingNote.element, widthChange, heightChange, sectionContent);
        }

        this.drawGuides(guides, sectionContent);
    }

    rectsOverlap(r1, r2) {
        return !(r1.right <= r2.left ||
            r1.left >= r2.right ||
            r1.bottom <= r2.top ||
            r1.top >= r2.bottom);
    }

    pushNotes(triggerNote, dx, dy, sectionContent) {
        const otherNotes = Array.from(sectionContent.querySelectorAll('.note'))
            .filter(n => n !== triggerNote);

        const triggerRect = triggerNote.getBoundingClientRect();

        otherNotes.forEach(other => {
            const otherRect = other.getBoundingClientRect();

            if (this.rectsOverlap(triggerRect, otherRect)) {
                // Determine collision direction based on which edge crossed into the other note's space in this frame
                const prevTriggerRight = triggerRect.right - dx;
                const prevTriggerBottom = triggerRect.bottom - dy;

                const hitFromLeft = prevTriggerRight <= otherRect.left;
                const hitFromAbove = prevTriggerBottom <= otherRect.top;

                if (hitFromLeft && dx > 0) {
                    const pushAmount = triggerRect.right - otherRect.left;
                    const currentLeft = parseFloat(other.style.left) || 0;
                    other.style.left = `${currentLeft + pushAmount}px`;
                    this.pushNotes(other, pushAmount, 0, sectionContent);
                }
                else if (hitFromAbove && dy > 0) {
                    const pushAmount = triggerRect.bottom - otherRect.top;
                    const currentTop = parseFloat(other.style.top) || 0;
                    other.style.top = `${currentTop + pushAmount}px`;
                    this.pushNotes(other, 0, pushAmount, sectionContent);
                }
                else {
                    // Fallback: Use the dominant change direction if we can't determine the hit-edge (e.g. diagonal expansion)
                    if (dx >= dy && dx > 0) {
                        const pushAmount = triggerRect.right - otherRect.left;
                        if (pushAmount > 0) {
                            const currentLeft = parseFloat(other.style.left) || 0;
                            other.style.left = `${currentLeft + pushAmount}px`;
                            this.pushNotes(other, pushAmount, 0, sectionContent);
                        }
                    } else if (dy > 0) {
                        const pushAmount = triggerRect.bottom - otherRect.top;
                        if (pushAmount > 0) {
                            const currentTop = parseFloat(other.style.top) || 0;
                            other.style.top = `${currentTop + pushAmount}px`;
                            this.pushNotes(other, 0, pushAmount, sectionContent);
                        }
                    }
                }
            }
        });
    }

    startAutoScroll() {
        if (this.autoScrollInterval) return;

        const scrollZone = 10;
        const maxScrollSpeed = 2;

        const loop = () => {
            if (!this.app.draggingNote && !this.app.resizingNote && !this.multiDragStartPositions) {
                this.stopAutoScroll();
                return;
            }

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            let scrolled = false;

            let scrollX = 0;
            if (this.lastMouseX < scrollZone) {
                const intensity = Math.pow(1 - (this.lastMouseX / scrollZone), 2);
                scrollX = -maxScrollSpeed * intensity;
            } else if (this.lastMouseX > viewportWidth - scrollZone) {
                const intensity = Math.pow(1 - ((viewportWidth - this.lastMouseX) / scrollZone), 2);
                scrollX = maxScrollSpeed * intensity;
            }

            let scrollY = 0;
            if (this.lastMouseY < scrollZone) {
                const intensity = Math.pow(1 - (this.lastMouseY / scrollZone), 2);
                scrollY = -maxScrollSpeed * intensity;
            } else if (this.lastMouseY > viewportHeight - scrollZone) {
                const intensity = Math.pow(1 - ((viewportHeight - this.lastMouseY) / scrollZone), 2);
                scrollY = maxScrollSpeed * intensity;
            }

            if (scrollX !== 0 || scrollY !== 0) {
                window.scrollBy(scrollX, scrollY);
                scrolled = true;
            }

            if (scrolled) {
                if (this.multiDragStartPositions) {
                    this.updateMultiDragPosition(this.lastMouseX, this.lastMouseY);
                } else if (this.app.draggingNote) {
                    this.updateDragPosition(this.lastMouseX, this.lastMouseY);
                } else if (this.app.resizingNote) {
                    this.updateResizeDimensions(this.lastMouseX, this.lastMouseY);
                }
            }

            this.autoScrollInterval = requestAnimationFrame(loop);
        };

        this.autoScrollInterval = requestAnimationFrame(loop);
    }

    stopAutoScroll() {
        if (this.autoScrollInterval) {
            cancelAnimationFrame(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
    }

    setupNoteActions(noteElement) {
        const deleteBtn = noteElement.querySelector('.delete-btn');
        const noteContent = noteElement.querySelector('.note-content');

        noteContent.addEventListener('blur', () => {
            this.markdownProcessor.processMarkdown(noteContent);
            this.markdownProcessor.removeEmptyBullets(noteContent);
        });

        noteContent.addEventListener('click', (e) => {
            const summaryText = e.target.closest('.toggle-summary-text');
            if (summaryText) {
                e.preventDefault();
            }
        });

        noteContent.addEventListener('beforeinput', (e) => {
            if (this.multiCursorManager.selections.length > 0) {
                this.multiCursorManager.saveState();
            }
        });

        noteContent.addEventListener('input', (e) => {
            this.multiCursorManager.handleInput(e);

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
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const container = range.startContainer;
            const parentElement = container.nodeType === Node.TEXT_NODE
                ? container.parentElement
                : container;

            const isInToggleSummary = parentElement?.closest('.toggle-summary-text');
            const isInToggleContent = parentElement?.closest('.toggle-content');
            const li = parentElement?.closest('li');
            const list = parentElement?.closest('ul, ol');

            const isAtStart = (range.startOffset === 0) ||
                (container.nodeType === Node.TEXT_NODE && container === parentElement.firstChild && range.startOffset === 0);

            if (e.key === 'Backspace' && selection.isCollapsed) {
                // Scenario 1: Cursor following a toggle-block
                let nodeBefore = null;
                if (range.startContainer === noteContent) {
                    nodeBefore = noteContent.childNodes[range.startOffset - 1];
                } else if (isAtStart) {
                    let current = parentElement;
                    while (current && current.parentNode !== noteContent) current = current.parentNode;
                    if (current) nodeBefore = current.previousSibling;
                }

                if (nodeBefore && nodeBefore.classList && nodeBefore.classList.contains('toggle-block')) {
                    e.preventDefault();
                    const summaryText = nodeBefore.querySelector('.toggle-summary-text');
                    const contentDiv = nodeBefore.querySelector('.toggle-content');
                    const isOpen = nodeBefore.hasAttribute('open');

                    // If the current line is just a text node or empty, clean it up
                    let lineNode = range.startContainer;
                    if (lineNode === noteContent) {
                        lineNode = noteContent.childNodes[range.startOffset];
                    } else {
                        while (lineNode && lineNode.parentNode !== noteContent) lineNode = lineNode.parentNode;
                    }

                    const textToMove = lineNode ? lineNode.textContent.replace(/\u00A0/g, ' ').trim() : '';

                    let targetBlock = summaryText;
                    if (isOpen && contentDiv) {
                        targetBlock = contentDiv;
                    }

                    if (targetBlock) {
                        if (textToMove) {
                            if (targetBlock.innerHTML === '<br>') targetBlock.innerHTML = textToMove;
                            else targetBlock.innerHTML += ' ' + textToMove;
                        }

                        if (lineNode && lineNode !== noteContent && noteContent.childNodes.length > 1) {
                            lineNode.remove();
                        }

                        const newRange = document.createRange();
                        newRange.selectNodeContents(targetBlock);
                        if (textToMove) {
                            // Find the position where we moved text
                            const walker = document.createTreeWalker(targetBlock, NodeFilter.SHOW_TEXT, null);
                            let lastText = null;
                            let node;
                            while (node = walker.nextNode()) lastText = node;
                            if (lastText) {
                                newRange.setStart(lastText, Math.max(0, lastText.textContent.length - textToMove.length));
                            }
                        }
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        return;
                    }
                }

                // Scenario 2: At start of Toggle Summary
                if (isInToggleSummary && isAtStart) {
                    const toggleBlock = isInToggleSummary.closest('.toggle-block');
                    const prev = toggleBlock.previousSibling;

                    if (prev) {
                        e.preventDefault();
                        const text = isInToggleSummary.textContent.trim();

                        let targetBlock = prev;
                        if (prev.classList && prev.classList.contains('toggle-block')) {
                            const prevSummary = prev.querySelector('.toggle-summary-text');
                            const prevContent = prev.querySelector('.toggle-content');
                            targetBlock = (prev.hasAttribute('open') && prevContent) ? prevContent : prevSummary;
                        }

                        if (text && targetBlock) {
                            if (targetBlock.innerHTML === '<br>') targetBlock.innerHTML = text;
                            else targetBlock.innerHTML += (targetBlock.innerHTML === '' ? '' : ' ') + text;
                        }

                        const newRange = document.createRange();
                        if (targetBlock) {
                            newRange.selectNodeContents(targetBlock);
                            if (text) {
                                // Find where we appended
                                const walker = document.createTreeWalker(targetBlock, NodeFilter.SHOW_TEXT, null);
                                let lastText = null, node;
                                while (node = walker.nextNode()) lastText = node;
                                if (lastText) newRange.setStart(lastText, Math.max(0, lastText.textContent.length - text.length));
                            }
                            newRange.collapse(true);
                        }

                        // Move content if any
                        const content = toggleBlock.querySelector('.toggle-content');
                        if (content && content.innerHTML !== '<br>') {
                            toggleBlock.parentNode.insertBefore(content, toggleBlock.nextSibling);
                        }
                        toggleBlock.remove();

                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        return;
                    }
                    else {
                        // First block in note: Unwrap
                        e.preventDefault();
                        const content = toggleBlock.querySelector('.toggle-content');
                        const text = isInToggleSummary.innerHTML;
                        const div = document.createElement('div');
                        div.innerHTML = text + (content && content.innerHTML !== '<br>' ? '<br>' + content.innerHTML : '');
                        toggleBlock.parentNode.replaceChild(div, toggleBlock);
                        const newRange = document.createRange();
                        newRange.setStart(div, 0);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        return;
                    }
                }

                // Scenario 3: At start of Toggle Content
                if (isInToggleContent && isAtStart) {
                    e.preventDefault();
                    const toggleBlock = isInToggleContent.closest('.toggle-block');
                    const summary = toggleBlock.querySelector('.toggle-summary-text');
                    const newRange = document.createRange();
                    newRange.selectNodeContents(summary);
                    newRange.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    return;
                }

                // Scenario 4: Standard list escape on Backspace
                if (li && isAtStart) {
                    const liText = li.textContent.trim();
                    if (!liText || liText.length === 0) {
                        e.preventDefault();
                        const listElement = li.parentElement;
                        const br = document.createElement('br');
                        const textNode = document.createTextNode('');
                        li.parentNode.insertBefore(br, li);
                        li.parentNode.insertBefore(textNode, br.nextSibling);
                        li.remove();
                        if (listElement.children.length === 0) listElement.remove();
                        const newRange = document.createRange();
                        newRange.setStart(textNode, 0);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        return;
                    }
                }
            }

            if (e.key === 'Delete' && selection.isCollapsed) {
                // Determine if at end of a selectable block
                const nodeLen = container.nodeType === Node.TEXT_NODE ? container.length : parentElement.childNodes.length;
                const isAtEnd = range.startOffset === nodeLen;

                if (isInToggleSummary && isAtEnd) {
                    e.preventDefault();
                    const toggleBlock = isInToggleSummary.closest('.toggle-block');
                    const next = toggleBlock.nextSibling;
                    if (next) {
                        const text = next.textContent.trim();
                        if (text) {
                            isInToggleSummary.innerHTML += (isInToggleSummary.innerHTML === '' || isInToggleSummary.innerHTML === '<br>' ? '' : ' ') + text;
                        }
                        next.remove();
                    } else if (toggleBlock.hasAttribute('open')) {
                        // Move cursor to start of content
                        const content = toggleBlock.querySelector('.toggle-content');
                        if (content) {
                            const newRange = document.createRange();
                            newRange.selectNodeContents(content);
                            newRange.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                        }
                    }
                    return;
                }
            }
        });

        noteElement.addEventListener('mousedown', (e) => {
            const noteContent = e.target.closest('.note-content');
            if (noteContent) {
                this.multiCursorManager.handleMouseDown(e, noteContent);
            }

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

        noteElement.addEventListener('mouseup', (e) => {
            const noteContent = e.target.closest('.note-content');
            if (noteContent) {
                this.multiCursorManager.handleMouseUp(e);
            }
        });

        deleteBtn.addEventListener('click', () => {
            if (noteElement.classList.contains('unplaced-note')) {
                this.isUnplacedNotePending = false;
            }
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
        document.addEventListener('mouseup', (e) => {
            if (this.app.draggingNote) {
                const noteElement = this.app.draggingNote.element;
                const rect = noteElement.getBoundingClientRect();

                if (this.checkOverlap(rect, noteElement)) {
                    // Revert position
                    if (this.dragStartPos) {
                        noteElement.style.left = `${this.dragStartPos.left}px`;
                        noteElement.style.top = `${this.dragStartPos.top}px`;
                    }
                } else {
                    // Valid position
                    if (this.isUnplacedNotePending && noteElement.classList.contains('unplaced-note')) {
                        this.isUnplacedNotePending = false;
                        noteElement.classList.remove('unplaced-note');
                    }
                }

                if (this.app.autoSaveEnabled) {
                    this.storageManager.saveNotesToLocalStorage(true);
                }
            }

            if (this.app.resizingNote && this.app.autoSaveEnabled) {
                this.storageManager.saveNotesToLocalStorage(true);
            }
            if (this.multiDragStartPositions) {
                const anyOverlap = this.multiDragStartPositions.some(pos => {
                    const rect = pos.element.getBoundingClientRect();
                    return this.checkOverlap(rect, pos.element);
                });

                if (anyOverlap) {
                    this.multiDragStartPositions.forEach(pos => {
                        pos.element.style.left = `${pos.startX}px`;
                        pos.element.style.top = `${pos.startY}px`;
                    });
                } else {
                    this.multiDragStartPositions.forEach(pos => {
                        if (this.isUnplacedNotePending && pos.element.classList.contains('unplaced-note')) {
                            this.isUnplacedNotePending = false;
                            pos.element.classList.remove('unplaced-note');
                        }
                    });
                }

                if (this.app.autoSaveEnabled) {
                    this.storageManager.saveNotesToLocalStorage(true);
                }
            }

            this.app.draggingNote = null;
            this.app.resizingNote = null;
            this.dragStartPos = null;

            this.multiDragStartPositions = null;
            this.clearGuides();
            this.stopAutoScroll();
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

    isCursorAtElementStart(element, range, list) {
        return range.startOffset === 0;
    }

    getTopLevelElementInList(parentElement, list) {
        let current = parentElement;
        while (current && current.parentElement !== list) {
            current = current.parentElement;
        }
        return current;
    }
}
