// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class StorageManager {
    constructor(app) {
        this.app = app; // Reference to main app for accessing sections, notes, etc.
        this.isLoading = false;
    }

    saveNotesToLocalStorage(silent = false) {
        if (this.isLoading) return;
        
        this.app.sections.forEach(section => {
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

        localStorage.setItem('notesApp', JSON.stringify(this.app.sections));

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

        const wasAutoSaveEnabled = this.app.autoSaveEnabled;
        this.app.autoSaveEnabled = false;

        // Salvar a section ativa atual antes de recarregar
        const currentActiveSectionId = this.app.activeSectionId;

        if (savedSections.length === 0) {
            if (!silent) {
                this.app.showNotification('No notes found in local storage', 'error-message');
            }
            this.isLoading = false;
            this.app.autoSaveEnabled = wasAutoSaveEnabled;
            return;
        }

        document.getElementById('sections-tabs').innerHTML = '';
        document.getElementById('sections-content').innerHTML = '';
        this.app.sections = [];

        // Carregar sections sem definir nenhuma como ativa
        savedSections.forEach(section => {
            const newSection = this.app.sectionsManager.addSection(section.title, section.id, false);
            section.notes.forEach(note => {
                this.app.notesManager.addNote(
                    note.title,
                    note.content,
                    note.x,
                    note.y,
                    note.width,
                    note.height,
                    note.style,
                    note.id,
                    section.id  // Passar o sectionId para garantir que a nota seja adicionada à section correta
                );

                if (note.currentColor) {
                    const colorPicker = document.querySelector('.color-picker');
                    if (colorPicker) {
                        colorPicker.value = note.currentColor;
                    }
                }
            });
        });

        // Restaurar a section ativa anterior se ela ainda existir
        if (currentActiveSectionId !== null && currentActiveSectionId !== undefined) {
            const sectionStillExists = this.app.sections.some(s => s.id === currentActiveSectionId);
            if (sectionStillExists) {
                this.app.sectionsManager.setActiveSection(currentActiveSectionId);
            } else if (this.app.sections.length > 0) {
                // Se a section anterior não existe mais, ativar a primeira
                this.app.sectionsManager.setActiveSection(this.app.sections[0].id);
            }
        } else if (this.app.sections.length > 0) {
            // Se não havia section ativa, ativar a primeira
            this.app.sectionsManager.setActiveSection(this.app.sections[0].id);
        }

        if (!silent) {
            this.app.showNotification('Notes loaded successfully', 'success-message');
        }

        this.isLoading = false;

        setTimeout(() => {
            this.app.autoSaveEnabled = wasAutoSaveEnabled;
        }, 200);
    }

    exportNotes() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: this.app.sections
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.app.showNotification('Notes exported successfully', 'success-message');
    }

    importNotes(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                const importedSections = Array.isArray(importedData) ? importedData : importedData.data || [];

                if (importedSections.length === 0) {
                    this.app.showNotification('No valid data found in file', 'error-message');
                    return;
                }

                // Salvar a section ativa atual antes de importar
                const currentActiveSectionId = this.app.activeSectionId;

                // Clear current notes
                document.getElementById('sections-tabs').innerHTML = '';
                document.getElementById('sections-content').innerHTML = '';
                this.app.sections = [];

                // Import sections and notes sem definir nenhuma como ativa
                importedSections.forEach(section => {
                    const newSection = this.app.sectionsManager.addSection(section.title, section.id, false);
                    section.notes.forEach(note => {
                        this.app.notesManager.addNote(
                            note.title,
                            note.content,
                            note.x,
                            note.y,
                            note.width,
                            note.height,
                            note.style,
                            note.id,
                            section.id  // Passar o sectionId para garantir que a nota seja adicionada à section correta
                        );
                    });
                });

                // Restaurar a section ativa anterior se ela existir no import, senão ativar a primeira
                if (currentActiveSectionId !== null && currentActiveSectionId !== undefined) {
                    const sectionExists = this.app.sections.some(s => s.id === currentActiveSectionId);
                    if (sectionExists) {
                        this.app.sectionsManager.setActiveSection(currentActiveSectionId);
                    } else if (this.app.sections.length > 0) {
                        this.app.sectionsManager.setActiveSection(this.app.sections[0].id);
                    }
                } else if (this.app.sections.length > 0) {
                    this.app.sectionsManager.setActiveSection(this.app.sections[0].id);
                }

                this.app.showNotification('Notes imported successfully', 'success-message');

                if (this.app.autoSaveEnabled) {
                    this.saveNotesToLocalStorage(true);
                }
            } catch (error) {
                this.app.showNotification('Error importing notes: ' + error.message, 'error-message');
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }
}

