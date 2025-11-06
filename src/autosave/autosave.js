// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class AutoSaveManager {
    constructor(app, storageManager) {
        this.app = app;
        this.storageManager = storageManager;
        this.autoSaveEnabled = false;
        this.autoSaveInterval = null;
        this.saveTimeout = null;
        this.inputHandler = null; // Armazenar referência ao handler para poder removê-lo
    }

    init() {
        const autoSaveEnabled = localStorage.getItem('autoSaveEnabled') === 'true';
        const autoSaveToggle = document.getElementById('auto-save-toggle');

        autoSaveToggle.checked = autoSaveEnabled;
        this.autoSaveEnabled = autoSaveEnabled;
        this.app.autoSaveEnabled = this.autoSaveEnabled;
        this.app.isLoading = false;

        if (this.autoSaveEnabled) {
            this.storageManager.loadNotesFromLocalStorage(true);
            this.startAutoSave();
        }

        autoSaveToggle.addEventListener('change', () => {
            this.autoSaveEnabled = autoSaveToggle.checked;
            this.app.autoSaveEnabled = this.autoSaveEnabled;
            localStorage.setItem('autoSaveEnabled', this.autoSaveEnabled);

            if (this.autoSaveEnabled) {
                this.startAutoSave();
                this.app.showNotification('Auto Save enabled', 'success-message');
            } else {
                this.stopAutoSave();
                this.app.showNotification('Auto Save disabled', 'info-message');
            }
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'notesApp') {
                setTimeout(() => {
                    this.storageManager.loadNotesFromLocalStorage(true);
                }, 1);
            }
        });
    }

    startAutoSave() {
        // Remover listener anterior se existir para evitar múltiplos listeners
        if (this.inputHandler) {
            document.removeEventListener("input", this.inputHandler);
        }

        // Criar novo handler e armazenar referência
        this.inputHandler = () => {
            if (this.autoSaveEnabled) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.storageManager.saveNotesToLocalStorage(true);
                }, 100);
            }
        };

        document.addEventListener("input", this.inputHandler);
    }

    stopAutoSave() {
        // Remover o event listener
        if (this.inputHandler) {
            document.removeEventListener("input", this.inputHandler);
            this.inputHandler = null;
        }
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }
}

