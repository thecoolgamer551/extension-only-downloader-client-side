document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const downloadBtn = document.getElementById('download-btn');
    const settingsToggle = document.getElementById('settings-toggle');
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const backBtn = document.getElementById('back-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    const videoInfoElement = document.getElementById('video-info');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const qualitySelect = document.getElementById('quality-select');
    const formatSelect = document.getElementById('format-select');
    const pathInput = document.getElementById('path-input');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('spinner');

    const dlSetupBtn = document.getElementById('dl-setup-btn');
    const dlBackendBtn = document.getElementById('dl-backend-btn');
    const shutdownBtn = document.getElementById('shutdown-btn');

    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');

    let isDownloading = false;

    async function pollProgress() {
        if (!isDownloading) return;
        try {
            const res = await fetch(`${backendUrl}/progress`);
            const data = await res.json();
            const p = data.progress || 0;
            progressBar.style.width = `${p}%`;
            progressPercent.innerText = `${p.toFixed(1)}%`;
            if (p < 100 && isDownloading) setTimeout(pollProgress, 600);
            else if (p >= 100) {
                isDownloading = false;
                setLoading(false);
                progressContainer.style.display = 'none';
            }
        } catch (e) { }
    }

    const offlineView = document.getElementById('offline-view');
    const setupNowBtn = document.getElementById('setup-now-btn');

    const backendUrl = 'http://localhost:3001';

    // Disable quality if format is mp3
    formatSelect.addEventListener('change', () => {
        qualitySelect.disabled = formatSelect.value === 'mp3';
    });

    // 1. Backend Check
    async function checkBackend() {
        try {
            const response = await fetch(`${backendUrl}/status`);
            const data = await response.json();
            if (data.status === 'running') {
                statusDot.classList.add('online');
                statusText.innerText = 'System Online';
                pathInput.value = data.config.downloadPath;

                mainView.classList.add('active');
                offlineView.classList.remove('active');

                // Check for active download
                const progRes = await fetch(`${backendUrl}/progress`);
                const progData = await progRes.json();
                if (progData.active) {
                    isDownloading = true;
                    progressContainer.style.display = 'block';
                    progressBar.style.width = `${progData.progress}%`;
                    progressPercent.innerText = `${progData.progress.toFixed(1)}%`;
                    setLoading(true);
                    pollProgress();
                }
                return true;
            }
        } catch (error) {
            statusDot.classList.remove('online');
            statusText.innerText = 'System Offline';

            mainView.classList.remove('active');
            offlineView.classList.add('active');
            return false;
        }
    }

    const isOnline = await checkBackend();

    // Setup Tools - Bundle download from extension itself
    const downloadInternal = (fileName) => {
        const url = chrome.runtime.getURL(`bin/${fileName}`);
        chrome.downloads.download({
            url: url,
            filename: fileName,
            saveAs: true
        });
    };

    setupNowBtn.onclick = () => downloadInternal('yt-assist-setup.exe');
    dlSetupBtn.onclick = () => downloadInternal('yt-assist-setup.exe');
    dlBackendBtn.onclick = () => downloadInternal('yt-assist-backend.exe');

    shutdownBtn.onclick = async () => {
        if (!confirm('Stop backend system?')) return;
        try {
            await fetch(`${backendUrl}/shutdown`, { method: 'POST' });
            window.close();
        } catch (e) {
            alert('Already offline.');
        }
    };

    // Tab Info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && (tab.url.includes('youtube.com/watch') || tab.url.includes('youtube.com/shorts'))) {
        videoInfoElement.innerText = tab.title.replace(' - YouTube', '');
        if (isOnline) downloadBtn.disabled = false;
    } else {
        videoInfoElement.innerText = 'Not a video page.';
        downloadBtn.disabled = true;
    }

    settingsToggle.onclick = () => { mainView.classList.remove('active'); settingsView.classList.add('active'); };
    backBtn.onclick = () => { settingsView.classList.remove('active'); mainView.classList.add('active'); };

    saveSettingsBtn.onclick = async () => {
        const downloadPath = pathInput.value;
        try {
            const response = await fetch(`${backendUrl}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ downloadPath })
            });
            if (response.ok) { alert('Saved!'); backBtn.click(); }
        } catch (error) { alert('Connection error.'); }
    };


    downloadBtn.onclick = async () => {
        // Instant UI feedback
        isDownloading = true;
        setLoading(true);
        progressContainer.style.display = 'block';
        progressBar.style.width = '2%'; // Start with a tiny bit to show it's alive
        progressPercent.innerText = '0.0%';

        pollProgress();

        const [currTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        try {
            const response = await fetch(`${backendUrl}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: currTab.url,
                    quality: qualitySelect.value,
                    format: formatSelect.value
                })
            });

            if (response.ok) {
                statusText.innerText = 'Success! Check your folder.';
                progressBar.style.width = '100%';
                progressPercent.innerText = '100%';
                setTimeout(() => {
                    statusText.innerText = 'System Online';
                    progressContainer.style.display = 'none';
                }, 5000);
            } else {
                const data = await response.json();
                alert(`Error: ${data.error}`);
                progressContainer.style.display = 'none';
            }
        } catch (error) {
            alert('Backend connection lost.');
            progressContainer.style.display = 'none';
        } finally {
            isDownloading = false;
            setLoading(false);
        }
    };

    function setLoading(isLoading) {
        downloadBtn.disabled = isLoading;
        btnText.innerText = isLoading ? 'Working...' : 'Download Clip';
        spinner.style.display = isLoading ? 'block' : 'none';
    }
});
