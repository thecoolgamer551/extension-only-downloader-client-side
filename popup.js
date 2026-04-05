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

    // Settings elements
    const serverUrlInput = document.getElementById('server-url-input');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    // 1. Load Server URL from Storage
    chrome.storage.local.get(['apiUrl'], (res) => {
        if (res.apiUrl) {
            serverUrlInput.value = res.apiUrl;
            checkCloudStatus(res.apiUrl);
        } else {
            statusText.innerText = 'Go to Settings and enter your Private API URL!';
        }
    });

    // 2. Status Check function
    async function checkCloudStatus(url) {
        try {
            const cleanUrl = url.replace(/\/$/, '');
            const response = await fetch(`${cleanUrl}/status`);
            if (response.ok) {
                statusDot.classList.add('online');
                statusText.innerText = 'Cloud Engine Online';
                downloadBtn.disabled = false;
                return true;
            }
        } catch (e) {
            statusDot.classList.remove('online');
            statusText.innerText = 'Cloud Engine Offline';
            downloadBtn.disabled = true;
        }
        return false;
    }

    // 3. Save Settings
    saveSettingsBtn.onclick = () => {
        const url = serverUrlInput.value;
        chrome.storage.local.set({ apiUrl: url }, () => {
            alert('Cloud Server URL saved.');
            checkCloudStatus(url);
            settingsView.classList.remove('active');
            mainView.classList.add('active');
        });
    };

    // 4. Download listener
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'error') {
            alert(`API Error: ${msg.error}`);
            setLoading(false);
        } else if (msg.type === 'done') {
            setLoading(false);
            progressBar.style.width = '100%';
            progressPercent.innerText = 'Connected!';
            setTimeout(() => { progressContainer.style.display = 'none'; }, 5000);
        }
    });

    // Settings Nav
    settingsToggle.onclick = () => { mainView.classList.remove('active'); settingsView.classList.add('active'); };
    backBtn.onclick = () => { settingsView.classList.remove('active'); mainView.classList.add('active'); };

    // Auto-complete tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && (tab.url.includes('youtube.com/watch') || tab.url.includes('youtube.com/shorts'))) {
        videoInfoElement.innerText = tab.title.replace(' - YouTube', '');
    }

    downloadBtn.onclick = async () => {
        setLoading(true);
        progressContainer.style.display = 'block';
        progressBar.style.width = '50%';
        progressPercent.innerText = 'Handing over...';

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
        btnText.innerText = isLoading ? 'Piping Stream...' : 'Download via Private Cloud';
        spinner.style.display = isLoading ? 'block' : 'none';
    }
});
