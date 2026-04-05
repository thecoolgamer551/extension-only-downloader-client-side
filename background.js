// The Extension now handles everything by talking to a user-owned Cloud API
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'download_api') {
        startCloudDownload(request, sendResponse);
        return true; 
    }
});

async function startCloudDownload(request, sendResponse) {
    // 1. Get the private server URL from settings (defaults to localhost for testing)
    chrome.storage.local.get(['apiUrl'], async (res) => {
        const baseUrl = res.apiUrl || 'http://localhost:3000';
        const downloadUrl = `${baseUrl.replace(/\/$/, '')}/download?url=${encodeURIComponent(request.url)}&quality=${request.quality}&format=${request.format}`;

        try {
            // Check if server is online
            const statusCheck = await fetch(`${baseUrl.replace(/\/$/, '')}/status`).catch(() => null);
            
            if (!statusCheck || !statusCheck.ok) {
                 chrome.runtime.sendMessage({ type: 'error', error: `Cloud API Offline at: ${baseUrl}` }).catch(() => {});
                 sendResponse({ started: false });
                 return;
            }

            // Trigger the download directly into Vivaldi/Chrome native downloads shelf
            chrome.downloads.download({
                url: downloadUrl,
                saveAs: false,
                conflictAction: 'uniquify'
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    chrome.runtime.sendMessage({ type: 'error', error: chrome.runtime.lastError.message }).catch(() => {});
                    sendResponse({ started: false });
                } else {
                    chrome.runtime.sendMessage({ type: 'done' }).catch(() => {});
                    sendResponse({ started: true });
                }
            });

        } catch (e) {
            chrome.runtime.sendMessage({ type: 'error', error: `Failed to connect: ${e.message}` }).catch(() => {});
            sendResponse({ started: false });
        }
    });
}
