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
            sectionGroup.dataset.sectionId = section.id;

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
                noteItem.addEventListener('click', (e) => {
                    if (!noteItem.dataset.wasDragging) {
                        this.navigateToNote(section.id, note.id);
                    }
                    delete noteItem.dataset.wasDragging;
                });
                this.setupNoteDrag(noteItem, section.id, note.id);

                sectionNotes.appendChild(noteItem);
            });

            sectionGroup.appendChild(sectionHeader);
            sectionGroup.appendChild(sectionNotes);
            this.notesListContainer.appendChild(sectionGroup);

            this.setupSectionDrag(sectionGroup, section.id);
        });
    }

    setupSectionDrag(sectionGroup, sectionId) {
        sectionGroup.draggable = true;
        const sectionHeader = sectionGroup.querySelector('.section-header');
        const sectionNotes = sectionGroup.querySelector('.section-notes');

        if (!window._currentDragData) {
            window._currentDragData = null;
        }

        sectionHeader.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('notes-counter')) {
                e.preventDefault();
                return;
            }

            sectionGroup.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', `section-${sectionId}`);
            e.dataTransfer.setData('application/x-section-id', sectionId.toString());

            window._currentDragData = `section-${sectionId}`;

            const placeholder = document.createElement('div');
            placeholder.className = 'section-group-placeholder';
            placeholder.style.height = `${sectionGroup.offsetHeight}px`;
            placeholder.style.marginBottom = '10px';
            sectionGroup.parentNode.insertBefore(placeholder, sectionGroup);
        });

        sectionHeader.addEventListener('dragend', (e) => {
            sectionGroup.style.opacity = '';
            document.querySelectorAll('.section-group-placeholder').forEach(p => p.remove());
            document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
            window._currentDragData = null;
        });

        sectionGroup.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('application/x-section-id')) {
                e.preventDefault();
                e.stopPropagation();

                let dragSectionId = null;
                try {
                    const textData = e.dataTransfer.getData('text/plain');
                    const appData = e.dataTransfer.getData('application/x-section-id');

                    if (textData && textData.startsWith('section-')) {
                        dragSectionId = Number(textData.replace('section-', ''));
                    } else if (appData) {
                        dragSectionId = Number(appData);
                    } else if (window._currentDragData && window._currentDragData.startsWith('section-')) {
                        dragSectionId = Number(window._currentDragData.replace('section-', ''));
                    }
                } catch (err) {
                    if (window._currentDragData && window._currentDragData.startsWith('section-')) {
                        dragSectionId = Number(window._currentDragData.replace('section-', ''));
                    }
                }

                if (dragSectionId !== null && dragSectionId !== sectionId) {
                    e.dataTransfer.dropEffect = 'move';

                    const rect = sectionGroup.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;

                    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

                    const indicator = document.createElement('div');
                    indicator.className = 'drop-indicator';
                    indicator.style.height = '2px';
                    indicator.style.background = '#5a7552';
                    indicator.style.margin = '2px 0';
                    if (e.clientY < midpoint) {
                        sectionGroup.parentNode.insertBefore(indicator, sectionGroup);
                    } else {
                        sectionGroup.parentNode.insertBefore(indicator, sectionGroup.nextSibling);
                    }
                }
            }
        });

        sectionGroup.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            let dragSectionId = null;
            try {
                const textData = e.dataTransfer.getData('text/plain');
                const appData = e.dataTransfer.getData('application/x-section-id');

                if (textData && textData.startsWith('section-')) {
                    dragSectionId = Number(textData.replace('section-', ''));
                } else if (appData) {
                    dragSectionId = Number(appData);
                } else if (window._currentDragData && window._currentDragData.startsWith('section-')) {
                    dragSectionId = Number(window._currentDragData.replace('section-', ''));
                }
            } catch (err) {
                if (window._currentDragData && window._currentDragData.startsWith('section-')) {
                    dragSectionId = Number(window._currentDragData.replace('section-', ''));
                }
            }

            if (dragSectionId !== null && dragSectionId !== sectionId) {
                this.reorderSection(dragSectionId, sectionId, e.clientY);
            }

            document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
            window._currentDragData = null;
        });

        sectionGroup.addEventListener('dragleave', (e) => {
            if (!sectionGroup.contains(e.relatedTarget)) {
                document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
            }
        });

        sectionHeader.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('text/plain')) {
                try {
                    let data = e.dataTransfer.getData('text/plain');
                    if (!data && window._currentDragData) {
                        data = window._currentDragData;
                    }

                    if (data && data.startsWith('note-')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';

                        const parts = data.split('-');
                        const sourceSectionId = Number(parts[parts.length - 1]);

                        if (sourceSectionId !== sectionId) {
                            document.querySelectorAll('.drop-indicator').forEach(ind => {
                                if (ind.parentNode === sectionNotes) ind.remove();
                            });

                            if (!sectionNotes.querySelector('.drop-indicator')) {
                                const indicator = document.createElement('div');
                                indicator.className = 'drop-indicator';
                                indicator.style.height = '2px';
                                indicator.style.background = '#5a7552';
                                sectionNotes.appendChild(indicator);
                            }
                        }
                    }
                } catch (err) {
                }
            }
        });

        sectionHeader.addEventListener('drop', (e) => {
            if (e.dataTransfer.types.includes('text/plain')) {
                try {
                    let data = e.dataTransfer.getData('text/plain');
                    if (!data && window._currentDragData) {
                        data = window._currentDragData;
                    }

                    if (data && data.startsWith('note-')) {
                        e.preventDefault();
                        e.stopPropagation();

                        const parts = data.split('-');
                        const noteId = Number(parts[1]);
                        const sourceSectionId = Number(parts[parts.length - 1]);
                        const targetSectionId = sectionId;

                        if (sourceSectionId !== targetSectionId) {
                            this.moveNoteToSection(noteId, sourceSectionId, targetSectionId);
                        }

                        document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
                        window._currentDragData = null;
                    }
                } catch (err) {
                }
            }
        });
    }

    setupNoteDrag(noteItem, sectionId, noteId) {
        noteItem.draggable = true;

        noteItem.addEventListener('dragstart', (e) => {
            noteItem.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', `note-${noteId}-${sectionId}`);
            e.dataTransfer.setData('application/x-note-id', noteId.toString());
            e.dataTransfer.setData('application/x-section-id', sectionId.toString());

            window._currentDragData = `note-${noteId}-${sectionId}`;
        });

        noteItem.addEventListener('dragend', (e) => {
            noteItem.style.opacity = '';
            document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
            window._currentDragData = null;
        });

        const sectionGroup = noteItem.closest('.section-group');
        if (sectionGroup) {
            const sectionNotes = sectionGroup.querySelector('.section-notes');

            if (!sectionNotes.dataset.dragSetup) {
                sectionNotes.dataset.dragSetup = 'true';

                sectionNotes.addEventListener('dragover', (e) => {
                    if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('application/x-note-id')) {
                        try {
                            let data = e.dataTransfer.getData('text/plain');
                            if (!data) {
                                try {
                                    const noteId = e.dataTransfer.getData('application/x-note-id');
                                    const sourceSectionId = e.dataTransfer.getData('application/x-section-id');
                                    if (noteId && sourceSectionId) {
                                        data = `note-${noteId}-${sourceSectionId}`;
                                    }
                                } catch (e2) { }
                            }

                            if (!data && window._currentDragData) {
                                data = window._currentDragData;
                            }

                            if (data && data.startsWith('note-')) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';

                                const parts = data.split('-');
                                const sourceSectionId = Number(parts[parts.length - 1]);
                                const targetSectionId = Number(sectionGroup.dataset.sectionId);

                                if (sourceSectionId !== targetSectionId) {
                                    document.querySelectorAll('.drop-indicator').forEach(ind => {
                                        if (ind.parentNode === sectionNotes) ind.remove();
                                    });

                                    if (!sectionNotes.querySelector('.drop-indicator')) {
                                        const indicator = document.createElement('div');
                                        indicator.className = 'drop-indicator';
                                        indicator.style.height = '2px';
                                        indicator.style.background = '#5a7552';
                                        sectionNotes.appendChild(indicator);
                                    }
                                }
                            }
                        } catch (err) {
                        }
                    }
                });

                sectionNotes.addEventListener('drop', (e) => {
                    if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('application/x-note-id')) {
                        try {
                            e.preventDefault();
                            e.stopPropagation();

                            let data = e.dataTransfer.getData('text/plain');
                            if (!data) {
                                try {
                                    const noteId = e.dataTransfer.getData('application/x-note-id');
                                    const sourceSectionId = e.dataTransfer.getData('application/x-section-id');
                                    if (noteId && sourceSectionId) {
                                        data = `note-${noteId}-${sourceSectionId}`;
                                    }
                                } catch (e2) { }
                            }

                            if (!data && window._currentDragData) {
                                data = window._currentDragData;
                            }

                            if (data && data.startsWith('note-')) {
                                const parts = data.split('-');
                                const noteId = Number(parts[1]);
                                const sourceSectionId = Number(parts[parts.length - 1]);
                                const targetSectionId = Number(sectionGroup.dataset.sectionId);

                                if (sourceSectionId !== targetSectionId) {
                                    this.moveNoteToSection(noteId, sourceSectionId, targetSectionId);
                                }
                            }
                        } catch (err) {
                        }
                    }

                    document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
                    window._currentDragData = null;
                });
            }
        }

        noteItem.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('application/x-note-id')) {
                try {
                    let data = e.dataTransfer.getData('text/plain');
                    if (!data) {
                        try {
                            const noteId = e.dataTransfer.getData('application/x-note-id');
                            const sourceSectionId = e.dataTransfer.getData('application/x-section-id');
                            if (noteId && sourceSectionId) {
                                data = `note-${noteId}-${sourceSectionId}`;
                            }
                        } catch (e2) { }
                    }

                    if (!data && window._currentDragData) {
                        data = window._currentDragData;
                    }

                    if (data && data.startsWith('note-')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';

                        const rect = noteItem.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;

                        document.querySelectorAll('.drop-indicator').forEach(ind => {
                            if (ind.parentNode === noteItem.parentNode) ind.remove();
                        });

                        const indicator = document.createElement('div');
                        indicator.className = 'drop-indicator';
                        indicator.style.height = '2px';
                        indicator.style.background = '#5a7552';

                        if (e.clientY < midpoint) {
                            noteItem.parentNode.insertBefore(indicator, noteItem);
                        } else {
                            noteItem.parentNode.insertBefore(indicator, noteItem.nextSibling);
                        }
                    }
                } catch (err) {
                }
            }
        });

        noteItem.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                let data = e.dataTransfer.getData('text/plain');
                if (!data) {
                    try {
                        const noteId = e.dataTransfer.getData('application/x-note-id');
                        const sourceSectionId = e.dataTransfer.getData('application/x-section-id');
                        if (noteId && sourceSectionId) {
                            data = `note-${noteId}-${sourceSectionId}`;
                        }
                    } catch (e2) { }
                }

                if (!data && window._currentDragData) {
                    data = window._currentDragData;
                }

                if (data && data.startsWith('note-')) {
                    const parts = data.split('-');
                    const dragNoteId = Number(parts[1]);
                    const dragSectionId = Number(parts[parts.length - 1]);
                    const currentSectionId = Number(noteItem.dataset.sectionId);
                    const currentNoteId = Number(noteItem.dataset.noteId);

                    if (dragNoteId === currentNoteId) return;

                    if (dragSectionId === currentSectionId) {
                        this.reorderNoteInSection(dragNoteId, currentNoteId, currentSectionId);
                    } else {
                        this.moveNoteToSection(dragNoteId, dragSectionId, currentSectionId);
                    }
                }
            } catch (err) {
            }

            document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
            noteItem.dataset.wasDragging = 'true';
            window._currentDragData = null;
        });
    }

    reorderSection(dragSectionId, targetSectionId, dropY) {
        const dragSection = this.app.sections.find(s => s.id === dragSectionId);
        const targetSection = this.app.sections.find(s => s.id === targetSectionId);

        if (!dragSection || !targetSection) return;

        const dragIndex = this.app.sections.indexOf(dragSection);
        const targetIndex = this.app.sections.indexOf(targetSection);

        this.app.sections.splice(dragIndex, 1);

        const targetGroup = document.querySelector(`.section-group[data-section-id="${targetSectionId}"]`);
        const targetRect = targetGroup.getBoundingClientRect();
        const midpoint = targetRect.top + targetRect.height / 2;

        let newIndex;
        if (dropY < midpoint) {
            newIndex = targetIndex > dragIndex ? targetIndex - 1 : targetIndex;
        } else {
            newIndex = targetIndex > dragIndex ? targetIndex : targetIndex + 1;
        }

        this.app.sections.splice(newIndex, 0, dragSection);

        this.renderNotesList();
        this.app.sectionsManager.updateSectionsOrder();
    }

    reorderNoteInSection(dragNoteId, targetNoteId, sectionId) {
        const section = this.app.sections.find(s => s.id === sectionId);
        if (!section) return;

        const dragNote = section.notes.find(n => n.id === dragNoteId);
        const targetNote = section.notes.find(n => n.id === targetNoteId);

        if (!dragNote || !targetNote) return;

        const dragIndex = section.notes.indexOf(dragNote);
        const targetIndex = section.notes.indexOf(targetNote);

        section.notes.splice(dragIndex, 1);
        section.notes.splice(targetIndex, 0, dragNote);

        this.renderNotesList();

        if (this.app.autoSaveEnabled) {
            this.app.storageManager.saveNotesToLocalStorage(true);
        }
    }

    moveNoteToSection(noteId, sourceSectionId, targetSectionId) {
        const sourceSection = this.app.sections.find(s => s.id === sourceSectionId);
        const targetSection = this.app.sections.find(s => s.id === targetSectionId);

        if (!sourceSection || !targetSection) return;

        const noteIndex = sourceSection.notes.findIndex(n => n.id === noteId);
        if (noteIndex === -1) return;

        const noteElement = document.querySelector(`.note[data-note-id="${noteId}"]`);
        const note = sourceSection.notes[noteIndex];

        if (noteElement) {
            const titleEl = noteElement.querySelector('.note-title');
            const contentEl = noteElement.querySelector('.note-content');
            if (titleEl) note.title = titleEl.innerHTML || titleEl.textContent || '';
            if (contentEl) note.content = contentEl.innerHTML || '';
            note.x = parseInt(noteElement.style.left) || note.x || 0;
            note.y = parseInt(noteElement.style.top) || note.y || 0;
            note.width = parseInt(noteElement.style.width) || note.width || 230;
            note.height = parseInt(noteElement.style.height) || note.height || 200;
        }

        sourceSection.notes.splice(noteIndex, 1);

        if (noteElement) {
            noteElement.remove();
        }

        const sectionContent = document.querySelector(`.section-content[data-section-id="${targetSectionId}"]`);
        if (sectionContent) {
            const sectionRect = sectionContent.getBoundingClientRect();
            const scrollX = sectionContent.scrollLeft;
            const scrollY = sectionContent.scrollTop;
            const viewportCenterX = window.innerWidth / 2;
            const viewportCenterY = window.innerHeight / 2;

            const width = note.width || 230;
            const height = note.height || 200;

            let x = (viewportCenterX - sectionRect.left + scrollX) - (width / 2);
            let y = (viewportCenterY - sectionRect.top + scrollY) - 50;

            x = Math.max(0, Math.min(x, sectionContent.scrollWidth - width));
            y = Math.max(0, Math.min(y, sectionContent.scrollHeight - height));

            note.x = x;
            note.y = y;
        }

        targetSection.notes.push(note);

        if (sectionContent) {
            const newNoteElement = document.createElement('div');
            newNoteElement.classList.add('note');
            newNoteElement.dataset.noteId = note.id;
            newNoteElement.style.left = `${note.x}px`;
            newNoteElement.style.top = `${note.y}px`;
            newNoteElement.style.width = `${note.width || 230}px`;
            newNoteElement.style.height = `${note.height || 200}px`;

            const noteTitle = note.title || 'New Note';
            const noteContent = note.content || '';

            newNoteElement.innerHTML = `
                <div class="drag">
                    <div class="note-header">
                        <div class="note-title" contenteditable="true">${noteTitle}</div>
                        <button class="delete-btn" title="Excluir nota">✖</button>
                    </div>
                    <div class="note-content" contenteditable="true">${noteContent}</div>      
                    <div class="resize-handle"></div>
                </div>
            `;

            if (note.style) {
                const noteContentEl = newNoteElement.querySelector('.note-content');
                Object.assign(noteContentEl.style, note.style);
            }

            this.app.notesManager.setupNoteDragAndResize(newNoteElement);
            this.app.notesManager.setupNoteActions(newNoteElement);

            sectionContent.appendChild(newNoteElement);
        }

        this.renderNotesList();

        if (this.app.autoSaveEnabled) {
            this.app.storageManager.saveNotesToLocalStorage(true);
        }
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

