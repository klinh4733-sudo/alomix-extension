console.log("AntiGravity Content Script Loaded");

// Ensure Interceptor/Hacker Script is injected
// Check if already injected to avoid duplicates? 
if (!document.getElementById('ag-injector')) {
    const script = document.createElement('script');
    script.id = 'ag-injector';
    script.src = chrome.runtime.getURL('inject/inject.js');
    script.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SEARCH_ORDERS' && request.query) {
        console.log("Received Batch Search Request:", request.query);

        // Delegate to Main World Script (inject.js) 
        // because we need to access React Props which are hidden from Isolated World
        window.postMessage({ type: 'AG_REACT_SEARCH', query: request.query }, '*');

        sendResponse({ status: "success" });
        return true;
    }
});
