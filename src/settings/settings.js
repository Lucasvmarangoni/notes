// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class SettingsManager {
    constructor(app) {
        this.app = app;
        this.settingsModal = null;
        this.defaultTheme = {
            '--my-green-color': '#5a7552',
            '--bg-primary': '#202124',
            '--bg-secondary': '#252629',
            '--bg-tertiary': '#28292c',
            '--border-handle': '#5f6368',
            '--text-white': '#ffffff',
            '--text-primary': '#e0e0e0'
        };
        this.currentTheme = { ...this.defaultTheme };
    }

    init() {
        this.createSettingsButton();
        this.createSettingsModal();
        this.setupEventListeners();
        this.loadThemeFromStorage();
    }

    createSettingsButton() {
        const btn = document.createElement('button');
        btn.id = 'settings-btn';
        btn.className = 'settings-icon-btn';
        btn.title = 'Settings';
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        `;

        const autoSaveContainer = document.querySelector('.auto-save-container');
        if (autoSaveContainer) {
            autoSaveContainer.appendChild(btn);
        }
    }

    createSettingsModal() {
        const modalHTML = `
            <div id="settings-modal" class="modal">
                <div class="modal-content settings-modal-content">
                    <div class="modal-header">
                        <h2>Theme Settings</h2>
                        <span class="close-modal close-settings">&times;</span>
                    </div>
                    <div class="settings-container">
                        <div class="setting-item">
                            <label>Preset Color 1</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-custom-color-0" value="${this.app.customColors[0]}">
                                <input type="text" class="color-text-input" value="${this.app.customColors[0]}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Preset Color 2</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-custom-color-1" value="${this.app.customColors[1]}">
                                <input type="text" class="color-text-input" value="${this.app.customColors[1]}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Preset Color 3</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-custom-color-2" value="${this.app.customColors[2]}">
                                <input type="text" class="color-text-input" value="${this.app.customColors[2]}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Preset Color 4</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-custom-color-3" value="${this.app.customColors[3]}">
                                <input type="text" class="color-text-input" value="${this.app.customColors[3]}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Accent Color</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-accent-color" value="${this.defaultTheme['--my-green-color']}">
                                <input type="text" class="color-text-input" value="${this.defaultTheme['--my-green-color']}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Main Background</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-bg-secondary" value="${this.defaultTheme['--bg-secondary']}">
                                <input type="text" class="color-text-input" value="${this.defaultTheme['--bg-secondary']}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Note Background</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-bg-primary" value="${this.defaultTheme['--bg-primary']}">
                                <input type="text" class="color-text-input" value="${this.defaultTheme['--bg-primary']}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Inactive Tab Background</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-bg-tertiary" value="${this.defaultTheme['--bg-tertiary']}">
                                <input type="text" class="color-text-input" value="${this.defaultTheme['--bg-tertiary']}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Button Background</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-border-handle" value="${this.defaultTheme['--border-handle']}">
                                <input type="text" class="color-text-input" value="${this.defaultTheme['--border-handle']}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Button Text</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-text-white" value="${this.defaultTheme['--text-white']}">
                                <input type="text" class="color-text-input" value="${this.defaultTheme['--text-white']}">
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>Primary Text</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="setting-text-primary" value="${this.defaultTheme['--text-primary']}">
                                <input type="text" class="color-text-input" value="${this.defaultTheme['--text-primary']}">
                            </div>
                        </div>
                        <div class="settings-actions">
                            <button id="import-theme-btn" class="button">Import Theme</button>
                            <button id="export-theme-btn" class="button">Export Theme</button>
                            <button id="reset-theme-btn" class="button">Reset to Default</button>
                            <input type="file" id="import-theme-file" accept=".json" style="display: none;">
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.settingsModal = document.getElementById('settings-modal');
    }

    setupEventListeners() {
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });

        this.settingsModal.querySelector('.close-settings').addEventListener('click', () => {
            this.closeSettings();
        });

        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });

        for (let i = 0; i < 4; i++) {
            this.setupCustomColorInput(i);
        }

        this.setupColorInput('setting-accent-color', '--my-green-color');
        this.setupColorInput('setting-bg-secondary', '--bg-secondary');
        this.setupColorInput('setting-bg-primary', '--bg-primary');
        this.setupColorInput('setting-bg-tertiary', '--bg-tertiary');
        this.setupColorInput('setting-border-handle', '--border-handle');
        this.setupColorInput('setting-text-white', '--text-white');
        this.setupColorInput('setting-text-primary', '--text-primary');

        document.getElementById('reset-theme-btn').addEventListener('click', () => {
            this.resetTheme();
        });

        document.getElementById('export-theme-btn').addEventListener('click', () => {
            this.exportThemeSettings();
        });

        document.getElementById('import-theme-btn').addEventListener('click', () => {
            document.getElementById('import-theme-file').click();
        });

        document.getElementById('import-theme-file').addEventListener('change', (e) => {
            this.importThemeSettings(e);
        });
    }

    setupCustomColorInput(index) {
        const inputId = `setting-custom-color-${index}`;
        const colorInput = document.getElementById(inputId);
        const textInput = colorInput.nextElementSibling;

        const updateColor = (value) => {
            this.app.customColors[index] = value;
            this.app[`color${index + 1}`] = value;

            const toolbarBtn = document.querySelectorAll('.note-toolbar .color-preset')[index];
            if (toolbarBtn) {
                toolbarBtn.style.backgroundColor = value;
            }

            if (this.app.autoSaveEnabled) {
                this.app.storageManager.saveNotesToLocalStorage(true);
            }
        };

        colorInput.addEventListener('input', (e) => {
            const value = e.target.value;
            textInput.value = value;
            updateColor(value);
        });

        textInput.addEventListener('change', (e) => {
            const value = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(value)) {
                colorInput.value = value;
                updateColor(value);
            }
        });
    }

    setupColorInput(inputId, cssVar) {
        const colorInput = document.getElementById(inputId);
        const textInput = colorInput.nextElementSibling;

        colorInput.addEventListener('input', (e) => {
            const value = e.target.value;
            textInput.value = value;
            this.updateThemeVariable(cssVar, value);
        });

        textInput.addEventListener('change', (e) => {
            const value = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(value)) {
                colorInput.value = value;
                this.updateThemeVariable(cssVar, value);
            }
        });
    }

    updateThemeVariable(cssVar, value) {
        document.documentElement.style.setProperty(cssVar, value);
        this.currentTheme[cssVar] = value;

        if (cssVar === '--my-green-color') {
            const rgb = this.hexToRgb(value);
            if (rgb) {
                document.documentElement.style.setProperty('--green-transparent', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
                document.documentElement.style.setProperty('--green-border-transparent', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
            }
        }

        if (this.app.autoSaveEnabled) {
            this.app.storageManager.saveNotesToLocalStorage(true);
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    openSettings() {
        for (let i = 0; i < 4; i++) {
            const inputId = `setting-custom-color-${i}`;
            const colorInput = document.getElementById(inputId);
            const textInput = colorInput.nextElementSibling;
            const value = this.app.customColors[i];
            colorInput.value = value;
            textInput.value = value;
        }

        for (const [cssVar, value] of Object.entries(this.currentTheme)) {
            const inputId = this.getInputIdForVar(cssVar);
            if (inputId) {
                const colorInput = document.getElementById(inputId);
                const textInput = colorInput.nextElementSibling;
                colorInput.value = value;
                textInput.value = value;
            }
        }
        this.settingsModal.style.display = 'flex';
    }

    closeSettings() {
        this.settingsModal.style.display = 'none';
    }

    getInputIdForVar(cssVar) {
        const map = {
            '--my-green-color': 'setting-accent-color',
            '--bg-secondary': 'setting-bg-secondary',
            '--bg-primary': 'setting-bg-primary',
            '--bg-tertiary': 'setting-bg-tertiary',
            '--border-handle': 'setting-border-handle',
            '--text-white': 'setting-text-white',
            '--text-primary': 'setting-text-primary'
        };
        return map[cssVar];
    }

    resetTheme() {
        this.currentTheme = { ...this.defaultTheme };
        for (const [cssVar, value] of Object.entries(this.currentTheme)) {
            this.updateThemeVariable(cssVar, value);
        }
        this.openSettings();
    }

    getThemeSettings() {
        return this.currentTheme;
    }

    loadThemeFromStorage() {
        for (const [cssVar, value] of Object.entries(this.currentTheme)) {
            this.updateThemeVariable(cssVar, value);
        }
    }

    applyTheme(themeSettings) {
        if (!themeSettings) return;

        this.currentTheme = { ...this.defaultTheme, ...themeSettings };
        this.loadThemeFromStorage();
    }

    exportThemeSettings() {
        const data = {
            theme: this.currentTheme,
            customColors: this.app.customColors
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `theme-settings-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importThemeSettings(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (importedData.theme) {
                    this.applyTheme(importedData.theme);
                }

                if (importedData.customColors) {
                    this.app.customColors = importedData.customColors;
                    this.app.color1 = this.app.customColors[0];
                    this.app.color2 = this.app.customColors[1];
                    this.app.color3 = this.app.customColors[2];
                    this.app.color4 = this.app.customColors[3];

                    // Update toolbar buttons
                    for (let i = 0; i < 4; i++) {
                        const toolbarBtn = document.querySelectorAll('.note-toolbar .color-preset')[i];
                        if (toolbarBtn) {
                            toolbarBtn.style.backgroundColor = this.app.customColors[i];
                        }
                    }
                }

                this.openSettings(); // Refresh inputs

                if (this.app.autoSaveEnabled) {
                    this.app.storageManager.saveNotesToLocalStorage(true);
                }

                alert('Theme settings imported successfully!');
            } catch (error) {
                console.error('Error importing theme:', error);
                alert('Error importing theme settings');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
}
