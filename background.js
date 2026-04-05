// Finalized Zero-Config Architecture
// The Extension handles everything by talking to our dedicated Railway cloud engine
const CLOUD_API_URL = 'https://extension-only-downloader-server-side-production.up.railway.app';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'download_api') {
        startCloudDownload(request, sendResponse);
        return true; 
    }
});

async function startCloudDownload(request, sendResponse) {
    const baseUrl = CLOUD_API_URL;
    const downloadUrl = `${baseUrl}/download?url=${encodeURIComponent(request.url)}&quality=${request.quality}&format=${request.format}`;

    try {
        // Ping the server to verify it is awake
        const statusCheck = await fetch(`${baseUrl}/status`).catch(() => null);
        
        if (!statusCheck || !statusCheck.ok) {
             chrome.runtime.sendMessage({ type: 'error', error: "Cloud engine failed to wake up. Railway free-tier might be sleeping." }).catch(() => {});
             sendResponse({ started: false });
             return;
        }

        // Trigger the native chrome download sequence
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
        chrome.runtime.sendMessage({ type: 'error', error: `System busy: ${e.message}` }).catch(() => {});
        sendResponse({ started: false });
    }
}
