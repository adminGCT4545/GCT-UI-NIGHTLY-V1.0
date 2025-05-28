document.addEventListener('DOMContentLoaded', function() {
    // Enable highlighting for all code blocks
    document.querySelectorAll('pre code').forEach(block => {
        // Set default language if not specified
        if (!block.className) {
            block.className = 'language-plaintext';
        }
        
        // Initialize highlight.js on the code block
        hljs.highlightBlock(block);
    });

    // Register markdown preview observer
    const markdownPreview = document.getElementById('note-content-display');
    if (markdownPreview) {
        // Create an observer to watch for content changes
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    // Highlight any code blocks in the new content
                    mutation.target.querySelectorAll('pre code').forEach(block => {
                        hljs.highlightBlock(block);
                    });
                }
            });
        });

        // Start observing the preview pane
        observer.observe(markdownPreview, {
            childList: true,
            subtree: true
        });
    }
});