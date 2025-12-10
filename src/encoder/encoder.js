// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class EncoderDecoder {
    constructor() {
        this.input = '';
        this.output = '';
        this.mode = 'encode'; // 'encode' or 'decode'
        this.type = 'base64'; // 'ascii', 'unicode', 'html', 'hex', 'base64', 'url'
        this.init();
    }

    init() {
        const encoderBtn = document.getElementById('encoder-btn');
        const encoderModal = document.getElementById('encoder-modal');
        const closeEncoderModal = document.querySelector('.close-encoder-modal');

        if (encoderBtn) {
            encoderBtn.addEventListener('click', () => this.openModal());
        }

        if (closeEncoderModal) {
            closeEncoderModal.addEventListener('click', () => this.closeModal());
        }

        if (encoderModal) {
            encoderModal.addEventListener('click', (e) => {
                if (e.target === encoderModal) this.closeModal();
            });
        }

        // Inputs
        const inputArea = document.getElementById('encoder-input');
        if (inputArea) {
            inputArea.addEventListener('input', (e) => {
                this.input = e.target.value;
                this.process();
                this.updateCopyButtons();
            });
        }

        // Mode Tabs (Encode/Decode)
        const modeTabs = document.querySelectorAll('.encoder-tab[data-mode]');
        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update UI
                modeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update State
                this.mode = tab.dataset.mode;
                this.process();
            });
        });

        // Type Buttons
        const typeBtns = document.querySelectorAll('.encoder-type-btn');
        typeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update UI
                typeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update State
                this.type = btn.dataset.type;
                this.process();
            });
        });

        // Swap button
        const swapBtn = document.getElementById('encoder-swap-btn');
        if (swapBtn) {
            swapBtn.addEventListener('click', () => {
                const currentOutput = document.getElementById('encoder-output').value;
                document.getElementById('encoder-input').value = currentOutput;
                this.input = currentOutput;

                // Toggle mode
                this.mode = this.mode === 'encode' ? 'decode' : 'encode';

                // Update UI for mode
                const modeTabs = document.querySelectorAll('.encoder-tab[data-mode]');
                modeTabs.forEach(t => {
                    if (t.dataset.mode === this.mode) {
                        t.classList.add('active');
                    } else {
                        t.classList.remove('active');
                    }
                });

                this.process();
            });
        }

        // Copy buttons
        const copyInputBtn = document.getElementById('encoder-copy-input');
        if (copyInputBtn) {
            copyInputBtn.addEventListener('click', () => {
                this.copyToClipboard(this.input, copyInputBtn);
            });
        }

        const copyOutputBtn = document.getElementById('encoder-copy-output');
        if (copyOutputBtn) {
            copyOutputBtn.addEventListener('click', () => {
                this.copyToClipboard(this.output, copyOutputBtn);
            });
        }

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && encoderModal && encoderModal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }

    openModal() {
        const modal = document.getElementById('encoder-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('encoder-input').focus();
        }
    }

    closeModal() {
        const modal = document.getElementById('encoder-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    process() {
        if (!this.input) {
            this.output = '';
            this.updateUI();
            return;
        }

        try {
            switch (this.type) {
                case 'ascii':
                    this.output = this.mode === 'encode' ? this.encodeASCII(this.input) : this.decodeASCII(this.input);
                    break;
                case 'unicode':
                    this.output = this.mode === 'encode' ? this.encodeUnicode(this.input) : this.decodeUnicode(this.input);
                    break;
                case 'html':
                    this.output = this.mode === 'encode' ? this.encodeHTML(this.input) : this.decodeHTML(this.input);
                    break;
                case 'hex':
                    this.output = this.mode === 'encode' ? this.encodeHex(this.input) : this.decodeHex(this.input);
                    break;
                case 'base64':
                    this.output = this.mode === 'encode' ? this.encodeBase64(this.input) : this.decodeBase64(this.input);
                    break;
                case 'url':
                    this.output = this.mode === 'encode' ? this.encodeURL(this.input) : this.decodeURL(this.input);
                    break;
            }
        } catch (e) {
            this.output = 'Error: ' + e.message;
        }

        this.updateUI();
    }

    updateUI() {
        const outputArea = document.getElementById('encoder-output');
        if (outputArea) {
            outputArea.value = this.output;
        }
        this.updateCopyButtons();
    }

    updateCopyButtons() {
        const copyInputBtn = document.getElementById('encoder-copy-input');
        const copyOutputBtn = document.getElementById('encoder-copy-output');

        if (copyInputBtn) {
            copyInputBtn.style.display = this.input ? 'inline-block' : 'none';
        }

        if (copyOutputBtn) {
            copyOutputBtn.style.display = this.output ? 'inline-block' : 'none';
        }
    }

    copyToClipboard(text, btnElement) {
        navigator.clipboard.writeText(text);
        const span = btnElement.querySelector('span');
        const originalText = span.textContent;
        span.textContent = 'Copied!';
        setTimeout(() => {
            span.textContent = originalText;
        }, 2000);
    }

    // --- Algorithms ---

    // ASCII
    encodeASCII(str) {
        return str.split('').map(char => char.charCodeAt(0)).join(' ');
    }

    decodeASCII(str) {
        return str.trim().split(/\s+/).map(code => String.fromCharCode(parseInt(code))).join('');
    }

    // Unicode
    encodeUnicode(str) {
        return str.split('').map(char => {
            const hex = char.charCodeAt(0).toString(16).toUpperCase();
            return '\\u' + '0000'.substring(0, 4 - hex.length) + hex;
        }).join('');
    }

    decodeUnicode(str) {
        try {
            return JSON.parse(`"${str}"`);
        } catch (e) {
            // Fallback for simple unescaping if JSON.parse fails
            return str.replace(/\\u[\dA-F]{4}/gi,
                function (match) {
                    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
                });
        }
    }

    // HTML
    encodeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    decodeHTML(str) {
        const txt = document.createElement('textarea');
        txt.innerHTML = str;
        return txt.value;
    }

    // Hexadecimal Escape Sequence
    encodeHex(str) {
        return str.split('').map(char => {
            const hex = char.charCodeAt(0).toString(16).toUpperCase();
            return '\\x' + (hex.length < 2 ? '0' : '') + hex;
        }).join('');
    }

    decodeHex(str) {
        return str.replace(/\\x([0-9A-Fa-f]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        });
    }

    // Base64
    encodeBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    decodeBase64(str) {
        return decodeURIComponent(escape(atob(str)));
    }

    // URL
    encodeURL(str) {
        return encodeURIComponent(str);
    }

    decodeURL(str) {
        return decodeURIComponent(str);
    }
}
