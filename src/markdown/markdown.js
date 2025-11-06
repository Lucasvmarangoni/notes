// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class MarkdownProcessor {
    constructor() {
        // Constructor if needed
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
}

