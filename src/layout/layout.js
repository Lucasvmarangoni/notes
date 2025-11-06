// Copyright (c) 2025 Lucas Vazzoller Marangoni
// Licensed under Creative Commons BY-NC 4.0
// See the LICENSE file for more information.

export class LayoutManager {
    constructor() {
        // Initialize layout positions
        this.updateLayoutPositions();
        window.addEventListener('resize', () => this.updateLayoutPositions());
    }

    updateLayoutPositions() {
        const header = document.querySelector('.header');
        const sectionsTabs = document.getElementById('sections-tabs');
        const sectionsContent = document.getElementById('sections-content');
        const noteActions = document.querySelector('.note-actions');
        
        if (header && sectionsTabs && sectionsContent) {
            const headerHeight = header.offsetHeight;
            const tabsHeight = sectionsTabs.offsetHeight || 40;
            const noteActionsHeight = noteActions ? noteActions.offsetHeight : 18;
            
            // Position tabs below header
            sectionsTabs.style.top = `${headerHeight}px`;
            
            // Position note-actions below tabs
            const noteActionsTop = headerHeight + tabsHeight;
            if (noteActions) {
                noteActions.style.top = `${noteActionsTop}px`;
            }
            
            // Calculate total height needed for sections-content
            const totalHeight = headerHeight + tabsHeight + noteActionsHeight + 0; // 20px extra spacing
            sectionsContent.style.paddingTop = `${totalHeight}px`;
        }
    }
}

