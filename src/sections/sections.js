// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class SectionsManager {
    constructor(app) {
        this.app = app;
        this.currentRenamingSection = null;
        this.setupDragToScrollForExistingTabs();
    }

    setupDragToScrollForExistingTabs() {
        // Setup drag-to-scroll for tabs that might be loaded from storage
        // This will be called after DOM is ready
        setTimeout(() => {
            const tabsContainer = document.getElementById('sections-tabs');
            if (tabsContainer) {
                const tabs = tabsContainer.querySelectorAll('.section-tab');
                tabs.forEach(tab => {
                    this.setupDragToScroll(tab, tabsContainer);
                });
            }
        }, 100);
    }

    createDefaultSection() {
        this.addSection('Section', 1);
    }

    addSection(title = 'New Section', id = null, setAsActive = true) {
        const numericIds = this.app.sections
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

        const tabsContainer = document.getElementById('sections-tabs');
        tabsContainer.appendChild(tabElement);
        document.getElementById('sections-content').appendChild(contentElement);

        // Setup drag-to-scroll functionality
        this.setupDragToScroll(tabElement, tabsContainer);

        tabElement.addEventListener('click', (e) => {
            // Only activate section if this wasn't a drag operation
            if (!tabElement.dataset.wasDragging && 
                !e.target.classList.contains('close-tab') && 
                !e.target.classList.contains('rename-tab')) {
                const sid = Number(tabElement.dataset.sectionId);
                this.setActiveSection(sid);
            }
            // Reset flag
            delete tabElement.dataset.wasDragging;
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
        this.app.sections.push(section);
        
        if (setAsActive) {
            this.setActiveSection(section.id);
        }

        return section;
    }

    setupDragToScroll(tabElement, tabsContainer) {
        // Check if drag-to-scroll is already set up for this tab
        if (tabElement.dataset.dragScrollSetup === 'true') {
            return;
        }
        tabElement.dataset.dragScrollSetup = 'true';

        let isDragging = false;
        let isReordering = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let hasMoved = false;
        let dragType = null; // 'scroll' or 'reorder'

        const handleMouseDown = (e) => {
            // Don't start drag if clicking on buttons
            if (e.target.classList.contains('close-tab') || e.target.classList.contains('rename-tab')) {
                return;
            }

            isDragging = true;
            isReordering = false;
            hasMoved = false;
            dragType = null;
            startX = e.pageX;
            startY = e.pageY;
            scrollLeft = tabsContainer.scrollLeft;
            tabElement.style.cursor = 'grabbing';
            tabsContainer.style.cursor = 'grabbing';
            tabsContainer.style.userSelect = 'none';
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.pageX - startX;
            const deltaY = Math.abs(e.pageY - startY);
            const deltaXAbs = Math.abs(deltaX);

            // Determine drag type based on movement direction
            if (dragType === null) {
                if (deltaXAbs > 5 || deltaY > 5) {
                    // If vertical movement is more significant, it's reordering
                    if (deltaY > deltaXAbs) {
                        dragType = 'reorder';
                        isReordering = true;
                        this.startReorderTab(tabElement, e);
                    } else {
                        dragType = 'scroll';
                    }
                }
            }

            if (dragType === 'scroll' && deltaXAbs > 5) {
                hasMoved = true;
                const scrollAmount = deltaX * 2; // Scroll speed multiplier
                tabsContainer.scrollLeft = scrollLeft - scrollAmount;
            } else if (dragType === 'reorder' && isReordering) {
                hasMoved = true;
                this.updateReorderTab(tabElement, e);
            }
        };

        const handleMouseUp = (e) => {
            if (isDragging) {
                isDragging = false;
                tabElement.style.cursor = 'pointer';
                tabsContainer.style.cursor = 'default';
                tabsContainer.style.userSelect = '';
                
                if (isReordering) {
                    this.endReorderTab(tabElement, e);
                    isReordering = false;
                }
                
                // Mark if we dragged so click handler knows to ignore it
                if (hasMoved) {
                    tabElement.dataset.wasDragging = 'true';
                }
                
                dragType = null;
            }
        };

        const handleTouchStart = (e) => {
            if (e.target.classList.contains('close-tab') || e.target.classList.contains('rename-tab')) {
                return;
            }
            isDragging = true;
            isReordering = false;
            hasMoved = false;
            dragType = null;
            startX = e.touches[0].pageX;
            startY = e.touches[0].pageY;
            scrollLeft = tabsContainer.scrollLeft;
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].pageX - startX;
            const deltaY = Math.abs(e.touches[0].pageY - startY);
            const deltaXAbs = Math.abs(deltaX);

            if (dragType === null) {
                if (deltaXAbs > 5 || deltaY > 5) {
                    if (deltaY > deltaXAbs) {
                        dragType = 'reorder';
                        isReordering = true;
                        this.startReorderTab(tabElement, e.touches[0]);
                    } else {
                        dragType = 'scroll';
                    }
                }
            }

            if (dragType === 'scroll' && deltaXAbs > 5) {
                hasMoved = true;
                const scrollAmount = deltaX * 2;
                tabsContainer.scrollLeft = scrollLeft - scrollAmount;
            } else if (dragType === 'reorder' && isReordering) {
                hasMoved = true;
                this.updateReorderTab(tabElement, e.touches[0]);
            }
        };

        const handleTouchEnd = (e) => {
            if (isDragging) {
                if (isReordering) {
                    this.endReorderTab(tabElement, e.touches ? e.touches[0] : e.changedTouches[0]);
                    isReordering = false;
                }
                isDragging = false;
                hasMoved = false;
                dragType = null;
            }
        };

        tabElement.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        tabElement.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);
    }

    startReorderTab(tabElement, e) {
        const tabsContainer = document.getElementById('sections-tabs');
        tabElement.style.opacity = '0.5';
        tabElement.style.zIndex = '1000';
        tabElement.style.position = 'relative';
        tabElement.classList.add('dragging');
        
        // Create placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'section-tab-placeholder';
        placeholder.style.width = `${tabElement.offsetWidth}px`;
        placeholder.style.height = `${tabElement.offsetHeight}px`;
        placeholder.style.marginRight = '5px';
        tabElement.dataset.placeholder = 'true';
        tabElement.parentNode.insertBefore(placeholder, tabElement);
    }

    updateReorderTab(tabElement, e) {
        const tabsContainer = document.getElementById('sections-tabs');
        const placeholder = tabsContainer.querySelector('.section-tab-placeholder');
        
        if (!placeholder) return;

        const mouseX = (e.pageX || e.clientX || 0);
        const tabs = Array.from(tabsContainer.querySelectorAll('.section-tab:not(.section-tab-placeholder)'));
        let targetTab = null;

        for (let tab of tabs) {
            if (tab === tabElement) continue;
            const rect = tab.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            
            if (mouseX < centerX) {
                targetTab = tab;
                break;
            }
        }

        if (targetTab && placeholder.nextSibling !== targetTab) {
            tabsContainer.insertBefore(placeholder, targetTab);
        } else if (!targetTab && placeholder.nextSibling) {
            tabsContainer.appendChild(placeholder);
        }
    }

    endReorderTab(tabElement, e) {
        const tabsContainer = document.getElementById('sections-tabs');
        const placeholder = tabsContainer.querySelector('.section-tab-placeholder');
        
        if (placeholder) {
            tabsContainer.insertBefore(tabElement, placeholder);
            placeholder.remove();
        }
        
        tabElement.style.opacity = '';
        tabElement.style.zIndex = '';
        tabElement.style.position = '';
        tabElement.classList.remove('dragging');
        delete tabElement.dataset.placeholder;

        // Update sections array order to match DOM order
        this.updateSectionsOrder();
    }

    updateSectionsOrder() {
        const tabsContainer = document.getElementById('sections-tabs');
        const tabs = Array.from(tabsContainer.querySelectorAll('.section-tab:not(.section-tab-placeholder)'));
        const newOrder = tabs.map(tab => Number(tab.dataset.sectionId));
        
        // Reorder sections array
        const reorderedSections = [];
        newOrder.forEach(sectionId => {
            const section = this.app.sections.find(s => s.id === sectionId);
            if (section) {
                reorderedSections.push(section);
            }
        });
        
        // Check if order actually changed
        let orderChanged = false;
        if (reorderedSections.length === this.app.sections.length) {
            for (let i = 0; i < reorderedSections.length; i++) {
                if (reorderedSections[i].id !== this.app.sections[i].id) {
                    orderChanged = true;
                    break;
                }
            }
        }
        
        if (orderChanged) {
            this.app.sections = reorderedSections;
            
            // Reorder content elements by moving them to correct positions
            const contentContainer = document.getElementById('sections-content');
            
            // Build array of content elements in new order
            const contentsInNewOrder = [];
            newOrder.forEach(sectionId => {
                const content = contentContainer.querySelector(`.section-content[data-section-id="${sectionId}"]`);
                if (content) {
                    contentsInNewOrder.push(content);
                }
            });
            
            // Move each content to its correct position (without removing from DOM first)
            contentsInNewOrder.forEach((content, index) => {
                const currentPosition = Array.from(contentContainer.children).indexOf(content);
                if (currentPosition !== index) {
                    // Get reference node (next sibling in new order, or null if should be last)
                    const referenceNode = index < contentsInNewOrder.length - 1 
                        ? contentsInNewOrder[index + 1] 
                        : null;
                    
                    if (referenceNode) {
                        contentContainer.insertBefore(content, referenceNode);
                    } else {
                        contentContainer.appendChild(content);
                    }
                }
            });

            // Save if auto-save is enabled
            if (this.app.autoSaveEnabled) {
                this.app.storageManager.saveNotesToLocalStorage(true);
            }
        }
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

        this.app.activeSection = this.app.sections.find(section => section.id === sectionId);
        this.app.activeSectionId = sectionId;
    }

    deleteSection(sectionId) {
        if (this.app.sections.length <= 1) {
            alert('You cannot delete the only existing section.');
            return;
        }

        const tabElement = document.querySelector(`.section-tab[data-section-id="${sectionId}"]`);
        const contentElement = document.querySelector(`.section-content[data-section-id="${sectionId}"]`);

        tabElement.remove();
        contentElement.remove();

        this.app.sections = this.app.sections.filter(section => section.id !== sectionId);

        if (this.app.activeSection && this.app.activeSection.id === sectionId) {
            this.setActiveSection(this.app.sections[0].id);
        }

        if (this.app.autoSaveEnabled) {
            this.app.storageManager.saveNotesToLocalStorage(true);
        }
    }

    openRenameModal(sectionId) {
        const section = this.app.sections.find(section => section.id === sectionId);
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
            const section = this.app.sections.find(section => section.id === this.currentRenamingSection);
            if (section) {
                section.title = newTitle;

                const tabElement = document.querySelector(`.section-tab[data-section-id="${this.currentRenamingSection}"] .tab-title`);
                tabElement.textContent = newTitle;
            }
        }

        this.closeRenameModal();
    }
}

