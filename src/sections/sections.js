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
        let startX = 0;
        let scrollLeft = 0;
        let hasMoved = false;

        const handleMouseDown = (e) => {
            // Don't start drag if clicking on buttons
            if (e.target.classList.contains('close-tab') || e.target.classList.contains('rename-tab')) {
                return;
            }

            isDragging = true;
            hasMoved = false;
            startX = e.pageX - tabsContainer.offsetLeft;
            scrollLeft = tabsContainer.scrollLeft;
            tabElement.style.cursor = 'grabbing';
            tabsContainer.style.cursor = 'grabbing';
            tabsContainer.style.userSelect = 'none';
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const x = e.pageX - tabsContainer.offsetLeft;
            const walk = Math.abs(x - startX);
            
            // Only start dragging if moved more than 5px
            if (walk > 5) {
                hasMoved = true;
                const scrollAmount = (x - startX) * 2; // Scroll speed multiplier
                tabsContainer.scrollLeft = scrollLeft - scrollAmount;
            }
        };

        const handleMouseUp = (e) => {
            if (isDragging) {
                isDragging = false;
                tabElement.style.cursor = 'pointer';
                tabsContainer.style.cursor = 'default';
                tabsContainer.style.userSelect = '';
                
                // Mark if we dragged so click handler knows to ignore it
                if (hasMoved) {
                    tabElement.dataset.wasDragging = 'true';
                }
            }
        };

        const handleTouchStart = (e) => {
            if (e.target.classList.contains('close-tab') || e.target.classList.contains('rename-tab')) {
                return;
            }
            isDragging = true;
            hasMoved = false;
            startX = e.touches[0].pageX - tabsContainer.offsetLeft;
            scrollLeft = tabsContainer.scrollLeft;
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            const x = e.touches[0].pageX - tabsContainer.offsetLeft;
            const walk = Math.abs(x - startX);
            
            if (walk > 5) {
                hasMoved = true;
                const scrollAmount = (x - startX) * 2;
                tabsContainer.scrollLeft = scrollLeft - scrollAmount;
            }
        };

        const handleTouchEnd = () => {
            isDragging = false;
            hasMoved = false;
        };

        tabElement.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        tabElement.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);
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

