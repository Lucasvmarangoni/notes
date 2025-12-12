// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class MarkdownProcessor {
    constructor() {
    };

    getCurrentLineText(element, range) {
        const container = range.startContainer;
        const parentElement = container.nodeType === Node.TEXT_NODE
            ? container.parentElement
            : container;
        const li = parentElement?.closest('li');

        if (li) {
            return '';
        }

        const rangeClone = range.cloneRange();
        rangeClone.selectNodeContents(element);
        rangeClone.setEnd(range.startContainer, range.startOffset);

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
            const listItems = noteContent.querySelectorAll('li');
            listItems.forEach(li => {
                const text = li.textContent.trim();
                if (!text || text === '*' || text === '* ' || text === '> ' || /^\d+\.\s*$/.test(text)) {
                    li.remove();
                }
            });

            const lists = noteContent.querySelectorAll('ul, ol');
            lists.forEach(list => {
                if (list.children.length === 0) {
                    list.remove();
                }
            });

            const checkboxes = noteContent.querySelectorAll('.checkbox-item');
            checkboxes.forEach(checkbox => {
                const text = checkbox.textContent.trim();
                if (!text || text === '> ') {
                    checkbox.remove();
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

    markdownToHTML(text) {
        const lines = text.split(/\r?\n/);
        let html = '';
        let currentList = null;
        let listType = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const isLastLine = i === lines.length - 1;

            if (trimmed.startsWith('* ') && trimmed.length > 2) {
                if (listType !== 'bullet') {
                    if (currentList) html += currentList;
                    currentList = '<ul>';
                    listType = 'bullet';
                }
                const textContent = trimmed.substring(2).trim();
                const escapedText = textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                currentList += `<li>${escapedText}</li>`;
            }
            else if (trimmed.match(/^\d+\.\s/) && trimmed.length > 3) {
                if (listType !== 'numbered') {
                    if (currentList) html += currentList;
                    currentList = '<ol>';
                    listType = 'numbered';
                }
                const textContent = trimmed.replace(/^\d+\.\s/, '').trim();
                const escapedText = textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                currentList += `<li>${escapedText}</li>`;
            }
            else if (trimmed.startsWith('> ') && trimmed.length > 2) {
                if (currentList) {
                    html += currentList + (listType === 'bullet' ? '</ul>' : '</ol>');
                    currentList = null;
                    listType = null;
                }
                const textContent = trimmed.substring(2).trim();
                const escapedText = textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += `<div class="checkbox-item"><input type="checkbox" class="markdown-checkbox"><span>${escapedText}</span></div>`;
            }
            else {
                if (currentList) {
                    html += currentList + (listType === 'bullet' ? '</ul>' : '</ol>');
                    currentList = null;
                    listType = null;
                }
                if (line.length > 0 || i === 0) {
                    const escapedLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    html += escapedLine;
                }
                if (!isLastLine) {
                    html += '<br>';
                }
            }
        }

        if (currentList) {
            html += currentList + (listType === 'bullet' ? '</ul>' : '</ol>');
        }

        return html;
    }

    processMarkdown(element, useHistory = false) {
        if (element.closest('li') || element.closest('.checkbox-item')) {
            return null;
        }

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
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

        textNodes.reverse().forEach(textNode => {
            const text = textNode.textContent;
            if (!text || text.trim().length === 0) return;

            const lines = text.split(/\r?\n/);
            let hasMarkdown = false;
            let markdownType = null;

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
                if (useHistory) {
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNode(textNode);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    const html = this.markdownToHTML(text);
                    document.execCommand('insertHTML', false, html);

                    setTimeout(() => {
                        const newSelection = window.getSelection();
                        if (newSelection.rangeCount > 0) {
                            const newRange = newSelection.getRangeAt(0);
                            const container = newRange.commonAncestorContainer;
                            const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;

                            const lists = element.querySelectorAll('ul, ol');
                            let lastLi = null;
                            if (lists.length > 0) {
                                const lastList = lists[lists.length - 1];
                                const items = lastList.querySelectorAll('li');
                                if (items.length > 0) {
                                    lastLi = items[items.length - 1];
                                }
                            }

                            const checkboxes = element.querySelectorAll('.checkbox-item');
                            let lastCheckbox = null;
                            if (checkboxes.length > 0) {
                                lastCheckbox = checkboxes[checkboxes.length - 1];
                            }

                            const targetElement = lastLi || lastCheckbox?.querySelector('span');
                            if (targetElement) {
                                const finalRange = document.createRange();
                                if (targetElement.tagName === 'SPAN') {
                                    if (targetElement.firstChild && targetElement.firstChild.nodeType === Node.TEXT_NODE) {
                                        const textNode = targetElement.firstChild;
                                        finalRange.setStart(textNode, textNode.textContent.length);
                                        finalRange.setEnd(textNode, textNode.textContent.length);
                                    } else {
                                        finalRange.selectNodeContents(targetElement);
                                        finalRange.collapse(false);
                                    }
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
                } else {
                    const fragment = document.createDocumentFragment();
                    let currentList = null;
                    let listType = null;

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const trimmed = line.trim();
                        const isLastLine = i === lines.length - 1;

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
                        }
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

                    if (currentList) {
                        fragment.appendChild(currentList);
                    }

                    if (textNode.parentNode) {
                        textNode.parentNode.replaceChild(fragment, textNode);
                    }
                }
            }
        });

        if (lastCreatedElement && !useHistory) {
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = document.createRange();

                    if (lastCreatedElement.tagName === 'SPAN') {
                        if (lastCreatedElement.firstChild && lastCreatedElement.firstChild.nodeType === Node.TEXT_NODE) {
                            const textNode = lastCreatedElement.firstChild;
                            range.setStart(textNode, textNode.textContent.length);
                            range.setEnd(textNode, textNode.textContent.length);
                        } else {
                            range.selectNodeContents(lastCreatedElement);
                            range.collapse(false);
                        }
                    } else {
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

