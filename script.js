// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

class NotesApp {
    constructor() {
        this.color1 = '#FFA65C'
        this.color2 = '#B28DFF'
        this.color3 = '#00FF88'
        this.color4 = '#00CFFF'
        this.default = '#FFFFFF'
        this.colorPickerCurrentColor = '#FFFFFF'

        this.sections = [];
        this.activeSection = null;
        this.activeSectionId = null;
        this.draggingNote = null;
        this.resizingNote = null;
        this.currentRenamingSection = null;
        this.autoSaveEnabled = false;
        this.autoSaveInterval = null;
        this.selectedNotes = new Set();
        this.multiDragStartPositions = null;



        this.notesOverviewModal = null;
        this.notesSearchInput = null;
        this.notesListContainer = null;
        this.initNotesOverview();

        this.createDefaultSection();
        this.setupKeyboardShortcuts();
        this.createToolbar();
        this.initAutoSave();

        if (!this._listenersSetup) {
            this.setupEventListeners();
            this._listenersSetup = true;
        }
    }

    setupEventListeners() {

        document.getElementById('add-section-btn').addEventListener('click', () => {
            this.addSection()
            if (this.autoSaveEnabled) {
                this.saveNotesToLocalStorage(true);
            }
        });
        document.getElementById('add-note-btn').addEventListener('click', () => {
            if (this.activeSection) {
                this.addNote();
            } else {
                alert('Please create or select a section first.');
            }
        });
        document.getElementById('save-notes-btn').addEventListener('click', () => this.saveNotesToLocalStorage());
        document.getElementById('load-notes-btn').addEventListener('click', () => this.loadNotesFromLocalStorage());
        document.getElementById('export-btn').addEventListener('click', () => this.exportNotes());
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.importNotes(e));

        document.getElementById('section-rename-cancel').addEventListener('click', () => {
            this.closeRenameModal();
        });
        document.getElementById('section-rename-confirm').addEventListener('click', () => {
            this.confirmRenameSection();
        });

        document.addEventListener('mouseup', () => {
            this.draggingNote = null;
            this.resizingNote = null;
            if (this.multiDragStartPositions && this.autoSaveEnabled) {
                this.saveNotesToLocalStorage(true);
            }
            this.multiDragStartPositions = null;
        });

        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        window.addEventListener('beforeunload', () => {
            if (this.autoSaveEnabled) {
                this.saveNotesToLocalStorage(true);
            }
        });

        window.showPopup = function (wrapper) {
            const popup = wrapper.querySelector('.info-popup');
            const btn = wrapper.querySelector('.info-btn');

            window.hidePopup();

            if (btn.dataset.info) {
                popup.textContent = btn.dataset.info;
            } else {
                popup.innerHTML = infoMap;
            }

            popup.style.display = "block";

            setTimeout(() => {
                const rect = popup.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    popup.style.left = 'auto';
                    popup.style.right = '0';
                    popup.style.transform = 'translateX(0)';

                    const arrow = popup.querySelector('::before');
                    if (arrow) {
                        arrow.style.left = '75%';
                    }
                }

                if (rect.left < 0) {
                    popup.style.left = '0';
                    popup.style.right = 'auto';
                    popup.style.transform = 'translateX(0)';

                    const arrow = popup.querySelector('::before');
                    if (arrow) {
                        arrow.style.left = '25%';
                    }
                }
            }, 0);
        };

        window.hidePopup = function () {
            const allPopups = document.querySelectorAll('.info-popup');
            allPopups.forEach(p => p.style.display = "none");
        };

        document.addEventListener('click', function (event) {
            const isInfoBtn = event.target.closest('.info-btn');
            const isInfoPopup = event.target.closest('.info-popup');

            if (!isInfoBtn && !isInfoPopup) {
                window.hidePopup();
            }
        });

        const infoMap = `
            <div style="line-height: 1.4;">
                <p><strong>Add Notes</strong>: Create and manage notes easily and quickly.</p>
                <p><strong>Add Section</strong>: Create and manage sections like browser tabs.</p>
                <p><strong>List</strong>: All sections and notes listed in a hierarchical and organized view.</p>
                <p><strong>Drag and Drop</strong>: Move and position multiple notes freely.</p>
                <p><strong>Bulleted Lists</strong>: Create simple and clean bulleted lists.</p>
                <p><strong>Organize by Sections</strong>: Divide notes into different sections.</p>
                <p><strong>Local Storage</strong>: Save notes to your browser's local storage.</p>
                <p><strong>Auto Save</strong>: Automatically save and load your content.</p>
                <p><strong>Export & Import</strong>: Export notes as JSON and import them later.</p>
                <p><strong>Event Storage</strong>: Enables real-time synchronization between multiple windows.</p>
                <p><strong>Keyboard Shortcuts</strong>:</p>
                <kbd>Ctrl</kbd> + <kbd>1</kbd> to <kbd>4</kbd>: Apply one of the four predefined colors <br>
                <kbd>Ctrl</kbd> + <kbd>'</kbd>: Apply color-picker defined color <br>
                <kbd>Ctrl</kbd> + <kbd>B</kbd>: Toggle bold <br>
                <kbd>Ctrl</kbd> + <kbd>U</kbd>: Toggle underline <br>
                <kbd>Ctrl</kbd> + <kbd>\\</kbd>: Remove all formatting <br>    
                <kbd>Ctrl</kbd> + <kbd>E</kbd>: Toggle to code formatting or remove code formatting<br>
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Click</kbd>: Select and drag multiple notes simultaneously<br>                               
            </div>
        `;

        document.addEventListener('DOMContentLoaded', function () {
            const infoBtns = document.querySelectorAll('.info-btn');

            infoBtns.forEach(btn => {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const wrapper = this.closest('.info-wrapper');
                    window.showPopup(wrapper);
                });

                btn.addEventListener('touchstart', function (e) {
                    e.stopPropagation();
                    const wrapper = this.closest('.info-wrapper');
                    window.showPopup(wrapper);
                }, { passive: true });
            });
        });

        document.addEventListener('focusout', (event) => {
            this.removeEmptyBullets()
        });

        document.addEventListener('keydown', (event) => {
            if (!event.target.classList.contains('note-content')) return;

            const selection = window.getSelection();
            const currentLine = selection.anchorNode?.textContent || "";
            if (event.key === 'Enter') {
                if (currentLine.trim().startsWith('*')) {
                    event.preventDefault();
                    document.execCommand('insertText', false, '\n* ');
                    this.processMarkdown(noteContent);
                }
                this.removeEmptyBullets()
            }

            if (event.key === 'Tab') {
                event.preventDefault();

                const sel = window.getSelection();
                if (!sel.rangeCount) return;
                const range = sel.getRangeAt(0);

                if (sel.isCollapsed) {
                    document.execCommand('insertText', false, '    ');
                    return;
                }

                const wrapper = document.createElement('div');
                wrapper.style.display = 'inline-block';
                wrapper.style.paddingLeft = '2em';
                wrapper.appendChild(range.extractContents());
                range.insertNode(wrapper);

                sel.removeAllRanges();
                const newRange = document.createRange();
                newRange.selectNodeContents(wrapper);
                sel.addRange(newRange);
            }
        });

        document.addEventListener('paste', (e) => {
            this.handlePasteEvent(e)
        })

        // drag multiple notes
        document.addEventListener('mousedown', (e) => {
            if (e.ctrlKey && e.shiftKey) return;

            const clickedNote = e.target.closest('.note');

            const clickedBorderOfSelected = clickedNote && this.selectedNotes.has(clickedNote)
                && (e.target.classList.contains('note-border') || e.target === clickedNote);

            if (!clickedBorderOfSelected) {
                this.clearSelectedNotes();
            }
        });
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
            content = plainContent.replace(/\n/g, '<br>');
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

    removeEmptyBullets(specificElement = null) {
        const noteContents = specificElement ?
            [specificElement] :
            Array.from(document.querySelectorAll('.note-content'));

        noteContents.forEach(noteContent => {
            const listItems = noteContent.querySelectorAll('li');

            listItems.forEach(li => {
                const text = li.textContent.trim();

                if (!text) {
                    li.remove();
                } else if (text === '*' || text === '* ') {
                    li.remove();
                }
            });
            const walker = document.createTreeWalker(
                noteContent,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }

            textNodes.forEach(textNode => {
                const text = textNode.textContent.trim();
                if (text === '*' && !textNode.parentElement.closest('li')) {
                    textNode.remove();
                }
            });
        });
    }

    processMarkdown(element) {

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (!node.parentElement.closest('li')) {
                textNodes.push(node);
            }
        }

        textNodes.reverse().forEach(textNode => {
            const text = textNode.textContent;

            if (text.includes('* ')) {
                const lines = text.split(/\r?\n/);
                let hasNewBullets = false;

                for (let line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('* ') && trimmed.length > 2) {
                        hasNewBullets = true;
                        break;
                    }
                }

                if (hasNewBullets) {
                    const fragment = document.createDocumentFragment();

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const trimmed = line.trim();

                        if (trimmed.startsWith('* ') && trimmed.length > 2) {
                            const li = document.createElement('li');
                            li.textContent = trimmed.substring(2).trim();
                            fragment.appendChild(li);
                        } else {
                            if (line.length > 0 || i === 0) {
                                fragment.appendChild(document.createTextNode(line));
                            }
                            if (i < lines.length - 1) {
                                fragment.appendChild(document.createElement('br'));
                            }
                        }
                    }
                    textNode.parentNode.replaceChild(fragment, textNode);
                }
            }
        });
    }


    setupKeyboardShortcuts() {

        document.addEventListener('keydown', (e) => {
            const isNoteEditing =
                e.target.closest('.note-content') ||
                e.target.closest('.note-title');

            if (!isNoteEditing) return;

            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                document.execCommand('bold', false, null);
            }

            else if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                document.execCommand('underline', false, null);
            }

            else if (e.ctrlKey && e.key === '\\') {
                this.cleanFormatting(e)
            }

            else if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.formatAsCode();
            }

            else if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                document.execCommand('foreColor', false, this.color1);
            }
            else if (e.ctrlKey && e.key === '2') {
                e.preventDefault();
                document.execCommand('foreColor', false, this.color2);
            }
            else if (e.ctrlKey && e.key === '3') {
                e.preventDefault();
                document.execCommand('foreColor', false, this.color3);
            }
            else if (e.ctrlKey && e.key === '4') {
                e.preventDefault();
                document.execCommand('foreColor', false, this.color4);
            }
            else if (e.ctrlKey && e.key === "'") {
                e.preventDefault();
                const colorPicker = document.querySelector('.note-actions .note-toolbar .color-picker');
                if (colorPicker) {
                    document.execCommand('foreColor', false, colorPicker.value);
                }
            }
        });
    }

    cleanFormatting(e) {
        document.execCommand('removeFormat', false, null);
    }

    createDefaultSection() {
        this.addSection('Section', 1);
    }

    addSection(title = 'New Section', id = null) {
        const numericIds = this.sections
            .map(s => Number(s.id))
            .filter(n => !Number.isNaN(n) && Number.isFinite(n));

        const nextId = numericIds.length ? Math.max(...numericIds) + 1 : 1;
        const sectionId = (id !== null && id !== undefined) ? id : nextId;

        const tabElement = document.createElement('div');
        tabElement.classList.add('section-tab');
        tabElement.dataset.sectionId = sectionId;
        tabElement.innerHTML = `
        <span class="tab-title">${title}</span>
        <span class="rename-tab">✎</span>
        <span class="close-tab">✕</span>
    `;

        const contentElement = document.createElement('div');
        contentElement.classList.add('section-content');
        contentElement.dataset.sectionId = sectionId;

        document.getElementById('sections-tabs').appendChild(tabElement);
        document.getElementById('sections-content').appendChild(contentElement);

        tabElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('close-tab') && !e.target.classList.contains('rename-tab')) {
                const sid = Number(tabElement.dataset.sectionId);
                this.setActiveSection(sid);
            }
        });

        tabElement.querySelector('.close-tab').addEventListener('click', (e) => {
            e.stopPropagation();
            const sid = Number(tabElement.dataset.sectionId);
            this.deleteSection(sid);
        });

        tabElement.querySelector('.rename-tab').addEventListener('click', (e) => {
            e.stopPropagation();
            const sid = Number(tabElement.dataset.sectionId);
            this.openRenameModal(sid);
        });

        const section = {
            id: sectionId,
            title: title,
            notes: []
        };
        this.sections.push(section);
        this.setActiveSection(section.id);

        return section;
    }


    setActiveSection(sectionId) {
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        document.querySelectorAll('.section-content').forEach(content => {
            content.classList.remove('active');
        });

        const tab = document.querySelector(`.section-tab[data-section-id="${sectionId}"]`);
        const content = document.querySelector(`.section-content[data-section-id="${sectionId}"]`);

        if (tab) tab.classList.add('active');
        if (content) content.classList.add('active');

        this.activeSection = this.sections.find(section => section.id === sectionId);
        this.activeSectionId = sectionId;
    }

    deleteSection(sectionId) {
        if (this.sections.length <= 1) {
            alert('You cannot delete the only existing section.');
            return;
        }

        const tabElement = document.querySelector(`.section-tab[data-section-id="${sectionId}"]`);
        const contentElement = document.querySelector(`.section-content[data-section-id="${sectionId}"]`);

        tabElement.remove();
        contentElement.remove();

        this.sections = this.sections.filter(section => section.id !== sectionId);

        if (this.activeSection && this.activeSection.id === sectionId) {
            this.setActiveSection(this.sections[0].id);
        }

        if (this.autoSaveEnabled) {
            this.saveNotesToLocalStorage(true);
        }
    }

    openRenameModal(sectionId) {
        const section = this.sections.find(section => section.id === sectionId);
        if (!section) return;

        this.currentRenamingSection = sectionId;

        const modal = document.getElementById('section-rename-modal');
        const input = document.getElementById('section-rename-input');

        input.value = section.title;
        modal.classList.add('active');
        input.focus();
    }

    closeRenameModal() {
        const modal = document.getElementById('section-rename-modal');
        modal.classList.remove('active');
        this.currentRenamingSection = null;
    }

    confirmRenameSection() {
        if (!this.currentRenamingSection) return;

        const input = document.getElementById('section-rename-input');
        const newTitle = input.value.trim();

        if (newTitle) {
            const section = this.sections.find(section => section.id === this.currentRenamingSection);
            if (section) {
                section.title = newTitle;

                const tabElement = document.querySelector(`.section-tab[data-section-id="${this.currentRenamingSection}"] .tab-title`);
                tabElement.textContent = newTitle;
            }
        }

        this.closeRenameModal();
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
                    <input type="color" class="color-picker" value="#ffffff" title="Text color">
                    <button class="color-preset" style="background-color: ${this.color1};" title="Color 1 (Ctrl+1)"></button>
                    <button class="color-preset" style="background-color: ${this.color2};" title="Color 2 (Ctrl+2)"></button>
                    <button class="color-preset" style="background-color: ${this.color3};" title="Color 3 (Ctrl+3)"></button>
                    <button class="color-preset" style="background-color: ${this.color4};" title="Color 4 (Ctrl+4)"></button>  
                </div>
            </div>`;

        const sectionsContent = document.getElementById('sections-content');
        const parentElement = sectionsContent.parentElement;
        parentElement.insertBefore(toolbarElement, sectionsContent);

        this.setupToolbarEvents(toolbarElement);
    }

    setupToolbarEvents(toolbar) {
        const boldBtn = toolbar.querySelector('.bold-btn');
        const underlineBtn = toolbar.querySelector('.underline-btn');
        const colorPicker = toolbar.querySelector('.color-picker');
        const resetFormatBtn = toolbar.querySelector('.reset-format');
        const colorPresets = toolbar.querySelectorAll('.color-preset');
        const codeFormatBtn = toolbar.querySelector('.code-format-btn');

        codeFormatBtn.addEventListener('click', () => {
            this.formatAsCode();
        });
        boldBtn.addEventListener('click', () => {
            document.execCommand('bold', false, null);
        });

        underlineBtn.addEventListener('click', () => {
            document.execCommand('underline', false, null);
        });

        colorPicker.addEventListener('input', () => {
            this.colorPickerCurrentColor = colorPicker.value;
            document.execCommand('foreColor', false, colorPicker.value);

            if (this.autoSaveEnabled) {
                this.saveNotesToLocalStorage(true);
            }
        });

        resetFormatBtn.addEventListener('click', (e) => {
            this.cleanFormatting(e)
        });

        colorPresets.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const colorProperty = `color${index + 1}`;
                const color = this[colorProperty];
                document.execCommand('foreColor', false, color);

            });
        });
    }


    addNote(title = 'New Note', content = '', x = null, y = null, width = 250, height = 200, style = {}, id = null) {
        if (!this.activeSection) return;

        const sectionContent = document.querySelector(`.section-content[data-section-id="${this.activeSection.id}"]`);
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

        this.activeSection.notes.push(note);

        if (this.autoSaveEnabled) {
            this.saveNotesToLocalStorage(true);
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
                this.draggingNote = {
                    element: noteElement,
                    offsetX,
                    offsetY
                };
            }

        });

        document.addEventListener('mouseup', () => {
            if (this.draggingNote && this.autoSaveEnabled) {
                this.saveNotesToLocalStorage(true);
            }
            if (this.resizingNote && this.autoSaveEnabled) {
                this.saveNotesToLocalStorage(true);
            }
        });

        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const startWidth = parseInt(getComputedStyle(noteElement).width);
            const startHeight = parseInt(getComputedStyle(noteElement).height);

            this.resizingNote = {
                element: noteElement,
                startWidth,
                startHeight,
                startX: e.clientX,
                startY: e.clientY
            };
        });
    }

    handleMouseMove(e) {
        if (this.multiDragStartPositions) {
            const sectionContent = this.activeSection
                ? document.querySelector(`.section-content[data-section-id="${this.activeSection.id}"]`)
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

        if (this.draggingNote) {
            const sectionContent = this.draggingNote.element.closest('.section-content');
            const sectionRect = sectionContent.getBoundingClientRect();

            const x = e.clientX - sectionRect.left - this.draggingNote.offsetX;
            const y = e.clientY - sectionRect.top - this.draggingNote.offsetY;

            this.draggingNote.element.style.left = `${Math.max(0, x)}px`;
            this.draggingNote.element.style.top = `${Math.max(0, y)}px`;
        }

        if (this.resizingNote) {
            const dx = e.clientX - this.resizingNote.startX;
            const dy = e.clientY - this.resizingNote.startY;

            const newWidth = Math.max(250, this.resizingNote.startWidth + dx);
            const newHeight = Math.max(150, this.resizingNote.startHeight + dy);

            this.resizingNote.element.style.width = `${newWidth}px`;
            this.resizingNote.element.style.height = `${newHeight}px`;
        }
    }

    setupNoteActions(noteElement) {
        const deleteBtn = noteElement.querySelector('.delete-btn');
        const noteContent = noteElement.querySelector('.note-content');

        noteContent.addEventListener('blur', () => {
            this.processMarkdown(noteContent);
        });

        noteContent.addEventListener('keydown', (e) => {
            // this.processMarkdown(noteContent);

            if (e.key === 'Backspace') {
                const selection = window.getSelection();
                if (!selection.rangeCount) return;

                const range = selection.getRangeAt(0);
                const li = range.startContainer.closest?.('li');

                if (li && range.startOffset === 0) {
                    e.preventDefault();

                    const html = li.innerHTML.trim();
                    const fragment = document.createRange().createContextualFragment(`*<br>`);
                    li.replaceWith(fragment);
                }

                const parent = noteContent;
                const textNodes = Array.from(parent.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
                const lastText = textNodes.find(n => n.textContent.includes('*'));

                if (lastText) {
                    const newRange = document.createRange();
                    newRange.setStart(lastText, lastText.textContent.length);
                    newRange.collapse(true);

                    selection.removeAllRanges();
                    selection.addRange(newRange);
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
            const section = this.sections.find(section => section.id === sectionId);
            if (section) {
                section.notes = section.notes.filter(note => note.id !== noteId);
            }
            if (this.autoSaveEnabled) {
                this.saveNotesToLocalStorage(true);
            }
        });


    }

    clearSelectedNotes() {
        this.selectedNotes.forEach(n => n.classList.remove('selected'));
        this.selectedNotes.clear();
    }

    initAutoSave() {
        const autoSaveEnabled = localStorage.getItem('autoSaveEnabled') === 'true';
        const autoSaveToggle = document.getElementById('auto-save-toggle');

        autoSaveToggle.checked = autoSaveEnabled;
        this.autoSaveEnabled = autoSaveEnabled;
        this.isLoading = false;

        if (this.autoSaveEnabled) {
            this.loadNotesFromLocalStorage(true);
            this.startAutoSave();
        }

        autoSaveToggle.addEventListener('change', () => {
            this.autoSaveEnabled = autoSaveToggle.checked;
            localStorage.setItem('autoSaveEnabled', this.autoSaveEnabled);

            if (this.autoSaveEnabled) {
                this.startAutoSave();
                this.showNotification('Auto Save enabled', 'success-message');
            } else {
                this.stopAutoSave();
                this.showNotification('Auto Save disabled', 'info-message');
            }
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'notesApp') {
                setTimeout(() => {
                    this.loadNotesFromLocalStorage(true);
                }, 1);
            }
        });
    }

    startAutoSave() {
        document.addEventListener("input", () => {
            if (this.autoSaveEnabled) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveNotesToLocalStorage(true);
                }, 100);
            }
        });
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    saveNotesToLocalStorage(silent = false) {
        if (this.isLoading) return;
        this.sections.forEach(section => {
            const sectionContent = document.querySelector(`.section-content[data-section-id="${section.id}"]`);

            section.notes.forEach(note => {
                const noteElement = sectionContent.querySelector(`.note[data-note-id="${note.id}"]`);
                if (noteElement) {
                    note.title = noteElement.querySelector('.note-title').innerHTML;
                    note.content = noteElement.querySelector('.note-content').innerHTML;
                    note.x = parseInt(noteElement.style.left);
                    note.y = parseInt(noteElement.style.top);
                    note.width = parseInt(noteElement.style.width);
                    note.height = parseInt(noteElement.style.height);

                    const colorPicker = document.querySelector('.color-picker');
                    if (colorPicker) {
                        note.currentColor = colorPicker.value;
                    }
                }
            });
        });

        localStorage.setItem('notesApp', JSON.stringify(this.sections));

        if (!silent) {
            const saveMessage = document.createElement('div');
            saveMessage.textContent = 'Notes saved successfully!';
            saveMessage.className = 'save-message';

            document.body.appendChild(saveMessage);

            setTimeout(() => {
                saveMessage.classList.add('fade-out');
                setTimeout(() => {
                    document.body.removeChild(saveMessage);
                }, 1500);
            }, 1000);
        }
    }

    loadNotesFromLocalStorage(silent = false) {
        this.isLoading = true;

        const savedRaw = JSON.parse(localStorage.getItem('notesApp') || '{}');
        const savedSections = Array.isArray(savedRaw) ? savedRaw : savedRaw.data || [];

        const wasAutoSaveEnabled = this.autoSaveEnabled;
        this.autoSaveEnabled = false;

        if (savedSections.length === 0) {
            if (!silent) {
                this.showNotification('No notes found in local storage', 'error-message');
            }
            this.isLoading = false;
            this.autoSaveEnabled = wasAutoSaveEnabled;
            return;
        }

        document.getElementById('sections-tabs').innerHTML = '';
        document.getElementById('sections-content').innerHTML = '';
        this.sections = [];

        savedSections.forEach(section => {
            const newSection = this.addSection(section.title, section.id);
            section.notes.forEach(note => {
                this.addNote(
                    note.title,
                    note.content,
                    note.x,
                    note.y,
                    note.width,
                    note.height,
                    note.style,
                    note.id
                );

                if (note.currentColor) {
                    const colorPicker = document.querySelector('.color-picker');
                    if (colorPicker) {
                        colorPicker.value = note.currentColor;
                    }
                }
            });
        });

        if (!silent) {
            this.showNotification('Notes loaded successfully', 'success-message');
        }

        this.isLoading = false;

        setTimeout(() => {
            this.autoSaveEnabled = wasAutoSaveEnabled;
        }, 200);
    }

    formatAsCode() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (selection.isCollapsed) return;

        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: node => range.intersectsNode(node)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT
            }
        );

        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        const hasCode = textNodes.some(n => n.parentElement?.classList?.contains('inline-code'));
        if (hasCode) {
            textNodes.forEach(node => {
                const parent = node.parentElement;
                if (parent?.classList?.contains('inline-code')) {
                    const textNode = document.createTextNode(parent.textContent);
                    parent.replaceWith(textNode);
                }
            });
            return;
        }

        textNodes.forEach(node => {
            const parent = node.parentElement;
            if (!parent.classList.contains('inline-code')) {
                const codeSpan = document.createElement('span');
                codeSpan.className = 'inline-code';
                node.parentNode.replaceChild(codeSpan, node);
                codeSpan.appendChild(node);
                hljs.highlightElement(codeSpan);
            }
        });
    }





    showNotification(message, className) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.className = 'notification ' + className;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');

            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 1500);
        }, 1000);
    }

    exportNotes() {
        this.sections.forEach(section => {
            const sectionContent = document.querySelector(`.section-content[data-section-id="${section.id}"]`);

            section.notes.forEach(note => {
                const noteElement = sectionContent.querySelector(`.note[data-note-id="${note.id}"]`);

                if (noteElement) {
                    note.title = noteElement.querySelector('.note-title').innerHTML;
                    note.content = noteElement.querySelector('.note-content').innerHTML;
                    note.x = parseInt(noteElement.style.left);
                    note.y = parseInt(noteElement.style.top);
                    note.width = parseInt(noteElement.style.width);
                    note.height = parseInt(noteElement.style.height);

                    const colorPicker = document.querySelector('.color-picker');
                    if (colorPicker) {
                        note.currentColor = colorPicker.value;
                    }
                }
            });
        });

        const dataStr = JSON.stringify(this.sections, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'notes' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importNotes(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const sections = JSON.parse(e.target.result);
                if (!Array.isArray(sections)) {
                    throw new Error('Invalid file format');
                }

                document.getElementById('sections-tabs').innerHTML = '';
                document.getElementById('sections-content').innerHTML = '';
                this.sections = [];

                sections.forEach(section => {
                    const newSection = this.addSection(section.title, section.id);

                    if (Array.isArray(section.notes)) {
                        section.notes.forEach(note => {
                            this.addNote(
                                note.title ?? 'New Note',
                                note.content ?? '',
                                note.x ?? 50,
                                note.y ?? 50,
                                note.width ?? 250,
                                note.height ?? 200,
                                note.style ?? {},
                                note.id
                            );
                            if (note.currentColor) {
                                const colorPicker = document.querySelector('.color-picker');
                                if (colorPicker) {
                                    colorPicker.value = note.currentColor;
                                }
                            }
                        });
                    }
                });

                this.showNotification('Notes imported successfully', 'success-message');
            } catch (error) {
                this.showNotification('Error importing file: ' + error.message, 'error-message');
            }

            event.target.value = '';
        };

        reader.readAsText(file);
    }


    initNotesOverview() {
        if (!document.getElementById('notes-overview-btn')) {
            this.createOverviewButton();
        }

        if (!document.getElementById('notes-overview-modal')) {
            this.createOverviewModal();
        }

        this.notesOverviewModal = document.getElementById('notes-overview-modal');
        this.notesSearchInput = document.getElementById('notes-search');
        this.notesListContainer = document.getElementById('notes-list-container');

        this.setupOverviewEvents();
    }

    createOverviewButton() {
        const btn = document.createElement('button');
        btn.id = 'notes-overview-btn';

        const toolbar = document.querySelector('.note-toolbar');
        if (toolbar) {
            toolbar.appendChild(btn);
        }
    }

    createOverviewModal() {
        const modalHTML = `
            <div id="notes-overview-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Notes list</h3>                        
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="search-container">
                        <input type="text" id="notes-search" placeholder="Search notes..." autocomplete="off">
                    </div>
                    <div id="notes-list-container" class="notes-list-container"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupOverviewEvents() {
        document.getElementById('notes-overview-btn').addEventListener('click', () => {
            this.openNotesOverview();
        });

        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeNotesOverview();
        });

        this.notesOverviewModal.addEventListener('click', (e) => {
            if (e.target === this.notesOverviewModal) {
                this.closeNotesOverview();
            }
        });

        this.notesSearchInput.addEventListener('input', (e) => {
            this.filterNotes(e.target.value);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.notesOverviewModal.style.display === 'block') {
                this.closeNotesOverview();
            }
        });
    }

    openNotesOverview() {
        this.notesOverviewModal.style.display = 'block';
        this.notesSearchInput.value = '';
        this.renderNotesList();
        this.notesSearchInput.focus();
    }

    closeNotesOverview() {
        this.notesOverviewModal.style.display = 'none';
    }

    renderNotesList() {
        this.notesListContainer.innerHTML = '';

        this.sections.forEach(section => {
            const sectionGroup = document.createElement('div');
            sectionGroup.className = 'section-group';

            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'section-header';
            sectionHeader.innerHTML = `
                ${section.title}
                <span class="notes-counter">${section.notes.length} notes</span>
            `;

            const sectionNotes = document.createElement('div');
            sectionNotes.className = 'section-notes';

            section.notes.forEach(note => {
                const noteItem = document.createElement('div');
                noteItem.className = 'note-item';
                noteItem.dataset.sectionId = section.id;
                noteItem.dataset.noteId = note.id;

                const preview = note.content.replace(/<[^>]*>/g, '').substring(0, 50) + '...';

                noteItem.innerHTML = `
                    <div>
                        <div class="note-title list-note-title">${note.title}</div>                        
                    </div>
                `;
                noteItem.addEventListener('click', () => {
                    this.navigateToNote(section.id, note.id);
                });

                sectionNotes.appendChild(noteItem);
            });

            sectionGroup.appendChild(sectionHeader);
            sectionGroup.appendChild(sectionNotes);
            this.notesListContainer.appendChild(sectionGroup);
        });
    }

    filterNotes(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const noteItems = this.notesListContainer.querySelectorAll('.note-item');

        if (!term) {
            noteItems.forEach(item => {
                item.classList.remove('hidden');
                item.innerHTML = item.innerHTML.replace(/<mark class="highlight">(.+?)<\/mark>/g, '$1');
            });
            this.showAllSections();
            return;
        }

        noteItems.forEach(item => {
            item.classList.add('hidden');
            item.innerHTML = item.innerHTML.replace(/<mark class="highlight">(.+?)<\/mark>/g, '$1');
        });

        noteItems.forEach(item => {
            const title = item.querySelector('.note-title').textContent.toLowerCase();
            const preview = item.querySelector('.note-preview').textContent.toLowerCase();

            if (title.includes(term) || preview.includes(term)) {
                item.classList.remove('hidden');

                const highlightedTitle = title.replace(
                    new RegExp(term, 'gi'),
                    match => `<mark class="highlight">${match}</mark>`
                );

                const highlightedPreview = preview.replace(
                    new RegExp(term, 'gi'),
                    match => `<mark class="highlight">${match}</mark>`
                );

                item.querySelector('.note-title').innerHTML = highlightedTitle;
                item.querySelector('.note-preview').innerHTML = highlightedPreview;
            }
        });

        this.toggleEmptySections();
    }

    showAllSections() {
        document.querySelectorAll('.section-group').forEach(group => {
            group.style.display = 'block';
        });
    }

    toggleEmptySections() {
        document.querySelectorAll('.section-group').forEach(group => {
            const hasVisibleNotes = group.querySelector('.note-item:not(.hidden)');
            group.style.display = hasVisibleNotes ? 'block' : 'none';
        });
    }

    navigateToNote(sectionId, noteId) {
        this.closeNotesOverview();

        this.setActiveSection(sectionId);

        setTimeout(() => {
            const noteElement = document.querySelector(`.note[data-note-id="${noteId}"]`);
            if (noteElement) {
                noteElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

                noteElement.style.boxShadow = '0 0 0 3px #82af74ff';
                noteElement.style.transition = 'box-shadow 0.3s ease';

                setTimeout(() => {
                    noteElement.style.boxShadow = '';
                }, 2000);
            }
        }, 100);
    }
}

class JWTAnalyzer {
    constructor() {
        this.jwt = '';
        this.decoded = null;
        this.editedHeader = '';
        this.editedPayload = '';
        this.editedSignature = '';
        this.secret = '';
        this.activeTab = 'decode';
        this.copied = false;
        this.validationResult = null;
        this.vulnerabilities = [];
        this.init();
    }

    init() {
        const jwtBtn = document.getElementById('jwt-btn');
        const jwtModal = document.getElementById('jwt-modal');
        const closeJwtModal = document.querySelector('.close-jwt-modal');
        const jwtTokenInput = document.getElementById('jwt-token-input');

        jwtBtn.addEventListener('click', () => this.openModal());
        closeJwtModal.addEventListener('click', () => this.closeModal());
        jwtModal.addEventListener('click', (e) => {
            if (e.target === jwtModal) this.closeModal();
        });

        jwtTokenInput.addEventListener('input', (e) => {
            this.jwt = e.target.value.trim();
            this.decodeAndUpdate();
        });

        // Tab switching
        document.querySelectorAll('.jwt-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Copy button
        document.getElementById('jwt-copy-btn').addEventListener('click', () => {
            this.copyToClipboard(this.jwt);
        });

        // Edit tab actions
        document.getElementById('jwt-edit-header').addEventListener('input', (e) => {
            this.editedHeader = e.target.value;
        });
        document.getElementById('jwt-edit-payload').addEventListener('input', (e) => {
            this.editedPayload = e.target.value;
        });
        document.getElementById('jwt-edit-signature').addEventListener('input', (e) => {
            this.editedSignature = e.target.value;
        });
        document.getElementById('jwt-rebuild-keep').addEventListener('click', () => {
            this.rebuildToken(true);
        });
        document.getElementById('jwt-rebuild-remove').addEventListener('click', () => {
            this.rebuildToken(false);
        });

        // Sign tab
        document.getElementById('jwt-sign-btn').addEventListener('click', () => {
            this.signToken();
        });
        document.querySelectorAll('.jwt-secret-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('jwt-secret').value = btn.dataset.secret;
            });
        });

        // Verify tab
        document.getElementById('jwt-verify-btn').addEventListener('click', () => {
            this.verifySignature();
        });

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && jwtModal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }

    openModal() {
        document.getElementById('jwt-modal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('jwt-modal').style.display = 'none';
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.jwt-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.jwt-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`jwt-${tabName}-tab`).classList.add('active');
    }

    base64UrlDecode(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        const pad = str.length % 4;
        if (pad) str += '='.repeat(4 - pad);
        try {
            return decodeURIComponent(escape(atob(str)));
        } catch (e) {
            return null;
        }
    }

    base64UrlEncode(str) {
        return btoa(unescape(encodeURIComponent(str)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    decodeJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error('Invalid JWT format');

            const header = JSON.parse(this.base64UrlDecode(parts[0]));
            const payload = JSON.parse(this.base64UrlDecode(parts[1]));
            const signature = parts[2];

            return { header, payload, signature, parts };
        } catch (e) {
            return null;
        }
    }

    checkVulnerabilities(token, decodedData) {
        const vulns = [];
        if (!decodedData) return vulns;

        if (decodedData.header.alg === 'none') {
            vulns.push({
                severity: 'high',
                title: 'Algorithm "none" detected',
                description: 'Token uses no signature - completely bypasses verification'
            });
        }

        if (decodedData.header.alg && decodedData.header.alg.startsWith('HS')) {
            vulns.push({
                severity: 'medium',
                title: 'Symmetric algorithm (HMAC)',
                description: 'Try brute-forcing weak secrets or test if signature is verified'
            });
        }

        if (!decodedData.payload.exp) {
            vulns.push({
                severity: 'medium',
                title: 'No expiration time (exp)',
                description: 'Token does not expire - can be reused indefinitely'
            });
        }

        if (decodedData.payload.exp && decodedData.payload.exp * 1000 < Date.now()) {
            vulns.push({
                severity: 'low',
                title: 'Token expired',
                description: 'Check if application accepts expired tokens'
            });
        }

        if (decodedData.header.alg && decodedData.header.alg.startsWith('RS')) {
            vulns.push({
                severity: 'high',
                title: 'RSA algorithm - Algorithm Confusion possible',
                description: 'Try changing to HS256/HS512 and use public key as HMAC secret'
            });
        }

        const sensitiveFields = ['password', 'secret', 'token', 'key', 'ssn', 'credit', 'card'];
        const payloadStr = JSON.stringify(decodedData.payload).toLowerCase();
        const foundSensitive = sensitiveFields.filter(field => payloadStr.includes(field));
        
        if (foundSensitive.length > 0) {
            vulns.push({
                severity: 'medium',
                title: 'Sensitive data in payload',
                description: `Found: ${foundSensitive.join(', ')} - JWT payload is NOT encrypted!`
            });
        }

        if (!decodedData.signature || decodedData.signature === '') {
            vulns.push({
                severity: 'high',
                title: 'Empty signature',
                description: 'Token has no signature - test if server validates it'
            });
        }

        return vulns;
    }

    decodeAndUpdate() {
        if (this.jwt) {
            const result = this.decodeJWT(this.jwt);
            this.decoded = result;
            if (result) {
                this.editedHeader = JSON.stringify(result.header, null, 2);
                this.editedPayload = JSON.stringify(result.payload, null, 2);
                this.editedSignature = result.signature;
                const vulns = this.checkVulnerabilities(this.jwt, result);
                this.vulnerabilities = vulns;
                this.updateUI();
            } else {
                this.vulnerabilities = [];
                this.decoded = null;
                this.updateUI();
            }
        } else {
            this.decoded = null;
            this.vulnerabilities = [];
            this.updateUI();
        }
    }

    updateUI() {
        // Show/hide copy button
        const copyBtn = document.getElementById('jwt-copy-btn');
        if (this.jwt) {
            copyBtn.style.display = 'inline-block';
        } else {
            copyBtn.style.display = 'none';
        }

        // Update vulnerabilities
        const vulnsContainer = document.getElementById('jwt-vulnerabilities');
        const vulnsList = document.getElementById('jwt-vulns-list');
        if (this.vulnerabilities.length > 0) {
            vulnsContainer.style.display = 'block';
            document.getElementById('jwt-vuln-count').textContent = this.vulnerabilities.length;
            vulnsList.innerHTML = this.vulnerabilities.map(vuln => `
                <div class="jwt-vuln-item">
                    <div class="jwt-vuln-header">
                        <span class="jwt-severity-badge jwt-severity-${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                        <span class="jwt-vuln-title">${vuln.title}</span>
                    </div>
                    <p class="jwt-vuln-desc">${vuln.description}</p>
                </div>
            `).join('');
        } else {
            vulnsContainer.style.display = 'none';
        }

        // Update decode tab
        if (this.decoded) {
            const decodeContent = document.getElementById('jwt-decode-content');
            decodeContent.innerHTML = `
                <div class="jwt-decode-grid">
                    <div class="jwt-decode-box">
                        <h3>Header</h3>
                        <pre class="jwt-code-block">${JSON.stringify(this.decoded.header, null, 2)}</pre>
                    </div>
                    <div class="jwt-decode-box">
                        <h3>Payload</h3>
                        <pre class="jwt-code-block">${JSON.stringify(this.decoded.payload, null, 2)}</pre>
                        ${this.decoded.payload.exp ? `
                            <div class="jwt-exp-info">
                                Expires: ${new Date(this.decoded.payload.exp * 1000).toLocaleString()}
                            </div>
                        ` : ''}
                    </div>
                    <div class="jwt-decode-box jwt-decode-full">
                        <h3>Signature</h3>
                        <div class="jwt-signature-display">
                            ${this.decoded.signature || '<span class="jwt-error">(empty - no signature!)</span>'}
                        </div>
                    </div>
                </div>
            `;
        } else {
            document.getElementById('jwt-decode-content').innerHTML = '<p class="jwt-placeholder">Enter a JWT token to decode</p>';
        }

        // Update edit tab
        if (this.decoded) {
            document.getElementById('jwt-edit-header').value = this.editedHeader;
            document.getElementById('jwt-edit-payload').value = this.editedPayload;
            document.getElementById('jwt-edit-signature').value = this.editedSignature;
        }
    }

    rebuildToken(keepSignature = true) {
        try {
            const header = JSON.parse(this.editedHeader);
            const payload = JSON.parse(this.editedPayload);

            const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
            const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

            let signature = keepSignature ? this.editedSignature : '';
            
            // Se mudou para none, remove assinatura
            if (header.alg === 'none') {
                signature = '';
            }

            const newToken = `${encodedHeader}.${encodedPayload}.${signature}`;
            this.jwt = newToken;
            document.getElementById('jwt-token-input').value = newToken;
            this.decodeAndUpdate();
        } catch (e) {
            alert('Error: Invalid JSON - ' + e.message);
        }
    }

    async signToken() {
        const secret = document.getElementById('jwt-secret').value;
        if (!secret) {
            alert('Please enter a secret key');
            return;
        }

        try {
            const header = JSON.parse(this.editedHeader || JSON.stringify(this.decoded.header));
            const payload = JSON.parse(this.editedPayload || JSON.stringify(this.decoded.payload));

            const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
            const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
            
            const data = `${encodedHeader}.${encodedPayload}`;
            
            // Use Web Crypto API for HMAC
            const enc = new TextEncoder();
            const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };
            
            if (header.alg === 'HS384') {
                algorithm.hash.name = 'SHA-384';
            } else if (header.alg === 'HS512') {
                algorithm.hash.name = 'SHA-512';
            }

            const key = await crypto.subtle.importKey(
                'raw',
                enc.encode(secret),
                algorithm,
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign(
                'HMAC',
                key,
                enc.encode(data)
            );

            const signatureArray = new Uint8Array(signature);
            const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const newToken = `${data}.${signatureBase64}`;
            this.jwt = newToken;
            this.editedSignature = signatureBase64;
            document.getElementById('jwt-token-input').value = newToken;
            this.decodeAndUpdate();
            
        } catch (e) {
            alert('Error signing token: ' + e.message);
        }
    }

    async verifySignature() {
        const secret = document.getElementById('jwt-verify-secret').value;
        
        if (!this.decoded || !secret) {
            this.showVerifyResult(false, 'Need token and secret');
            return;
        }

        if (this.decoded.header.alg === 'none') {
            const isValid = this.decoded.signature === '';
            this.showVerifyResult(isValid, isValid ? 'Valid: "none" algorithm with empty signature' : 'Invalid: "none" algorithm should have empty signature');
            return;
        }

        try {
            const data = `${this.decoded.parts[0]}.${this.decoded.parts[1]}`;
            const enc = new TextEncoder();
            
            const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };
            if (this.decoded.header.alg === 'HS384') {
                algorithm.hash.name = 'SHA-384';
            } else if (this.decoded.header.alg === 'HS512') {
                algorithm.hash.name = 'SHA-512';
            }

            const key = await crypto.subtle.importKey(
                'raw',
                enc.encode(secret),
                algorithm,
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
            const signatureArray = new Uint8Array(signature);
            const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const isValid = signatureBase64 === this.decoded.signature;
            this.showVerifyResult(isValid, isValid ? 'Signature is VALID!' : 'Signature is INVALID - wrong secret or algorithm');
        } catch (e) {
            this.showVerifyResult(false, 'Error: ' + e.message);
        }
    }

    showVerifyResult(valid, message) {
        const resultDiv = document.getElementById('jwt-verify-result');
        resultDiv.style.display = 'block';
        resultDiv.className = `jwt-verify-result ${valid ? 'jwt-verify-valid' : 'jwt-verify-invalid'}`;
        resultDiv.innerHTML = `
            <span>${valid ? '✓' : '✗'}</span>
            <span>${message}</span>
        `;
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        const copyText = document.getElementById('jwt-copy-text');
        copyText.textContent = 'Copied!';
        setTimeout(() => {
            copyText.textContent = 'Copy';
        }, 2000);
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const notesApp = new NotesApp();
    const jwtAnalyzer = new JWTAnalyzer();
});



