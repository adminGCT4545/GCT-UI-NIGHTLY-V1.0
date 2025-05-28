/**
 * Admin Panel Patch
 * This script adds a direct method to fix and open the admin panel
 * regardless of any initialization issues.
 */
(function() {
    console.log('Admin Panel Patch loaded');
    
    // Create a direct access method to fix and open the admin panel
    window.openAdminPanel = function() {
        console.log('Direct admin panel open method called');
        
        if (!window.adminPanel) {
            console.error('Admin panel not available on window object');
            return;
        }
        
        try {
            // Force initialization if needed
            if (!window.adminPanel.isInitialized) {
                window.adminPanel.init();
            }
            
            // If panel is still not created, create it
            if (!window.adminPanel.panel) {
                window.adminPanel.createPanelHTML();
                window.adminPanel.bindEvents();
            }
            
            // Force panel to be visible
            const panel = document.getElementById('admin-panel-container');
            if (panel) {
                panel.classList.add('active');
                document.body.style.overflow = 'hidden';
            } else {
                console.error('Admin panel container not found in DOM');
            }
        } catch (error) {
            console.error('Error opening admin panel:', error);
        }
    };
    
    // Add to the window load event
    window.addEventListener('load', function() {
        // Find the admin panel button
        const adminPanelBtn = document.getElementById('admin-panel');
        if (adminPanelBtn) {
            console.log('Admin panel button found, replacing click handler');
            
            // Replace the click handler
            adminPanelBtn.onclick = function() {
                console.log('Admin panel button clicked (patched)');
                window.openAdminPanel();
                return false;
            };
        }
    });
})();
