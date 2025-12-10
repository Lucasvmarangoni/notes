// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

// Import all modules
import { Colors } from './core/colors.js';
import { JWTAnalyzer } from './jwt/jwt.js';
import { MarkdownProcessor } from './markdown/markdown.js';
import { SectionsManager } from './sections/sections.js';
import { ToolbarManager } from './toolbar/toolbar.js';
import { StorageManager } from './storage/storage.js';
import { AutoSaveManager } from './autosave/autosave.js';
import { NotesOverviewManager } from './notes-overview/notes-overview.js';
import { LayoutManager } from './layout/layout.js';
import { NotesManager } from './notes/notes.js';

// CSS modules are imported via <link> tags in index.html

// Main application class that coordinates all modules
class NotesApp {
    constructor() {
        // Initialize colors from core module
        this.color1 = Colors.color1;
        this.color2 = Colors.color2;
        this.color3 = Colors.color3;
        this.color4 = Colors.color4;
        this.default = Colors.default;
        this.colorPickerCurrentColor = Colors.default;

        // Application state
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
        this.isLoading = false;

        // Initialize modules
        this.markdownProcessor = new MarkdownProcessor();
        this.storageManager = new StorageManager(this);
        this.layoutManager = new LayoutManager();
        this.sectionsManager = new SectionsManager(this);
        this.notesManager = new NotesManager(this, this.markdownProcessor, this.storageManager);
        this.autoSaveManager = new AutoSaveManager(this, this.storageManager);
        this.toolbarManager = new ToolbarManager(this, this.markdownProcessor, this.layoutManager);
        this.notesOverviewManager = new NotesOverviewManager(this);
        
        // Make managers accessible
        this.app = this; // For backward compatibility

        // Initialize application
        this.notesOverviewManager.init();
        this.sectionsManager.createDefaultSection();
        this.setupKeyboardShortcuts();
        this.toolbarManager.createToolbar();
        this.autoSaveManager.init();
        this.layoutManager.updateLayoutPositions();
        this.notesManager.setupGlobalEventListeners();
        
        window.addEventListener('resize', () => this.layoutManager.updateLayoutPositions());

        if (!this._listenersSetup) {
            this.setupEventListeners();
            this._listenersSetup = true;
        }
    }

    setupEventListeners() {
        document.getElementById('add-section-btn').addEventListener('click', () => {
            this.sectionsManager.addSection();
            if (this.autoSaveEnabled) {
                this.storageManager.saveNotesToLocalStorage(true);
            }
        });

        document.getElementById('add-note-btn').addEventListener('click', () => {
            if (this.activeSection) {
                this.notesManager.addNote();
            } else {
                alert('Please create or select a section first.');
            }
        });

        document.getElementById('save-notes-btn').addEventListener('click', () => this.storageManager.saveNotesToLocalStorage());
        document.getElementById('load-notes-btn').addEventListener('click', () => this.storageManager.loadNotesFromLocalStorage());
        document.getElementById('export-btn').addEventListener('click', () => this.storageManager.exportNotes());
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.storageManager.importNotes(e));

        document.getElementById('section-rename-cancel').addEventListener('click', () => {
            this.sectionsManager.closeRenameModal();
        });
        document.getElementById('section-rename-confirm').addEventListener('click', () => {
            this.sectionsManager.confirmRenameSection();
        });

        // Window popup functions
        window.showPopup = function (wrapper) {
            const popup = wrapper.querySelector('.info-popup');
            const btn = wrapper.querySelector('.info-btn');

            const allPopups = document.querySelectorAll('.info-popup');
            allPopups.forEach(p => {
                if (p !== popup) {
                    p.style.display = "none";
                }
            });

            const infoMap = `
                <div style="line-height: 1.4;">
                    <p><strong>Add Notes</strong>: Create and manage notes easily and quickly.</p>
                    <p><strong>Add Section</strong>: Create and manage sections like browser tabs.</p>
                    <p><strong>Sections Scroll</strong>: When sections exceed the screen space, you can click and drag anywhere in the area to scroll horizontally.</p>   
                    <p><strong>Reorder Sections</strong>: Click and hold a section, drag it vertically first (up/down), then horizontally (left/right) to your desired location, and release.</p>                    <p><strong>List</strong>: All sections and notes listed in a hierarchical and organized view. It's also possible to transfer notes to other sections from here.</p>
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
                    <kbd>Enter</kbd>: In lists, creates a new item. Press <kbd>Enter</kbd> on empty items to exit the list.<br>                               
                </div>
            `;

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
                }

                if (rect.left < 0) {
                    popup.style.left = '0';
                    popup.style.right = 'auto';
                    popup.style.transform = 'translateX(0)';
                }
            }, 0);
        };

        window.hidePopup = function () {
            const allPopups = document.querySelectorAll('.info-popup');
            allPopups.forEach(p => p.style.display = "none");
        };

        window.togglePopup = function (wrapper, event) {
            if (event) {
                event.stopPropagation();
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

        window.addEventListener('beforeunload', () => {
            if (this.autoSaveEnabled) {
                this.storageManager.saveNotesToLocalStorage(true);
            }
        });

        // Global keydown handler for markdown processing
        document.addEventListener('keydown', (event) => {
            if (!event.target.classList.contains('note-content')) return;

            const noteContent = event.target;
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const container = range.startContainer;
            const lineText = this.markdownProcessor.getCurrentLineText(noteContent, range);
            
            if (event.key === 'Enter') {
                const parentElement = container.nodeType === Node.TEXT_NODE 
                    ? container.parentElement 
                    : container;
                const isInListItem = parentElement?.closest('li');
                const isInCheckbox = parentElement?.closest('.checkbox-item');
                
                if (isInListItem) {
                    const li = isInListItem;
                    const liText = li.textContent.trim();
                    
                    if (!liText || liText.length === 0) {
                        event.preventDefault();
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
                    
                    event.preventDefault();
                    const list = li.parentElement;
                    const newLi = document.createElement('li');
                    const newTextNode = document.createTextNode('');
                    newLi.appendChild(newTextNode);
                    list.insertBefore(newLi, li.nextSibling);
                    
                    const newRange = document.createRange();
                    newRange.setStart(newTextNode, 0);
                    newRange.setEnd(newTextNode, 0);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    return;
                }
                
                if (isInCheckbox) {
                    event.preventDefault();
                    const checkboxItem = isInCheckbox;
                    const label = checkboxItem.querySelector('span');
                    const cursorPos = selection.getRangeAt(0).startOffset;
                    const text = label.textContent;
                    
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
                        
                        const newRange = document.createRange();
                        newRange.selectNodeContents(newLabel);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    } else {
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
                        
                        const newRange = document.createRange();
                        newRange.selectNodeContents(newLabel);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                    return;
                }
                
                const trimmed = lineText.trim();
                
                if (trimmed.startsWith('* ')) {
                    event.preventDefault();
                    const textAfterBullet = trimmed.substring(2).trim();
                    
                    // Get the full current line text (including the "* ok" part)
                    const lineRange = document.createRange();
                    lineRange.selectNodeContents(noteContent);
                    lineRange.setEnd(range.startContainer, range.startOffset);
                    const textBeforeCursor = lineRange.toString();
                    const lines = textBeforeCursor.split('\n');
                    const currentLineText = lines[lines.length - 1] || '';
                    
                    // Select the current line text and replace with HTML
                    // This ensures the conversion is recorded as a single history operation
                    const walker = document.createTreeWalker(noteContent, NodeFilter.SHOW_TEXT, null);
                    let charCount = 0;
                    const lineStartPos = textBeforeCursor.length - currentLineText.length;
                    let found = false;
                    
                    while (walker.nextNode() && !found) {
                        const node = walker.currentNode;
                        const nodeStart = charCount;
                        const nodeEnd = charCount + node.textContent.length;
                        
                        if (nodeStart <= lineStartPos && nodeEnd > lineStartPos) {
                            const offsetInNode = lineStartPos - nodeStart;
                            const textFromOffset = node.textContent.substring(offsetInNode);
                            
                            // Check if this node contains the markdown line
                            if (textFromOffset.startsWith('* ')) {
                                // Find where the line ends (before cursor position)
                                const lineEndInNode = Math.min(offsetInNode + currentLineText.length, node.textContent.length);
                                
                                // Select and replace
                                const replaceRange = document.createRange();
                                replaceRange.setStart(node, offsetInNode);
                                replaceRange.setEnd(node, lineEndInNode);
                                const selection = window.getSelection();
                                selection.removeAllRanges();
                                selection.addRange(replaceRange);
                                
                                // Replace with HTML
                                const html = this.markdownProcessor.markdownToHTML(currentLineText);
                                document.execCommand('insertHTML', false, html);
                                found = true;
                            }
                        }
                        charCount = nodeEnd;
                    }
                    
                    // Fallback if not found
                    if (!found) {
                        this.markdownProcessor.processMarkdown(noteContent, true);
                    }
                    
                    setTimeout(() => {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const lists = noteContent.querySelectorAll('ul');
                            let targetLi = null;
                            
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
                                if (textAfterBullet && targetLi.textContent.trim() !== textAfterBullet) {
                                    targetLi.textContent = textAfterBullet;
                                }
                                
                                const range = document.createRange();
                                const liTextNode = targetLi.firstChild;
                                if (liTextNode && liTextNode.nodeType === Node.TEXT_NODE) {
                                    range.setStart(liTextNode, liTextNode.textContent.length);
                                    range.setEnd(liTextNode, liTextNode.textContent.length);
                                } else {
                                    if (targetLi.childNodes.length === 0) {
                                        const emptyTextNode = document.createTextNode('');
                                        targetLi.appendChild(emptyTextNode);
                                        range.setStart(emptyTextNode, 0);
                                        range.setEnd(emptyTextNode, 0);
                                    } else {
                                        range.selectNodeContents(targetLi);
                                        range.collapse(false);
                                    }
                                }
                                selection.removeAllRanges();
                                selection.addRange(range);
                                
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
                                document.execCommand('insertText', false, '\n* ');
                                this.markdownProcessor.processMarkdown(noteContent, true);
                            }
                        }
                    }, 50);
                    return;
                }
                
                const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
                if (numberedMatch) {
                    event.preventDefault();
                    const textAfterNumber = numberedMatch[2].trim();
                    
                    // Use history mode to record in undo stack
                    this.markdownProcessor.processMarkdown(noteContent, true);
                    
                    setTimeout(() => {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const lists = noteContent.querySelectorAll('ol');
                            let targetLi = null;
                            
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
                                if (textAfterNumber && targetLi.textContent.trim() !== textAfterNumber) {
                                    targetLi.textContent = textAfterNumber;
                                }
                                
                                const range = document.createRange();
                                const liTextNode = targetLi.firstChild;
                                if (liTextNode && liTextNode.nodeType === Node.TEXT_NODE) {
                                    range.setStart(liTextNode, liTextNode.textContent.length);
                                    range.setEnd(liTextNode, liTextNode.textContent.length);
                                } else {
                                    if (targetLi.childNodes.length === 0) {
                                        const emptyTextNode = document.createTextNode('');
                                        targetLi.appendChild(emptyTextNode);
                                        range.setStart(emptyTextNode, 0);
                                        range.setEnd(emptyTextNode, 0);
                                    } else {
                                        range.selectNodeContents(targetLi);
                                        range.collapse(false);
                                    }
                                }
                                selection.removeAllRanges();
                                selection.addRange(range);
                                
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
                                const nextNum = parseInt(numberedMatch[1]) + 1;
                                document.execCommand('insertText', false, `\n${nextNum}. `);
                                this.markdownProcessor.processMarkdown(noteContent, true);
                            }
                        }
                    }, 50);
                    return;
                }
                
                if (trimmed.startsWith('> ')) {
                    event.preventDefault();
                    const textAfterCheckbox = trimmed.substring(2).trim();
                    
                    // Use history mode to record in undo stack
                    this.markdownProcessor.processMarkdown(noteContent, true);
                    
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
                                document.execCommand('insertText', false, '\n> ');
                                this.markdownProcessor.processMarkdown(noteContent, true);
                            }
                        }
                    }, 50);
                    return;
                }
                
                this.markdownProcessor.removeEmptyBullets(noteContent);
            }

            if (event.key === 'Tab') {
                event.preventDefault();

                const sel = window.getSelection();
                if (!sel.rangeCount) return;
                const range = sel.getRangeAt(0);

                // Handle Shift+Tab for removing indentation
                if (event.shiftKey) {
                    this.removeIndentation(noteContent, range, sel);
                    return;
                }

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

            // Handle Backspace to remove indentation at line start
            if (event.key === 'Backspace' && !event.target.closest('li') && !event.target.closest('.checkbox-item')) {
                const sel = window.getSelection();
                if (!sel.rangeCount || !sel.isCollapsed) return;
                
                const range = sel.getRangeAt(0);
                const container = range.startContainer;
                const offset = range.startOffset;
                
                // Check if we're in a wrapper div created by Tab (for selected text indentation)
                const parentElement = container.nodeType === Node.TEXT_NODE 
                    ? container.parentElement 
                    : container;
                const wrapperDiv = parentElement?.closest('div[style*="padding-left"]');
                
                if (wrapperDiv && wrapperDiv.style.paddingLeft) {
                    // Check if cursor is at the start of wrapper content
                    const testRange = document.createRange();
                    testRange.selectNodeContents(wrapperDiv);
                    testRange.collapse(true);
                    
                    if (container === testRange.startContainer && offset === testRange.startOffset) {
                        event.preventDefault();
                        
                        // Unwrap: move all children out of wrapper
                        const parent = wrapperDiv.parentNode;
                        while (wrapperDiv.firstChild) {
                            parent.insertBefore(wrapperDiv.firstChild, wrapperDiv);
                        }
                        wrapperDiv.remove();
                        
                        // Place cursor at the unwrapped content position
                        const newRange = document.createRange();
                        if (parent.firstChild && parent.firstChild.nodeType === Node.TEXT_NODE) {
                            newRange.setStart(parent.firstChild, 0);
                            newRange.setEnd(parent.firstChild, 0);
                        } else {
                            newRange.setStart(parent, 0);
                            newRange.setEnd(parent, 0);
                        }
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                        return;
                    }
                }
                
                // Handle spaces-based indentation
                // Simple approach: if line starts with spaces and we're pressing backspace at the start, remove all spaces
                const lineText = this.markdownProcessor.getCurrentLineText(noteContent, range);
                
                if (/^\s+/.test(lineText)) {
                    const leadingSpaces = lineText.match(/^\s+/)[0];
                    
                    // Create a range from element start to cursor to find line start position
                    const fullRange = document.createRange();
                    fullRange.selectNodeContents(noteContent);
                    fullRange.setEnd(range.startContainer, range.startOffset);
                    
                    const textUpToCursor = fullRange.toString();
                    const lines = textUpToCursor.split('\n');
                    const currentLineUpToCursor = lines[lines.length - 1] || '';
                    
                    // Check if cursor is at or near the end of leading spaces
                    // This means we're at the start of the line content (after indentation)
                    const spacesLength = leadingSpaces.length;
                    const cursorPosInLine = currentLineUpToCursor.length;
                    
                    // If cursor is right after spaces (within 2 chars tolerance), remove all spaces
                    if (cursorPosInLine >= spacesLength - 2 && cursorPosInLine <= spacesLength + 2) {
                        event.preventDefault();
                        
                        // Use a helper to remove leading spaces from the current line
                        this.removeLeadingSpacesFromLine(noteContent, range, sel, leadingSpaces);
                        return;
                    }
                }
            }
        });
    }

    removeLeadingSpacesFromLine(noteContent, range, sel, spacesToRemove) {
        // Find the line start in the DOM and remove the leading spaces
        const fullRange = document.createRange();
        fullRange.selectNodeContents(noteContent);
        fullRange.setEnd(range.startContainer, range.startOffset);
        
        const textUpToCursor = fullRange.toString();
        const lines = textUpToCursor.split('\n');
        const currentLineUpToCursor = lines[lines.length - 1] || '';
        const lineStartCharPos = textUpToCursor.length - currentLineUpToCursor.length;
        
        // Walk through text nodes to find and remove the spaces
        const walker = document.createTreeWalker(
            noteContent,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let charCount = 0;
        let found = false;
        
        while (walker.nextNode() && !found) {
            const node = walker.currentNode;
            const nodeText = node.textContent;
            const nodeStart = charCount;
            const nodeEnd = charCount + nodeText.length;
            
            // Check if line start falls within this node
            if (nodeStart <= lineStartCharPos && nodeEnd > lineStartCharPos) {
                const offsetInNode = lineStartCharPos - nodeStart;
                const textFromLineStart = nodeText.substring(offsetInNode);
                
                // Check if it starts with spaces
                if (/^\s+/.test(textFromLineStart)) {
                    const spacesMatch = textFromLineStart.match(/^(\s+)/);
                    if (spacesMatch) {
                        const spaces = spacesMatch[1];
                        const spacesEnd = offsetInNode + spaces.length;
                        
                        // Remove the spaces
                        const newText = nodeText.substring(0, offsetInNode) + 
                                      nodeText.substring(spacesEnd);
                        node.textContent = newText;
                        
                        // Set cursor to where spaces were removed
                        const newRange = document.createRange();
                        newRange.setStart(node, offsetInNode);
                        newRange.setEnd(node, offsetInNode);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                        found = true;
                    }
                }
            }
            
            charCount = nodeEnd;
        }
        
        // Fallback: if we didn't find it with walker, try direct manipulation
        if (!found && range.startContainer.nodeType === Node.TEXT_NODE) {
            const container = range.startContainer;
            const text = container.textContent;
            
            // Check if this node contains the spaces at the beginning
            if (text.startsWith(spacesToRemove)) {
                container.textContent = text.substring(spacesToRemove.length);
                
                const newRange = document.createRange();
                newRange.setStart(container, 0);
                newRange.setEnd(container, 0);
                sel.removeAllRanges();
                sel.addRange(newRange);
            }
        }
    }

    removeIndentation(noteContent, range, sel) {
        // Check if we're in a wrapper div created by Tab
        const container = range.startContainer;
        const parentElement = container.nodeType === Node.TEXT_NODE 
            ? container.parentElement 
            : container;
        const wrapperDiv = parentElement?.closest('div[style*="padding-left"]');
        
        if (wrapperDiv && wrapperDiv.style.paddingLeft) {
            // Remove the wrapper div and extract its content
            const content = wrapperDiv.innerHTML;
            
            // Create a temporary container to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            // Replace wrapper with its content
            const fragment = document.createDocumentFragment();
            while (wrapperDiv.firstChild) {
                fragment.appendChild(wrapperDiv.firstChild);
            }
            wrapperDiv.parentNode.replaceChild(fragment, wrapperDiv);
            
            // Set cursor to the start of the extracted content
            const newRange = document.createRange();
            if (fragment.firstChild) {
                if (fragment.firstChild.nodeType === Node.TEXT_NODE) {
                    newRange.setStart(fragment.firstChild, 0);
                    newRange.setEnd(fragment.firstChild, 0);
                } else {
                    newRange.setStartBefore(fragment.firstChild);
                    newRange.setEndBefore(fragment.firstChild);
                }
            }
            sel.removeAllRanges();
            if (newRange.startContainer) {
                sel.addRange(newRange);
            }
            return;
        }
        
        // Handle text-based indentation (spaces)
        if (sel.isCollapsed) {
            const lineText = this.markdownProcessor.getCurrentLineText(noteContent, range);
            const leadingSpacesMatch = lineText.match(/^(\s+)/);
            
            if (leadingSpacesMatch) {
                const spaces = leadingSpacesMatch[1];
                // Remove up to 4 spaces (one tab worth)
                const spacesToRemove = spaces.length >= 4 ? spaces.substring(0, 4) : spaces;
                
                // Find where these spaces are in the DOM
                const lineStartRange = document.createRange();
                lineStartRange.selectNodeContents(noteContent);
                lineStartRange.setEnd(range.startContainer, range.startOffset);
                
                const beforeText = lineStartRange.toString();
                const lines = beforeText.split('\n');
                const currentLine = lines[lines.length - 1] || '';
                const currentLineStart = beforeText.length - currentLine.length;
                
                // Walk through text nodes to find and remove the spaces
                const walker = document.createTreeWalker(
                    noteContent,
                    NodeFilter.SHOW_TEXT,
                    null
                );
                
                let charCount = 0;
                let found = false;
                
                while (walker.nextNode() && !found) {
                    const node = walker.currentNode;
                    const nodeText = node.textContent;
                    const nodeStart = charCount;
                    const nodeEnd = charCount + nodeText.length;
                    
                    // Check if the line start is in this node
                    if (nodeStart <= currentLineStart && nodeEnd > currentLineStart) {
                        const offsetInNode = currentLineStart - nodeStart;
                        const textFromLineStart = nodeText.substring(offsetInNode);
                        
                        // Check if it starts with spaces
                        if (/^\s/.test(textFromLineStart)) {
                            const spacesInNode = textFromLineStart.match(/^(\s+)/)[1];
                            const removeCount = Math.min(spacesToRemove.length, spacesInNode.length);
                            
                            // Remove the spaces
                            const newText = nodeText.substring(0, offsetInNode) + 
                                          nodeText.substring(offsetInNode + removeCount);
                            node.textContent = newText;
                            
                            // Set cursor to the start of the line (after removed spaces)
                            const newRange = document.createRange();
                            newRange.setStart(node, offsetInNode);
                            newRange.setEnd(node, offsetInNode);
                            sel.removeAllRanges();
                            sel.addRange(newRange);
                            found = true;
                        }
                    }
                    
                    charCount = nodeEnd;
                }
            }
        } else {
            // Handle selected text - remove indentation from each line
            const selectedText = range.toString();
            const lines = selectedText.split('\n');
            const modifiedLines = lines.map(line => {
                if (/^\s{1,4}/.test(line)) {
                    // Remove up to 4 leading spaces
                    return line.replace(/^\s{1,4}/, '');
                }
                return line;
            });
            const newText = modifiedLines.join('\n');
            
            range.deleteContents();
            const textNode = document.createTextNode(newText);
            range.insertNode(textNode);
            
            // Select the inserted text
            const newRange = document.createRange();
            newRange.selectNodeContents(textNode);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
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
                document.execCommand('removeFormat', false, null);
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
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(codeSpan);
                }
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

    // Delegate methods to managers
    addSection(title, id) {
        return this.sectionsManager.addSection(title, id);
    }

    addNote(title, content, x, y, width, height, style, id, sectionId) {
        return this.notesManager.addNote(title, content, x, y, width, height, style, id, sectionId);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const notesApp = new NotesApp();
    window.notesApp = notesApp; // Make available globally for debugging
    
    // Initialize JWT Analyzer
    const jwtAnalyzer = new JWTAnalyzer();
    window.jwtAnalyzer = jwtAnalyzer; // Make available globally for debugging
});
