// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class NotesOverviewManager {
    constructor(app) {
        this.app = app;
        this.notesOverviewModal = null;
        this.notesSearchInput = null;
        this.notesListContainer = null;
    }

    init() {
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

        this.app.sections.forEach(section => {
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

            if (title.includes(term)) {
                item.classList.remove('hidden');

                const highlightedTitle = title.replace(
                    new RegExp(term, 'gi'),
                    match => `<mark class="highlight">${match}</mark>`
                );

                item.querySelector('.note-title').innerHTML = highlightedTitle;
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

        this.app.sectionsManager.setActiveSection(sectionId);

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

