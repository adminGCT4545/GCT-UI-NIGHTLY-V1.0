// Browser Control Fix Verification Script
// Run this in the browser console to verify all buttons are working

(function() {
    console.log('=== Browser Control Fix Verification ===');
    
    // Check if browser control panel exists
    const panel = document.getElementById('browser-control-panel');
    if (!panel) {
        console.error('❌ Browser control panel not found!');
        return;
    }
    console.log('✅ Browser control panel found');
    
    // Check if panel is active
    if (!panel.classList.contains('active')) {
        console.warn('⚠️ Panel is not active. Open it by clicking the globe icon in the sidebar.');
    }
    
    // Check all buttons
    const buttons = {
        'browser-launch-btn': 'Launch',
        'browser-click-btn': 'Click',
        'browser-type-btn': 'Type',
        'browser-screenshot-btn': 'Screenshot',
        'browser-scroll-up-btn': 'Scroll Up',
        'browser-scroll-down-btn': 'Scroll Down',
        'browser-close-btn': 'Close'
    };
    
    console.log('\n=== Button Status ===');
    Object.entries(buttons).forEach(([id, name]) => {
        const btn = document.getElementById(id);
        if (!btn) {
            console.error(`❌ ${name} button not found!`);
        } else {
            const hasOnclick = btn.onclick !== null;
            const hasListeners = btn._listeners && btn._listeners.click && btn._listeners.click.length > 0;
            const isDisabled = btn.disabled;
            
            console.log(`${name} Button:`);
            console.log(`  - Found: ✅`);
            console.log(`  - Has onclick: ${hasOnclick ? '✅' : '❌'}`);
            console.log(`  - Disabled: ${isDisabled ? 'Yes' : 'No'}`);
            
            // Test click handler
            if (hasOnclick) {
                console.log(`  - Handler type: onclick property`);
            }
        }
    });
    
    // Check console output element
    const consoleOutput = document.getElementById('browser-console-output');
    if (!consoleOutput) {
        console.error('❌ Console output element not found!');
    } else {
        console.log('\n✅ Console output element found');
        console.log(`  - Current content: ${consoleOutput.children.length} entries`);
    }
    
    // Check history element
    const historyOutput = document.getElementById('browser-action-history');
    if (!historyOutput) {
        console.error('❌ History output element not found!');
    } else {
        console.log('\n✅ History output element found');
        console.log(`  - Current content: ${historyOutput.children.length} entries`);
    }
    
    // Check if final fix is loaded
    if (window.browserControlFixApplied) {
        console.log('\n✅ Browser Final Fix is loaded and active');
    } else {
        console.error('\n❌ Browser Final Fix is NOT loaded!');
    }
    
    console.log('\n=== Verification Complete ===');
    console.log('Try clicking each button and check for console output.');
})();