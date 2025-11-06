// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class SectionsManager {
    constructor(app) {
        this.app = app;
        this.currentRenamingSection = null;
    }

    createDefaultSection() {
        this.addSection('Section', 1);
    }

    addSection(title = 'New Section', id = null) {
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
        this.app.sections.push(section);
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

