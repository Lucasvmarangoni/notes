// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class JWTAnalyzer {
    constructor() {
        this.jwt = '';
        this.decoded = null;
        this.editedHeader = '';
        this.editedPayload = '';
        this.editedSignature = '';
        this.secret = '';
        this.activeTab = 'edit';
        this.copied = false;
        this.validationResult = null;
        this.vulnerabilities = [];
        this.init();
    }

    init() {
        const jwtBtn = document.getElementById('jwt-btn');
        const jwtModal = document.getElementById('jwt-modal');
        const closeJwtModal = document.querySelector('.close-jwt-modal');
        const jwtTokenInput = document.getElementById('jwt-token-input');

        jwtBtn.addEventListener('click', () => this.openModal());
        closeJwtModal.addEventListener('click', () => this.closeModal());
        jwtModal.addEventListener('click', (e) => {
            if (e.target === jwtModal) this.closeModal();
        });

        jwtTokenInput.addEventListener('input', (e) => {
            this.jwt = e.target.value.trim();
            this.decodeAndUpdate();
        });

        document.querySelectorAll('.jwt-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        document.getElementById('jwt-copy-btn').addEventListener('click', () => {
            this.copyToClipboard(this.jwt);
        });

        document.getElementById('jwt-edit-header').addEventListener('input', (e) => {
            this.editedHeader = e.target.value;
        });
        document.getElementById('jwt-edit-payload').addEventListener('input', (e) => {
            this.editedPayload = e.target.value;
        });
        document.getElementById('jwt-edit-signature').addEventListener('input', (e) => {
            this.editedSignature = e.target.value;
        });
        document.getElementById('jwt-rebuild-keep').addEventListener('click', () => {
            this.rebuildToken(true);
        });
        document.getElementById('jwt-rebuild-remove').addEventListener('click', () => {
            this.rebuildToken(false);
        });

        document.getElementById('jwt-sign-btn').addEventListener('click', () => {
            this.signToken();
        });
        document.querySelectorAll('.jwt-secret-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('jwt-secret').value = btn.dataset.secret;
            });
        });

        document.getElementById('jwt-verify-btn').addEventListener('click', () => {
            this.verifySignature();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && jwtModal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }

    openModal() {
        document.getElementById('jwt-modal').style.display = 'flex';
        this.switchTab('edit');
    }

    closeModal() {
        document.getElementById('jwt-modal').style.display = 'none';
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        
        document.querySelectorAll('.jwt-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        document.querySelectorAll('.jwt-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`jwt-${tabName}-tab`).classList.add('active');
    }

    base64UrlDecode(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        const pad = str.length % 4;
        if (pad) str += '='.repeat(4 - pad);
        try {
            return decodeURIComponent(escape(atob(str)));
        } catch (e) {
            return null;
        }
    }

    base64UrlEncode(str) {
        return btoa(unescape(encodeURIComponent(str)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    decodeJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error('Invalid JWT format');

            const header = JSON.parse(this.base64UrlDecode(parts[0]));
            const payload = JSON.parse(this.base64UrlDecode(parts[1]));
            const signature = parts[2];

            return { header, payload, signature, parts };
        } catch (e) {
            return null;
        }
    }

    checkVulnerabilities(token, decodedData) {
        const vulns = [];
        if (!decodedData) return vulns;

        if (decodedData.header.alg === 'none') {
            vulns.push({
                severity: 'high',
                title: 'Algorithm "none" detected',
                description: 'Token uses no signature - completely bypasses verification'
            });
        }

        if (decodedData.header.alg && decodedData.header.alg.startsWith('HS')) {
            vulns.push({
                severity: 'medium',
                title: 'Symmetric algorithm (HMAC)',
                description: 'Try brute-forcing weak secrets or test if signature is verified'
            });
        }

        if (!decodedData.payload.exp) {
            vulns.push({
                severity: 'medium',
                title: 'No expiration time (exp)',
                description: 'Token does not expire - can be reused indefinitely'
            });
        }

        if (decodedData.payload.exp && decodedData.payload.exp * 1000 < Date.now()) {
            vulns.push({
                severity: 'low',
                title: 'Token expired',
                description: 'Check if application accepts expired tokens'
            });
        }

        if (decodedData.header.alg && decodedData.header.alg.startsWith('RS')) {
            vulns.push({
                severity: 'high',
                title: 'RSA algorithm - Algorithm Confusion possible',
                description: 'Try changing to HS256/HS512 and use public key as HMAC secret'
            });
        }

        const sensitiveFields = ['password', 'secret', 'token', 'key', 'ssn', 'credit', 'card'];
        const payloadStr = JSON.stringify(decodedData.payload).toLowerCase();
        const foundSensitive = sensitiveFields.filter(field => payloadStr.includes(field));
        
        if (foundSensitive.length > 0) {
            vulns.push({
                severity: 'medium',
                title: 'Sensitive data in payload',
                description: `Found: ${foundSensitive.join(', ')} - JWT payload is NOT encrypted!`
            });
        }

        if (!decodedData.signature || decodedData.signature === '') {
            vulns.push({
                severity: 'high',
                title: 'Empty signature',
                description: 'Token has no signature - test if server validates it'
            });
        }

        return vulns;
    }

    decodeAndUpdate() {
        if (this.jwt) {
            const result = this.decodeJWT(this.jwt);
            this.decoded = result;
            if (result) {
                this.editedHeader = JSON.stringify(result.header, null, 2);
                this.editedPayload = JSON.stringify(result.payload, null, 2);
                this.editedSignature = result.signature;
                const vulns = this.checkVulnerabilities(this.jwt, result);
                this.vulnerabilities = vulns;
                this.updateUI();
            } else {
                this.vulnerabilities = [];
                this.decoded = null;
                this.updateUI();
            }
        } else {
            this.decoded = null;
            this.vulnerabilities = [];
            this.updateUI();
        }
    }

    updateUI() {
        const copyBtn = document.getElementById('jwt-copy-btn');
        if (this.jwt) {
            copyBtn.style.display = 'inline-block';
        } else {
            copyBtn.style.display = 'none';
        }

        const vulnsContainer = document.getElementById('jwt-vulnerabilities');
        const vulnsList = document.getElementById('jwt-vulns-list');
        if (this.vulnerabilities.length > 0) {
            vulnsContainer.style.display = 'block';
            document.getElementById('jwt-vuln-count').textContent = this.vulnerabilities.length;
            vulnsList.innerHTML = this.vulnerabilities.map(vuln => `
                <div class="jwt-vuln-item">
                    <div class="jwt-vuln-header">
                        <span class="jwt-severity-badge jwt-severity-${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                        <span class="jwt-vuln-title">${vuln.title}</span>
                    </div>
                    <p class="jwt-vuln-desc">${vuln.description}</p>
                </div>
            `).join('');
        } else {
            vulnsContainer.style.display = 'none';
        }

        if (this.decoded) {
            document.getElementById('jwt-edit-header').value = this.editedHeader;
            document.getElementById('jwt-edit-payload').value = this.editedPayload;
            document.getElementById('jwt-edit-signature').value = this.editedSignature;
        }
    }

    rebuildToken(keepSignature = true) {
        try {
            const header = JSON.parse(this.editedHeader);
            const payload = JSON.parse(this.editedPayload);

            const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
            const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

            let signature = keepSignature ? this.editedSignature : '';
            
            if (header.alg === 'none') {
                signature = '';
            }

            const newToken = `${encodedHeader}.${encodedPayload}.${signature}`;
            this.jwt = newToken;
            document.getElementById('jwt-token-input').value = newToken;
            this.decodeAndUpdate();
        } catch (e) {
            alert('Error: Invalid JSON - ' + e.message);
        }
    }

    async signToken() {
        const secret = document.getElementById('jwt-secret').value;

        try {
            const header = JSON.parse(this.editedHeader || JSON.stringify(this.decoded.header));
            const payload = JSON.parse(this.editedPayload || JSON.stringify(this.decoded.payload));

            const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
            const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
            
            const data = `${encodedHeader}.${encodedPayload}`;
            
            let signatureBase64 = '';
            
            if (!secret || secret.trim() === '') {
                signatureBase64 = '1wfcqr7A5MmJi6oX6VgCNxHNsfo0Z0f_xr-MoVHLZTw';
            } else {
                const enc = new TextEncoder();
                const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };
                
                if (header.alg === 'HS384') {
                    algorithm.hash.name = 'SHA-384';
                } else if (header.alg === 'HS512') {
                    algorithm.hash.name = 'SHA-512';
                }

                const key = await crypto.subtle.importKey(
                    'raw',
                    enc.encode(secret),
                    algorithm,
                    false,
                    ['sign']
                );

                const signature = await crypto.subtle.sign(
                    'HMAC',
                    key,
                    enc.encode(data)
                );

                const signatureArray = new Uint8Array(signature);
                signatureBase64 = btoa(String.fromCharCode(...signatureArray))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
            }

            const newToken = `${data}.${signatureBase64}`;
            this.jwt = newToken;
            this.editedSignature = signatureBase64;
            document.getElementById('jwt-token-input').value = newToken;
            this.decodeAndUpdate();
            
        } catch (e) {
            alert('Error signing token: ' + e.message);
        }
    }

    async verifySignature() {
        const secret = document.getElementById('jwt-verify-secret').value;
        
        if (!this.decoded || !secret) {
            this.showVerifyResult(false, 'Need token and secret');
            return;
        }

        if (this.decoded.header.alg === 'none') {
            const isValid = this.decoded.signature === '';
            this.showVerifyResult(isValid, isValid ? 'Valid: "none" algorithm with empty signature' : 'Invalid: "none" algorithm should have empty signature');
            return;
        }

        try {
            const data = `${this.decoded.parts[0]}.${this.decoded.parts[1]}`;
            const enc = new TextEncoder();
            
            const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };
            if (this.decoded.header.alg === 'HS384') {
                algorithm.hash.name = 'SHA-384';
            } else if (this.decoded.header.alg === 'HS512') {
                algorithm.hash.name = 'SHA-512';
            }

            const key = await crypto.subtle.importKey(
                'raw',
                enc.encode(secret),
                algorithm,
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
            const signatureArray = new Uint8Array(signature);
            const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const isValid = signatureBase64 === this.decoded.signature;
            this.showVerifyResult(isValid, isValid ? 'Signature is VALID!' : 'Signature is INVALID - wrong secret or algorithm');
        } catch (e) {
            this.showVerifyResult(false, 'Error: ' + e.message);
        }
    }

    showVerifyResult(valid, message) {
        const resultDiv = document.getElementById('jwt-verify-result');
        resultDiv.style.display = 'block';
        resultDiv.className = `jwt-verify-result ${valid ? 'jwt-verify-valid' : 'jwt-verify-invalid'}`;
        resultDiv.innerHTML = `
            <span>${valid ? '✓' : '✗'}</span>
            <span>${message}</span>
        `;
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        const copyText = document.getElementById('jwt-copy-text');
        copyText.textContent = 'Copied!';
        setTimeout(() => {
            copyText.textContent = 'Copy';
        }, 2000);
    }
}

