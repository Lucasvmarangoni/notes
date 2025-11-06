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
        this.updateLayoutPositions();
        window.addEventListener('resize', () => this.updateLayoutPositions());

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

            // Fecha outros popups abertos
            const allPopups = document.querySelectorAll('.info-popup');
            allPopups.forEach(p => {
                if (p !== popup) {
                    p.style.display = "none";
                }
            });

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

        window.togglePopup = function (wrapper, event) {
            if (event) {
                event.stopPropagation(); // Previne que o evento de click fora seja disparado
            }
            const popup = wrapper.querySelector('.info-popup');
            const isVisible = popup.style.display === "block" || window.getComputedStyle(popup).display === "block";
            
            if (isVisible) {
                window.hidePopup();
            } else {
                window.showPopup(wrapper);
            }
        };

        document.addEventListener('click', function (event) {
            const isInfoBtn = event.target.closest('.info-btn');
            const isInfoPopup = event.target.closest('.info-popup');
            const isInfoWrapper = event.target.closest('.info-wrapper');

            if (!isInfoBtn && !isInfoPopup && !isInfoWrapper) {
                window.hidePopup();
            }
        });

        const infoMap = `
            <div style="line-height: 1.4;">
                <p><strong>Add Notes</strong>: Create and manage notes easily and quickly.</p>
                <p><strong>Add Section</strong>: Create and manage sections like browser tabs.</p>
                <p><strong>List</strong>: All sections and notes listed in a hierarchical and organized view.</p>
                <p><strong>Drag and Drop</strong>: Move and position multiple notes freely.</p>
                <p><strong>Bulleted Lists</strong>: Type <kbd>*</kbd> + space at the start of a line, or select text and click the bullet (•) button.</p>
                <p><strong>Numbered Lists</strong>: Type <kbd>1.</kbd> + space at the start of a line, or select text and click the numbered (1.) button.</p>
                <p><strong>Checkboxes</strong>: Type <kbd>&gt;</kbd> + space at the start of a line, or select text and click the checkbox (☐) button.</p>
                <p><strong>List Conversion</strong>: Select text and click the bullet (•), numbered (1.), or checkbox (☐) buttons to convert each line to the selected list type.</p>
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
                <kbd>Enter</kbd>: In lists, creates a new item. Press <kbd>Backspace</kbd> on empty items to exit the list.<br>                               
            </div>
        `;

        document.addEventListener('DOMContentLoaded', function () {
            // Event listeners movidos para o HTML via onclick
            // O popup agora é controlado via togglePopup() e fecha ao clicar fora
        });

        document.addEventListener('focusout', (event) => {
            this.removeEmptyBullets()
        });

        document.addEventListener('keydown', (event) => {
            if (!event.target.classList.contains('note-content')) return;

            const noteContent = event.target;
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const container = range.startContainer;
            const lineText = this.getCurrentLineText(noteContent, range);
            
            if (event.key === 'Enter') {
                // Check if we're inside a processed list item or checkbox
                const parentElement = container.nodeType === Node.TEXT_NODE 
                    ? container.parentElement 
                    : container;
                const isInListItem = parentElement?.closest('li');
                const isInCheckbox = parentElement?.closest('.checkbox-item');
                
                // If we're in a processed list item
                if (isInListItem) {
                    const li = isInListItem;
                    const liText = li.textContent.trim();
                    
                    // If the list item is empty, remove it and replace with br + text node to maintain visual line
                    if (!liText || liText.length === 0) {
                        event.preventDefault();
                        const list = li.parentElement;
                        const parent = list.parentNode;
                        
                        // Create br and text node to maintain visual line
                        const br = document.createElement('br');
                        const textNode = document.createTextNode('');
                        
                        // Insert br and textNode before removing li
                        li.parentNode.insertBefore(br, li);
                        li.parentNode.insertBefore(textNode, br.nextSibling);
                        li.remove();
                        
                        // If list is now empty, remove it too (br and textNode are already in parent)
                        if (list.children.length === 0) {
                            list.remove();
                        }
                        
                        // Position cursor at the text node (after br, so it's on the same visual line)
                        const range = document.createRange();
                        range.setStart(textNode, 0);
                        range.setEnd(textNode, 0);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        return;
                    }
                    
                    // If item has content, create a new list item
                    event.preventDefault();
                    const list = li.parentElement;
                    const newLi = document.createElement('li');
                    // Create empty text node to allow cursor positioning
                    const newTextNode = document.createTextNode('');
                    newLi.appendChild(newTextNode);
                    list.insertBefore(newLi, li.nextSibling);
                    
                    // Move cursor to new list item
                    const range = document.createRange();
                    range.setStart(newTextNode, 0);
                    range.setEnd(newTextNode, 0);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return;
                }
                
                // If we're in a checkbox, create a new checkbox or allow normal line break
                if (isInCheckbox) {
                    event.preventDefault();
                    const checkboxItem = isInCheckbox;
                    const label = checkboxItem.querySelector('span');
                    const cursorPos = selection.getRangeAt(0).startOffset;
                    const text = label.textContent;
                    
                    // If cursor is at the end, create new checkbox
                    if (cursorPos >= text.length) {
                        const newCheckboxItem = document.createElement('div');
                        newCheckboxItem.className = 'checkbox-item';
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'markdown-checkbox';
                        newCheckboxItem.appendChild(checkbox);
                        const newLabel = document.createElement('span');
                        newCheckboxItem.appendChild(newLabel);
                        
                        checkboxItem.parentNode.insertBefore(newCheckboxItem, checkboxItem.nextSibling);
                        
                        // Move cursor to new checkbox
                        const range = document.createRange();
                        range.selectNodeContents(newLabel);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        // If cursor is in the middle, split the text
                        const beforeText = text.substring(0, cursorPos);
                        const afterText = text.substring(cursorPos);
                        label.textContent = beforeText;
                        
                        const newCheckboxItem = document.createElement('div');
                        newCheckboxItem.className = 'checkbox-item';
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'markdown-checkbox';
                        newCheckboxItem.appendChild(checkbox);
                        const newLabel = document.createElement('span');
                        newLabel.textContent = afterText;
                        newCheckboxItem.appendChild(newLabel);
                        
                        checkboxItem.parentNode.insertBefore(newCheckboxItem, checkboxItem.nextSibling);
                        
                        // Move cursor to new checkbox
                        const range = document.createRange();
                        range.selectNodeContents(newLabel);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    return;
                }
                
                const trimmed = lineText.trim();
                
                // Bullet points
                if (trimmed.startsWith('* ')) {
                    event.preventDefault();
                    const textAfterBullet = trimmed.substring(2).trim();
                    
                    // Process markdown first to convert the line
                    this.processMarkdown(noteContent);
                    
                    // Wait for DOM to update, then add new bullet
                    setTimeout(() => {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            // Find the first list item that was just created
                            const lists = noteContent.querySelectorAll('ul');
                            let targetLi = null;
                            
                            // Find the most recently created list item with our text
                            for (let list of Array.from(lists).reverse()) {
                                const items = list.querySelectorAll('li');
                                for (let li of Array.from(items)) {
                                    if (textAfterBullet && li.textContent.trim() === textAfterBullet) {
                                        targetLi = li;
                                        break;
                                    } else if (!textAfterBullet && !li.textContent.trim()) {
                                        targetLi = li;
                                        break;
                                    }
                                }
                                if (targetLi) break;
                            }
                            
                            if (targetLi) {
                                // Ensure text is in the current list item
                                if (textAfterBullet && targetLi.textContent.trim() !== textAfterBullet) {
                                    targetLi.textContent = textAfterBullet;
                                }
                                
                                // Position cursor at the end of the text
                                
                                // Position cursor at the end of the text in the list item
                                const range = document.createRange();
                                const liTextNode = targetLi.firstChild;
                                if (liTextNode && liTextNode.nodeType === Node.TEXT_NODE) {
                                    range.setStart(liTextNode, liTextNode.textContent.length);
                                    range.setEnd(liTextNode, liTextNode.textContent.length);
                                } else {
                                    // If no text node, create one or use the element
                                    if (targetLi.childNodes.length === 0) {
                                        const emptyTextNode = document.createTextNode('');
                                        targetLi.appendChild(emptyTextNode);
                                        range.setStart(emptyTextNode, 0);
                                        range.setEnd(emptyTextNode, 0);
                                    } else {
                                        range.selectNodeContents(targetLi);
                                        range.collapse(false); // false = end
                                    }
                                }
                                selection.removeAllRanges();
                                selection.addRange(range);
                                
                                // Now create new bullet on Enter
                                const newLi = document.createElement('li');
                                const newBulletTextNode = document.createTextNode('');
                                newLi.appendChild(newBulletTextNode);
                                targetLi.parentElement.insertBefore(newLi, targetLi.nextSibling);
                                
                                const newRange = document.createRange();
                                newRange.setStart(newBulletTextNode, 0);
                                newRange.setEnd(newBulletTextNode, 0);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                            } else {
                                // Fallback: insert text and process
                                document.execCommand('insertText', false, '\n* ');
                                this.processMarkdown(noteContent);
                            }
                        }
                    }, 50);
                    return;
                }
                
                // Numbered lists
                const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
                if (numberedMatch) {
                    event.preventDefault();
                    const textAfterNumber = numberedMatch[2].trim();
                    
                    // Process markdown first to convert the line
                    this.processMarkdown(noteContent);
                    
                    // Wait for DOM to update, then add new numbered item
                    setTimeout(() => {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            // Find the first list item that was just created
                            const lists = noteContent.querySelectorAll('ol');
                            let targetLi = null;
                            
                            // Find the most recently created list item with our text
                            for (let list of Array.from(lists).reverse()) {
                                const items = list.querySelectorAll('li');
                                for (let li of Array.from(items)) {
                                    if (textAfterNumber && li.textContent.trim() === textAfterNumber) {
                                        targetLi = li;
                                        break;
                                    } else if (!textAfterNumber && !li.textContent.trim()) {
                                        targetLi = li;
                                        break;
                                    }
                                }
                                if (targetLi) break;
                            }
                            
                            if (targetLi) {
                                // Ensure text is in the current list item
                                if (textAfterNumber && targetLi.textContent.trim() !== textAfterNumber) {
                                    targetLi.textContent = textAfterNumber;
                                }
                                
                                // Position cursor at the end of the text
                                
                                // Position cursor at the end of the text in the list item
                                const range = document.createRange();
                                const liTextNode = targetLi.firstChild;
                                if (liTextNode && liTextNode.nodeType === Node.TEXT_NODE) {
                                    range.setStart(liTextNode, liTextNode.textContent.length);
                                    range.setEnd(liTextNode, liTextNode.textContent.length);
                                } else {
                                    // If no text node, create one or use the element
                                    if (targetLi.childNodes.length === 0) {
                                        const emptyTextNode = document.createTextNode('');
                                        targetLi.appendChild(emptyTextNode);
                                        range.setStart(emptyTextNode, 0);
                                        range.setEnd(emptyTextNode, 0);
                                    } else {
                                        range.selectNodeContents(targetLi);
                                        range.collapse(false); // false = end
                                    }
                                }
                                selection.removeAllRanges();
                                selection.addRange(range);
                                
                                // Now create new numbered item on Enter
                                const newLi = document.createElement('li');
                                const newNumberTextNode = document.createTextNode('');
                                newLi.appendChild(newNumberTextNode);
                                targetLi.parentElement.insertBefore(newLi, targetLi.nextSibling);
                                
                                const newRange = document.createRange();
                                newRange.setStart(newNumberTextNode, 0);
                                newRange.setEnd(newNumberTextNode, 0);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                            } else {
                                // Fallback: insert text and process
                                const nextNum = parseInt(numberedMatch[1]) + 1;
                                document.execCommand('insertText', false, `\n${nextNum}. `);
                                this.processMarkdown(noteContent);
                            }
                        }
                    }, 50);
                    return;
                }
                
                // Checkboxes
                if (trimmed.startsWith('> ')) {
                    event.preventDefault();
                    const textAfterCheckbox = trimmed.substring(2).trim();
                    
                    // Process markdown first to convert the line
                    this.processMarkdown(noteContent);
                    
                    // Wait for DOM to update, then add new checkbox
                    setTimeout(() => {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            const container = range.startContainer;
                            const parentElement = container.nodeType === Node.TEXT_NODE 
                                ? container.parentElement 
                                : container;
                            const currentCheckbox = parentElement?.closest('.checkbox-item');
                            
                            if (currentCheckbox) {
                                const label = currentCheckbox.querySelector('span');
                                // Ensure text is in the current checkbox
                                if (textAfterCheckbox && label && label.textContent.trim() !== textAfterCheckbox) {
                                    label.textContent = textAfterCheckbox;
                                }
                                
                                const newCheckboxItem = document.createElement('div');
                                newCheckboxItem.className = 'checkbox-item';
                                const checkbox = document.createElement('input');
                                checkbox.type = 'checkbox';
                                checkbox.className = 'markdown-checkbox';
                                newCheckboxItem.appendChild(checkbox);
                                const newLabel = document.createElement('span');
                                newCheckboxItem.appendChild(newLabel);
                                
                                currentCheckbox.parentNode.insertBefore(newCheckboxItem, currentCheckbox.nextSibling);
                                
                                const newRange = document.createRange();
                                newRange.selectNodeContents(newLabel);
                                newRange.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                            } else {
                                // Fallback: insert text and process
                                document.execCommand('insertText', false, '\n> ');
                                this.processMarkdown(noteContent);
                            }
                        }
                    }, 50);
                    return;
                }
                
                this.removeEmptyBullets(noteContent);
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

    getCurrentLineText(element, range) {
        // If we're inside a list item, get the text from the list item
        const container = range.startContainer;
        const parentElement = container.nodeType === Node.TEXT_NODE 
            ? container.parentElement 
            : container;
        const li = parentElement?.closest('li');
        
        if (li) {
            // We're inside a processed list item, return empty to allow normal behavior
            return '';
        }
        
        // Create a range from the start of the element to the cursor
        const rangeClone = range.cloneRange();
        rangeClone.selectNodeContents(element);
        rangeClone.setEnd(range.startContainer, range.startOffset);
        
        // Get text from start to cursor
        const beforeCursor = rangeClone.toString();
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1] || '';
        
        return currentLine;
    }

    removeEmptyBullets(specificElement = null) {
        const noteContents = specificElement ?
            [specificElement] :
            Array.from(document.querySelectorAll('.note-content'));

        noteContents.forEach(noteContent => {
            // Remove empty list items
            const listItems = noteContent.querySelectorAll('li');
            listItems.forEach(li => {
                const text = li.textContent.trim();
                if (!text || text === '*' || text === '* ' || text === '> ' || /^\d+\.\s*$/.test(text)) {
                    li.remove();
                }
            });
            
            // Remove empty lists
            const lists = noteContent.querySelectorAll('ul, ol');
            lists.forEach(list => {
                if (list.children.length === 0) {
                    list.remove();
                }
            });
            
            // Remove empty checkbox items
            const checkboxes = noteContent.querySelectorAll('.checkbox-item');
            checkboxes.forEach(checkbox => {
                const text = checkbox.textContent.trim();
                if (!text || text === '> ') {
                    checkbox.remove();
                }
            });
            
            // Clean up orphaned text nodes with markers
            const walker = document.createTreeWalker(
                noteContent,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                if (!node.parentElement.closest('li') && 
                    !node.parentElement.closest('.checkbox-item') &&
                    !node.parentElement.closest('ul') &&
                    !node.parentElement.closest('ol')) {
                    textNodes.push(node);
                }
            }

            textNodes.forEach(textNode => {
                const text = textNode.textContent.trim();
                if (text === '*' || text === '* ' || text === '> ' || /^\d+\.\s*$/.test(text)) {
                    const parent = textNode.parentNode;
                    if (parent && parent.childNodes.length === 1) {
                        parent.remove();
                    } else {
                        textNode.remove();
                    }
                }
            });
        });
    }

    processMarkdown(element) {
        // Don't process if element is already a list item or checkbox
        if (element.closest('li') || element.closest('.checkbox-item')) {
            return null;
        }

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip text nodes inside list items, checkboxes, or already processed elements
                    if (node.parentElement.closest('li') || 
                        node.parentElement.closest('.checkbox-item') ||
                        node.parentElement.closest('ul') ||
                        node.parentElement.closest('ol')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        let lastCreatedElement = null;

        // Process in reverse to avoid offset issues
        textNodes.reverse().forEach(textNode => {
            const text = textNode.textContent;
            if (!text || text.trim().length === 0) return;

            const lines = text.split(/\r?\n/);
            let hasMarkdown = false;
            let markdownType = null;

            // Check what type of markdown we have
            for (let line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('* ') && trimmed.length > 2) {
                    hasMarkdown = true;
                    markdownType = 'bullet';
                    break;
                } else if (trimmed.match(/^\d+\.\s/) && trimmed.length > 3) {
                    hasMarkdown = true;
                    markdownType = 'numbered';
                    break;
                } else if (trimmed.startsWith('> ') && trimmed.length > 2) {
                    hasMarkdown = true;
                    markdownType = 'checkbox';
                    break;
                }
            }

            if (hasMarkdown) {
                const fragment = document.createDocumentFragment();
                let currentList = null;
                let listType = null;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const trimmed = line.trim();
                    const isLastLine = i === lines.length - 1;

                    // Bullet points
                    if (trimmed.startsWith('* ') && trimmed.length > 2) {
                        if (listType !== 'bullet') {
                            if (currentList) fragment.appendChild(currentList);
                            currentList = document.createElement('ul');
                            listType = 'bullet';
                        }
                        const li = document.createElement('li');
                        const textContent = trimmed.substring(2).trim();
                        if (textContent) {
                            li.textContent = textContent;
                        }
                        currentList.appendChild(li);
                        lastCreatedElement = li;
                    }
                    // Numbered lists
                    else if (trimmed.match(/^\d+\.\s/) && trimmed.length > 3) {
                        if (listType !== 'numbered') {
                            if (currentList) fragment.appendChild(currentList);
                            currentList = document.createElement('ol');
                            listType = 'numbered';
                        }
                        const li = document.createElement('li');
                        const textContent = trimmed.replace(/^\d+\.\s/, '').trim();
                        if (textContent) {
                            li.textContent = textContent;
                        }
                        currentList.appendChild(li);
                        lastCreatedElement = li;
                    }
                    // Checkboxes
                    else if (trimmed.startsWith('> ') && trimmed.length > 2) {
                        if (currentList) {
                            fragment.appendChild(currentList);
                            currentList = null;
                            listType = null;
                        }
                        const checkboxItem = document.createElement('div');
                        checkboxItem.className = 'checkbox-item';
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'markdown-checkbox';
                        checkboxItem.appendChild(checkbox);
                        const label = document.createElement('span');
                        const textContent = trimmed.substring(2).trim();
                        if (textContent) {
                            label.textContent = textContent;
                        }
                        checkboxItem.appendChild(label);
                        fragment.appendChild(checkboxItem);
                        lastCreatedElement = label;
                        if (!isLastLine) {
                            fragment.appendChild(document.createElement('br'));
                        }
                    }
                    // Regular text
                    else {
                        if (currentList) {
                            fragment.appendChild(currentList);
                            currentList = null;
                            listType = null;
                        }
                        if (line.length > 0 || i === 0) {
                            fragment.appendChild(document.createTextNode(line));
                        }
                        if (!isLastLine) {
                            fragment.appendChild(document.createElement('br'));
                        }
                    }
                }

                // Append any remaining list
                if (currentList) {
                    fragment.appendChild(currentList);
                }

                // Replace the text node with the fragment
                if (textNode.parentNode) {
                    textNode.parentNode.replaceChild(fragment, textNode);
                }
            }
        });

        // Position cursor at the end of the last created element
        if (lastCreatedElement) {
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = document.createRange();
                    
                    if (lastCreatedElement.tagName === 'SPAN') {
                        // For checkbox labels
                        if (lastCreatedElement.firstChild && lastCreatedElement.firstChild.nodeType === Node.TEXT_NODE) {
                            const textNode = lastCreatedElement.firstChild;
                            range.setStart(textNode, textNode.textContent.length);
                            range.setEnd(textNode, textNode.textContent.length);
                        } else {
                            range.selectNodeContents(lastCreatedElement);
                            range.collapse(false);
                        }
                    } else {
                        // For list items
                        if (lastCreatedElement.firstChild && lastCreatedElement.firstChild.nodeType === Node.TEXT_NODE) {
                            const textNode = lastCreatedElement.firstChild;
                            range.setStart(textNode, textNode.textContent.length);
                            range.setEnd(textNode, textNode.textContent.length);
                        } else {
                            range.selectNodeContents(lastCreatedElement);
                            range.collapse(false);
                        }
                    }
                    
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }, 0);
        }

        return lastCreatedElement;
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
                    <button class="bullet-list-btn" title="Convert to bullet list">•</button>
                    <button class="numbered-list-btn" title="Convert to numbered list">1.</button>
                    <button class="checkbox-list-btn" title="Convert to checkbox list">☐</button>
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
        
        // Update layout positions after toolbar is created
        setTimeout(() => this.updateLayoutPositions(), 0);
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
            const lineText = this.getCurrentLineText(noteContent, range);
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
            this.processMarkdown(noteContent);
        }, 0);
    }


    addNote(title = 'New Note', content = '', x = null, y = null, width = 230, height = 200, style = {}, id = null) {
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

            const newWidth = Math.max(150, this.resizingNote.startWidth + dx); /* Mínimo de 130px */
            const newHeight = Math.max(85, this.resizingNote.startHeight + dy); /* Mínimo de 2 linhas */

            this.resizingNote.element.style.width = `${newWidth}px`;
            this.resizingNote.element.style.height = `${newHeight}px`;
        }
    }

    setupNoteActions(noteElement) {
        const deleteBtn = noteElement.querySelector('.delete-btn');
        const noteContent = noteElement.querySelector('.note-content');

        noteContent.addEventListener('blur', () => {
            this.processMarkdown(noteContent);
            this.removeEmptyBullets(noteContent);
        });

        // Process markdown on input for real-time conversion
        noteContent.addEventListener('input', (e) => {
            // Don't process if we're inside a processed list item or checkbox
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.startContainer;
                const parentElement = container.nodeType === Node.TEXT_NODE 
                    ? container.parentElement 
                    : container;
                const isInListItem = parentElement?.closest('li');
                const isInCheckbox = parentElement?.closest('.checkbox-item');
                
                // If we're in a processed list or checkbox, don't process markdown
                if (isInListItem || isInCheckbox) {
                    return;
                }
            }
            
            // Debounce to avoid processing on every keystroke
            clearTimeout(noteContent._markdownTimeout);
            noteContent._markdownTimeout = setTimeout(() => {
                this.processMarkdown(noteContent);
            }, 300);
        });

        noteContent.addEventListener('keydown', (e) => {
            // this.processMarkdown(noteContent);

            if (e.key === 'Backspace') {
                const selection = window.getSelection();
                if (!selection.rangeCount) return;

                const range = selection.getRangeAt(0);
                const container = range.startContainer;
                const parentElement = container.nodeType === Node.TEXT_NODE 
                    ? container.parentElement 
                    : container;
                const li = parentElement?.closest('li');

                if (li) {
                    const liText = li.textContent.trim();
                    const isAtStart = range.startOffset === 0 || 
                        (container.nodeType === Node.TEXT_NODE && container === li.firstChild && range.startOffset === 0);
                    
                    // If the list item is empty, remove it and replace with br + text node (stay on same line)
                    if (isAtStart && (!liText || liText.length === 0)) {
                        e.preventDefault();
                        
                        const list = li.parentElement;
                        const parent = list.parentNode;
                        
                        // Create br and text node to maintain visual line
                        const br = document.createElement('br');
                        const textNode = document.createTextNode('');
                        
                        // Replace the list item with br + text node
                        li.parentNode.insertBefore(br, li);
                        li.parentNode.insertBefore(textNode, br.nextSibling);
                        li.remove();
                        
                        // If list is now empty, remove it too
                        if (list.children.length === 0) {
                            // The br and textNode are already inserted, just remove the list
                            list.remove();
                        }
                        
                        // Position cursor at the text node (stays on same line)
                        const newRange = document.createRange();
                        newRange.setStart(textNode, 0);
                        newRange.setEnd(textNode, 0);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        return;
                    }
                    
                    // If at start but item has content, check if will become empty after backspace
                    if (isAtStart && liText.length > 0) {
                        // Allow the backspace to happen, then check if item is now empty
                        setTimeout(() => {
                            const liTextAfter = li.textContent.trim();
                            if (!liTextAfter || liTextAfter.length === 0) {
                                // Item is now empty, remove it and replace with br + text node (same line)
                                const list = li.parentElement;
                                
                                // Create br and text node to maintain visual line
                                const br = document.createElement('br');
                                const textNode = document.createTextNode('');
                                
                                // Replace the list item with br + text node
                                li.parentNode.insertBefore(br, li);
                                li.parentNode.insertBefore(textNode, br.nextSibling);
                                li.remove();
                                
                                // If list is now empty, remove it too
                                if (list.children.length === 0) {
                                    list.remove();
                                }
                                
                                // Position cursor at the text node
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

    updateLayoutPositions() {
        const header = document.querySelector('.header');
        const sectionsTabs = document.getElementById('sections-tabs');
        const sectionsContent = document.getElementById('sections-content');
        const noteActions = document.querySelector('.note-actions');
        
        if (header && sectionsTabs && sectionsContent) {
            const headerHeight = header.offsetHeight;
            const tabsHeight = sectionsTabs.offsetHeight || 40;
            const noteActionsHeight = noteActions ? noteActions.offsetHeight : 18;
            
            // Position tabs below header
            sectionsTabs.style.top = `${headerHeight}px`;
            
            // Position note-actions below tabs
            const noteActionsTop = headerHeight + tabsHeight;
            if (noteActions) {
                noteActions.style.top = `${noteActionsTop}px`;
            }
            
            // Calculate total height needed for sections-content
            const totalHeight = headerHeight + tabsHeight + noteActionsHeight + 20; // 20px extra spacing
            sectionsContent.style.paddingTop = `${totalHeight}px`;
        }
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
        this.activeTab = 'edit';
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
        // Switch to edit tab by default
        this.switchTab('edit');
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

        try {
            const header = JSON.parse(this.editedHeader || JSON.stringify(this.decoded.header));
            const payload = JSON.parse(this.editedPayload || JSON.stringify(this.decoded.payload));

            const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
            const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
            
            const data = `${encodedHeader}.${encodedPayload}`;
            
            let signatureBase64 = '';
            
            // Se não há secret, usa assinatura fixa
            if (!secret || secret.trim() === '') {
                signatureBase64 = '1wfcqr7A5MmJi6oX6VgCNxHNsfo0Z0f_xr-MoVHLZTw';
            } else {
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
                signatureBase64 = btoa(String.fromCharCode(...signatureArray))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
            }

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



