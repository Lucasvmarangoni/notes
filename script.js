class NotesApp {
    constructor() {
        this.color1 = '#FFA65C'
        this.color2 = '#B28DFF'
        this.color3 = '#00FF88'
        this.color4 = '#00CFFF'
        this.default = '#FFFFFF'

        this.sections = [];
        this.activeSection = null;
        this.activeSectionId = null;
        this.draggingNote = null;
        this.resizingNote = null;
        this.currentRenamingSection = null;
        this.autoSaveEnabled = false;
        this.autoSaveInterval = null;

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
        document.removeEventListener('paste', this.handlePasteEvent);

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
                <p><strong>Drag and Drop</strong>: Move and position notes freely.</p>
                <p><strong>Bulleted Lists</strong>: Create simple and clean bulleted lists.</p>
                <p><strong>Organize by Sections</strong>: Divide notes into different sections.</p>
                <p><strong>Local Storage</strong>: Save notes to your browser's local storage.</p>
                <p><strong>Auto Save</strong>: Automatically save and load your content.</p>
                <p><strong>Export & Import</strong>: Export notes as JSON and import them later.</p>
                <p><strong>Event Storage</strong>: Enables real-time synchronization between multiple windows.</p>
                <p><strong>Keyboard Shortcuts</strong>:</p>
                <kbd>Ctrl</kbd> + <kbd>1</kbd> to <kbd>4</kbd>: Apply one of the four predefined colors <br>
                <kbd>Ctrl</kbd> + <kbd>'</kbd>: Set text color to white <br>
                <kbd>Ctrl</kbd> + <kbd>B</kbd>: Toggle bold <br>
                <kbd>Ctrl</kbd> + <kbd>U</kbd>: Toggle underline <br>
                <kbd>Ctrl</kbd> + <kbd>\\</kbd>: Remove all formatting <br>
                <kbd>Shift</kbd> + <kbd>C</kbd>: Toggle to code formatting <br>
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

    }

    handlePasteEvent(e) {
        const noteContent = e.target.closest('.note-content');
        if (!noteContent) return;

        e.preventDefault();

        const html = (e.clipboardData || window.clipboardData).getData('text/html');
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');

        const temp = document.createElement('div');
        temp.innerHTML = html || text;

        const codeContainer =
            temp.querySelector('pre') ||
            temp.querySelector('code') ||
            temp.querySelector('.highlight') ||
            temp;

        const inner = codeContainer.innerHTML;

        const wrapper = `<pre style="margin:0;padding:8px;border-radius:4px;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;">${inner}</pre>`;

        e.target.focus();

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const frag = document.createRange().createContextualFragment(wrapper);
            range.insertNode(frag);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            document.execCommand('insertHTML', false, wrapper);
        }

        document.execCommand('insertHTML', false, '<div><br></div>');
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
                e.preventDefault();
                document.execCommand('foreColor', false, this.default);
                document.execCommand('fontName', false, 'inherit');
                document.execCommand('removeFormat', false, null);
            }

            else if (e.shiftKey && e.key === 'C') {
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
                document.execCommand('foreColor', false, this.default);
            }
        });
    }

    createDefaultSection() {
        this.addSection('Section', 1);
    }


    addSection(title = 'New Section', id = null) {
        console.log(this.sections)
        const sectionId = id || Math.max(...this.sections.map(s => Number(s.id))) + 1

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
                this.setActiveSection(sectionId);
            }
        });

        tabElement.querySelector('.close-tab').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSection(sectionId);
        });

        tabElement.querySelector('.rename-tab').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openRenameModal(sectionId);
        });

        const section = {
            id: sectionId,
            title: title,
            notes: []
        };

        this.sections.push(section);
        console.log(section.title + ":" + section.id)
        this.setActiveSection(section.id);

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
                    <button class="code-format-btn" title="Format as code (Shift+C)">&lt;/</button>
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

    formatAsCode() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const focusedElement = selection.anchorNode.parentElement;
        if (!focusedElement.closest('.note-content')) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (!selectedText.trim()) return;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'hljs'; 
        codeBlock.textContent = selectedText;

        this.applySyntaxHighlighting(codeBlock);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'code-remove-btn';
        removeBtn.textContent = 'Revert';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            this.revertFormatting(codeBlock);
        };
        codeBlock.appendChild(removeBtn);

        range.deleteContents();
        range.insertNode(codeBlock);

        const newRange = document.createRange();
        newRange.selectNodeContents(codeBlock);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }

    applySyntaxHighlighting(codeElement) {
        hljs.highlightElement(codeElement);

        codeElement.classList.add('note-code-block');
    }

    revertFormatting(codeBlock) {
        const removeBtn = codeBlock.querySelector('.code-remove-btn');
        if (removeBtn) {
            removeBtn.remove();
        }
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = codeBlock.innerHTML;

        const plainText = tempDiv.textContent;

        const textNode = document.createTextNode(plainText);

        codeBlock.parentNode.replaceChild(textNode, codeBlock);

        const range = document.createRange();
        range.selectNodeContents(textNode);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
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
            this.focusActiveNote();
        });

        underlineBtn.addEventListener('click', () => {
            document.execCommand('underline', false, null);
            this.focusActiveNote();
        });

        colorPicker.addEventListener('input', () => {
            document.execCommand('foreColor', false, colorPicker.value);
            this.focusActiveNote();
        });

        resetFormatBtn.addEventListener('click', () => {
            document.execCommand('removeFormat', false, null);
            this.focusActiveNote();
        });

        colorPresets.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const colorProperty = `color${index + 1}`;
                const color = this[colorProperty];
                document.execCommand('foreColor', false, color);
                this.focusActiveNote();
            });
        });
    }


    addNote(title = 'New Note', content = '', x = 50, y = 120, width = 250, height = 200, style = {}, id = null) {
        if (!this.activeSection) return;

        const sectionContent = document.querySelector(`.section-content[data-section-id="${this.activeSection.id}"]`);
        const noteId = id || Date.now() + Math.random();

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

            this.draggingNote = {
                element: noteElement,
                offsetX,
                offsetY
            };
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
                    const newSection = this.addSection(section.title);
                    if (Array.isArray(section.notes)) {
                        section.notes.forEach(note => {
                            this.addNote(
                                note.title || 'New Note',
                                note.content || '',
                                note.x || 50,
                                note.y || 50,
                                note.width || 250,
                                note.height || 200,
                                note.style || {}
                            );
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
}

document.addEventListener('DOMContentLoaded', () => {
    const notesApp = new NotesApp();
});



