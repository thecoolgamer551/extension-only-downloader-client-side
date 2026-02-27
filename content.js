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
            <div class="yt-spec-button-shape-next__button-text-content">Download (YT-DLP)</div>
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

            try {
                const response = await fetch('http://localhost:3001/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url,
                        formatPreference: 'best'
                    })
                });

                if (response.ok) {
                    btnText.innerText = 'Started! Check Backend';
                    setTimeout(() => {
                        btnText.innerText = 'Download (YT-DLP)';
                        downloadBtn.style.opacity = '1';
                    }, 3000);
                } else {
                    const data = await response.json();
                    btnText.innerText = `Error: ${data.error.substring(0, 15)}...`;
                    setTimeout(() => {
                        btnText.innerText = 'Download (YT-DLP)';
                        downloadBtn.style.opacity = '1';
                    }, 5000);
                }
            } catch (err) {
                btnText.innerText = 'Backend Offline';
                setTimeout(() => {
                    btnText.innerText = 'Download (YT-DLP)';
                    downloadBtn.style.opacity = '1';
                }, 3000);
            }
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
