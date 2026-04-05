function injectDownloadButton() {
    // Select the button container under the video
    const buttonContainer = document.querySelector('#top-level-buttons-computed');

    if (buttonContainer && !document.querySelector('#yt-dl-assist-btn')) {
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'yt-dl-assist-btn';
        downloadBtn.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--outline yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m';
        downloadBtn.innerHTML = `
            <div class="yt-spec-button-shape-next__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
            </div>
            <div class="yt-spec-button-shape-next__button-text-content">Download (YT-DLP API)</div>
        `;

        downloadBtn.style.marginLeft = '8px';
        downloadBtn.style.cursor = 'pointer';
        downloadBtn.style.borderRadius = '18px';
        downloadBtn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        downloadBtn.style.padding = '0 11px';

        downloadBtn.addEventListener('click', async () => {
            const url = window.location.href;
            const btnText = downloadBtn.querySelector('.yt-spec-button-shape-next__button-text-content');

            downloadBtn.style.opacity = '0.5';
            btnText.innerText = 'Initializing...';

            chrome.runtime.sendMessage({
                action: 'download_api',
                url: url,
                quality: '1080p',
                format: 'mp4'
            }, (response) => {
                if (chrome.runtime.lastError || !response || !response.started) {
                    btnText.innerText = 'Extension Error';
                    setTimeout(() => {
                        btnText.innerText = 'Download (YT-DLP API)';
                        downloadBtn.style.opacity = '1';
                    }, 3000);
                } else {
                    btnText.innerText = 'Started! Check Popup';
                    setTimeout(() => {
                        btnText.innerText = 'Download (YT-DLP API)';
                        downloadBtn.style.opacity = '1';
                    }, 3000);
                }
            });
        });

        buttonContainer.appendChild(downloadBtn);
    }
}

// Observe page changes as YouTube is a single-page app
const observer = new MutationObserver(() => {
    if (window.location.href.includes('youtube.com/watch') || window.location.href.includes('youtube.com/shorts')) {
        injectDownloadButton();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial injection
if (window.location.href.includes('youtube.com/watch') || window.location.href.includes('youtube.com/shorts')) {
    injectDownloadButton();
}
