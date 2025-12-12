// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class StorageManager {
    constructor(app) {
        this.app = app;
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

        const data = {
            sections: this.app.sections,
            autoSave: this.app.autoSaveEnabled,
            theme: this.app.settingsManager.getThemeSettings(),
            customColors: this.app.customColors
        };

        localStorage.setItem('notesApp', JSON.stringify(data));

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

        const savedRaw = localStorage.getItem('notesApp');
        let savedSections = [];
        let savedAutoSave = this.app.autoSaveEnabled;
        let savedTheme = null;

        if (savedRaw) {
            try {
                const parsed = JSON.parse(savedRaw);

                if (Array.isArray(parsed)) {
                    savedSections = parsed;
                } else {
                    savedSections = parsed.sections || [];
                    if (parsed.autoSave !== undefined) {
                        savedAutoSave = parsed.autoSave;
                    }
                    if (parsed.theme) {
                        savedTheme = parsed.theme;
                    }
                    if (parsed.customColors) {
                        this.app.customColors = parsed.customColors;
                        this.app.color1 = this.app.customColors[0];
                        this.app.color2 = this.app.customColors[1];
                        this.app.color3 = this.app.customColors[2];
                        this.app.color4 = this.app.customColors[3];
                    }
                }
            } catch (e) {
                console.error('Error loading data:', e);
                savedSections = [];
            }
        }

        const wasAutoSaveEnabled = this.app.autoSaveEnabled;
        this.app.autoSaveEnabled = false;

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

        if (savedTheme) {
            this.app.settingsManager.applyTheme(savedTheme);
        }

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
                    section.id
                );

                if (note.currentColor) {
                    const colorPicker = document.querySelector('.color-picker');
                    if (colorPicker) {
                        colorPicker.value = note.currentColor;
                    }
                }
            });
        });

        if (currentActiveSectionId !== null && currentActiveSectionId !== undefined) {
            const sectionStillExists = this.app.sections.some(s => s.id === currentActiveSectionId);
            if (sectionStillExists) {
                this.app.sectionsManager.setActiveSection(currentActiveSectionId);
            } else if (this.app.sections.length > 0) {
                this.app.sectionsManager.setActiveSection(this.app.sections[0].id);
            }
        } else if (this.app.sections.length > 0) {
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
            sections: this.app.sections,
            autoSave: this.app.autoSaveEnabled,
            theme: this.app.settingsManager.getThemeSettings(),
            customColors: this.app.customColors
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
                let sectionsToImport = [];
                let themeToApply = null;

                if (Array.isArray(importedData)) {
                    sectionsToImport = importedData;
                } else if (importedData && typeof importedData === 'object' && importedData.sections) {
                    sectionsToImport = importedData.sections;
                    themeToApply = importedData.theme;
                    if (importedData.customColors) {
                        this.app.customColors = importedData.customColors;
                        this.app.color1 = this.app.customColors[0];
                        this.app.color2 = this.app.customColors[1];
                        this.app.color3 = this.app.customColors[2];
                        this.app.color4 = this.app.customColors[3];
                    }
                } else {
                    this.app.showNotification('No valid data found in file', 'error-message');
                    return;
                }

                if (sectionsToImport.length === 0) {
                    this.app.showNotification('No valid data found in file', 'error-message');
                    return;
                }

                const currentActiveSectionId = this.app.activeSectionId;

                document.getElementById('sections-tabs').innerHTML = '';
                document.getElementById('sections-content').innerHTML = '';
                this.app.sections = [];

                if (themeToApply) {
                    this.app.settingsManager.applyTheme(themeToApply);
                }

                sectionsToImport.forEach(importedSection => {
                    const newSection = this.app.sectionsManager.addSection(importedSection.title, importedSection.id, false);
                    importedSection.notes.forEach(note => {
                        this.app.notesManager.addNote(
                            note.title,
                            note.content,
                            note.x,
                            note.y,
                            note.width,
                            note.height,
                            note.style,
                            note.id,
                            importedSection.id
                        );
                    });
                });

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

        event.target.value = '';
    }
}

