class NotesApp {
    constructor() {
        this.sections = [];
        this.activeSection = null;
        this.draggingNote = null;
        this.resizingNote = null;
        this.currentRenamingSection = null;
        
        this.setupEventListeners();
        this.createDefaultSection();
        this.setupKeyboardShortcuts();
    }

    setupEventListeners() {        
        document.getElementById('add-section-btn').addEventListener('click', () => this.addSection());
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
            
            else if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                document.execCommand('italic', false, null);
            }

            else if (e.ctrlKey && e.key === '\\') {
                e.preventDefault();
                document.execCommand('removeFormat', false, null);
            }
        });
    }

    createDefaultSection() {
        this.addSection('Section');
    }

    addSection(title = 'New Section') {
        const sectionId = Date.now();
        
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
        this.setActiveSection(sectionId);
        
        return section;
    }

    setActiveSection(sectionId) {
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.section-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelector(`.section-tab[data-section-id="${sectionId}"]`).classList.add('active');
        document.querySelector(`.section-content[data-section-id="${sectionId}"]`).classList.add('active');
        
        this.activeSection = this.sections.find(section => section.id === sectionId);
    }

    deleteSection(sectionId) {
        if (this.sections.length <= 1) {
            alert('Você não pode excluir a única seção existente.');
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

    addNote(title = 'New Note', content = '', x = 50, y = 50, width = 250, height = 200, style = {}) {
        if (!this.activeSection) return;
        
        const sectionContent = document.querySelector(`.section-content[data-section-id="${this.activeSection.id}"]`);
        const noteId = Date.now();
        
        // Criar elemento da nota
        const noteElement = document.createElement('div');
        noteElement.classList.add('note');
        noteElement.dataset.noteId = noteId;
        noteElement.style.left = `${x}px`;
        noteElement.style.top = `${y}px`;
        noteElement.style.width = `${width}px`;
        noteElement.style.height = `${height}px`;
        
        noteElement.innerHTML = `
        <div class="note-header">
            <div class="note-title" contenteditable="true">${title}</div>
            <button class="delete-btn" title="Excluir nota">✖</button>
        </div>
        <div class="note-content" contenteditable="true">${content}</div>
        <div class="note-actions">
            <div class="note-toolbar">
                <button class="bold-btn" title="Negrito (Ctrl+B)">B</button>
                <button class="italic-btn" title="Itálico (Ctrl+I)">I</button>
                <button class="underline-btn" title="Sublinhado (Ctrl+U)">U</button>
                <input type="color" class="color-picker" value="#ffffff" title="text color">
            </div>
        </div>
        <div class="resize-handle"></div>
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
        
        return noteElement;
    }

    setupNoteDragAndResize(noteElement) {
        const header = noteElement.querySelector('.note-header');
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
        const boldBtn = noteElement.querySelector('.bold-btn');
        const italicBtn = noteElement.querySelector('.italic-btn');
        const underlineBtn = noteElement.querySelector('.underline-btn');
        const colorPicker = noteElement.querySelector('.color-picker');
        const deleteBtn = noteElement.querySelector('.delete-btn');
        
        boldBtn.addEventListener('click', () => {
            document.execCommand('bold', false, null);
        });
        
        italicBtn.addEventListener('click', () => {
            document.execCommand('italic', false, null);
        });
        
        underlineBtn.addEventListener('click', () => {
            document.execCommand('underline', false, null);
        });
        
        colorPicker.addEventListener('input', () => {
            document.execCommand('foreColor', false, colorPicker.value);
        });
        
        deleteBtn.addEventListener('click', () => {
            const noteId = Number(noteElement.dataset.noteId);
            const sectionId = Number(noteElement.closest('.section-content').dataset.sectionId);
            
            noteElement.remove();
            
            const section = this.sections.find(section => section.id === sectionId);
            if (section) {
                section.notes = section.notes.filter(note => note.id !== noteId);
            }
        });
    }

    saveNotesToLocalStorage() {
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
        alert('Save notes successfully!');
    }

    loadNotesFromLocalStorage() {
        const savedSections = JSON.parse(localStorage.getItem('notesApp') || '[]');
        
        if (savedSections.length === 0) {
            alert('No funded notes in local sotrage');
            return;
        }
        
        document.getElementById('sections-tabs').innerHTML = '';
        document.getElementById('sections-content').innerHTML = '';
        this.sections = [];
        
        savedSections.forEach(section => {
            const newSection = this.addSection(section.title);
            
            section.notes.forEach(note => {
                this.addNote(
                    note.title,
                    note.content,
                    note.x,
                    note.y,
                    note.width,
                    note.height,
                    note.style
                );
            });
        });
        
        alert('Notes load successfully');
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
        const blob = new Blob([dataStr], {type: 'application/json'});
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
                
                alert('Notes imported successfully');
            } catch (error) {
                alert('Error to file import: ' + error.message);
            }
            
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const notesApp = new NotesApp();
});