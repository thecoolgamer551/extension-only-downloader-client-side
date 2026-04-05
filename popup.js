const CLOUD_API_URL = 'https://extension-only-downloader-server-side-production.up.railway.app';

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const downloadBtn = document.getElementById('download-btn');
    const settingsToggle = document.getElementById('settings-toggle');
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const backBtn = document.getElementById('back-btn');

    const videoInfoElement = document.getElementById('video-info');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const qualitySelect = document.getElementById('quality-select');
    const formatSelect = document.getElementById('format-select');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('spinner');

    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');

    // 1. Initial Connect check
    checkCloudStatus();
    setInterval(checkCloudStatus, 10000); // Check every 10s while popup open

    // 2. Status Check function
    async function checkCloudStatus() {
        try {
            const response = await fetch(`${CLOUD_API_URL}/status`);
            if (response.ok) {
                statusDot.classList.add('online');
                statusText.innerText = 'Connected: Zero-Config Cloud Engine Ready';
                downloadBtn.disabled = false;
                return true;
            }
        } catch (e) {
            statusDot.classList.remove('online');
            statusText.innerText = 'Cloud Engine Connecting... (Checking Railway Status)';
            downloadBtn.disabled = true;
        }
        return false;
    }

    // 3. Status/Download listener
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'error') {
            alert(`Oops: ${msg.error}`);
            setLoading(false);
        } else if (msg.type === 'done') {
            setLoading(false);
            progressBar.style.width = '100%';
            progressPercent.innerText = 'Request Sent!';
            setTimeout(() => { progressContainer.style.display = 'none'; }, 5000);
        }
    });

    // 4. Manual settings view navigation
    settingsToggle.onclick = () => { mainView.classList.remove('active'); settingsView.classList.add('active'); };
    backBtn.onclick = () => { settingsView.classList.remove('active'); mainView.classList.add('active'); };

    // Set tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && (tab.url.includes('youtube.com/watch') || tab.url.includes('youtube.com/shorts'))) {
        videoInfoElement.innerText = tab.title.replace(' - YouTube', '');
    } else {
        videoInfoElement.innerText = 'Go to YouTube video page.';
        downloadBtn.disabled = true;
    }

    downloadBtn.onclick = async () => {
        setLoading(true);
        progressContainer.style.display = 'block';
        progressBar.style.width = '10%';
        progressPercent.innerText = 'Init Cloud Merge...';

        const [currTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.runtime.sendMessage({
            action: 'download_api',
            url: currTab.url,
            quality: qualitySelect.value,
            format: formatSelect.value
        });
    };

    function setLoading(isLoading) {
        downloadBtn.disabled = isLoading;
        btnText.innerText = isLoading ? 'Processing...' : 'Download via Private Cloud';
        spinner.style.display = isLoading ? 'block' : 'none';
        
        if (isLoading) {
             progressBar.style.width = '50%';
             progressPercent.innerText = 'Piping Stream...';
        }
    }
});
