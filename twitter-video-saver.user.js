// ==UserScript==
// @name         Twitter Video Saver
// @namespace    https://f66.dev
// @version      1.5.2
// @description  Adds a "Save Video" context menu option to Twitter videos.
// @author       VanillaSixtySix
// @match        https://twitter.com/*
// @match        https://x.com/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?domain=twitter.com
// @updateURL    https://raw.githubusercontent.com/FlyingSixtySix/twitter-video-saver/main/twitter-video-saver.user.js
// @downloadURL  https://raw.githubusercontent.com/FlyingSixtySix/twitter-video-saver/main/twitter-video-saver.user.js
// @homepageURL  https://github.com/FlyingSixtySix/twitter-video-saver
// @grant        GM.xmlHttpRequest
// @connect      api.f66.dev
// ==/UserScript==

(async () => {
    const isFirefox = navigator.userAgent.includes("Firefox");

    const BUTTON_LABELS = {
        gif: 'Save Gif (Convert)',
        media_entity: 'Save Video',
    };

    const PROGRESS_STYLE = `
        position: absolute;
        top: 12px;
        left: 12px;
        height: 20px;
        pointer-events: none !important;
        background: rgba(0, 0, 0, 0.77);
        color: rgb(255, 255, 255);
        font-size: 13px;
        font-weight: 700;
        font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        border-radius: 4px;
        padding: 0 4px 0 4px;
        line-height: 20px;
    `;

    async function getReactFiber(reactElem) {
        if (!isFirefox) {
            const propName = Object.getOwnPropertyNames(reactElem).find(n => n.startsWith('__reactFiber'));
            return reactElem[propName];
        }
        // Firefox 122 doesn't expose object properties of a DOM element to userscripts
        unsafeWindow.reactElem = reactElem;
        await new Promise(res => {
            const s = document.createElement('script');
            s.src = `data:text/javascript,window.react = window.reactElem[Object.getOwnPropertyNames(window.reactElem).find(n => n.startsWith('__reactFiber'))]`;
            document.body.appendChild(s);
            setTimeout(res);
        });
        return unsafeWindow.react;
    }

    function pickVideoSource(variants) {
        const best = variants
            .filter(v => v.type === 'video/mp4' && v.src)
            .reduce((acc, v) => (acc.bitrate > v.bitrate ? acc : v), { bitrate: 0 });
        return best.src ? best : variants[0];
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function fetchGif(src) {
        return new Promise((resolve, reject) => {
            const started = Date.now();
            const elapsed = () => ((Date.now() - started) / 1000).toFixed(2) + 's';
            console.info('[twtdl] fetchGif start', { src });
            GM.xmlHttpRequest({
                url: 'https://api.f66.dev/mediaconv/',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                responseType: 'blob',
                data: JSON.stringify({ url: src, to: 'gif' }),
                timeout: 300000,
                onloadstart: e => console.info('[twtdl] fetchGif onloadstart', elapsed(), e),
                onprogress: e => console.info('[twtdl] fetchGif onprogress', elapsed(), { loaded: e.loaded, total: e.total }),
                onreadystatechange: e => console.info('[twtdl] fetchGif onreadystatechange', elapsed(), { readyState: e.readyState, status: e.status, statusText: e.statusText }),
                onload: res => {
                    console.info('[twtdl] fetchGif onload', elapsed(), { status: res.status, statusText: res.statusText, responseHeaders: res.responseHeaders, finalUrl: res.finalUrl, blobSize: res.response && res.response.size });
                    res.status === 200 ? resolve(res.response) : reject(new Error('status ' + res.status));
                },
                onerror: err => {
                    console.error('[twtdl] fetchGif onerror', elapsed(), { status: err.status, statusText: err.statusText, responseHeaders: err.responseHeaders, finalUrl: err.finalUrl, error: err.error });
                    reject(err);
                },
                ontimeout: e => {
                    console.error('[twtdl] fetchGif ontimeout', elapsed(), e);
                    reject(new Error('timeout'));
                },
                onabort: e => {
                    console.error('[twtdl] fetchGif onabort', elapsed(), e);
                    reject(new Error('abort'));
                },
            });
        });
    }

    function fetchVideo(src, type, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
            xhr.open('GET', src, true);
            xhr.onload = () => xhr.status === 200
                ? resolve(new Blob([xhr.response], { type }))
                : reject(new Error('status ' + xhr.status));
            xhr.onerror = reject;
            xhr.onprogress = info => {
                const pct = Math.min(100, Math.max(0, Math.floor((info.loaded / info.total) * 100)));
                onProgress(pct);
            };
            xhr.send();
        });
    }

    async function handleDownload(video, contentType, videoSource, id) {
        const progress = document.createElement('div');
        progress.style = PROGRESS_STYLE;
        progress.innerText = '0%';
        video.parentNode.parentNode.nextSibling.firstChild.children[1].appendChild(progress);

        try {
            const isGif = contentType === 'gif';
            console.info('[twtdl] handleDownload start', { id, contentType, isGif, videoSource });
            if (isGif) progress.innerText = 'converting…';
            const blob = isGif
                ? await fetchGif(videoSource.src)
                : await fetchVideo(videoSource.src, videoSource.type, pct => progress.innerText = pct + '%');
            console.info('[twtdl] handleDownload got blob', { size: blob && blob.size, type: blob && blob.type });
            const filename = `${id}.${isGif ? 'gif' : 'mp4'}`;
            triggerDownload(blob, filename);
            console.info(`Successfully downloaded "${filename}"`);
            setTimeout(() => progress.remove(), 500);
        } catch (err) {
            progress.innerText = 'ERROR';
            console.error('Failed to download:', err);
            setTimeout(() => progress.remove(), 3000);
        }
    }

    async function injectMenu(video) {
        // X renders the context menu outside the video player.
        const menuItem = document.querySelector('[role="menu"] [role="menuitem"]');
        const menu = menuItem?.parentElement;
        if (!menu || menu.hasAttribute('data-twtdl-injected')) return;

        const button = menuItem.cloneNode(true);
        const react = await getReactFiber(video.parentNode.parentNode);
        if (!menu.isConnected || menu.hasAttribute('data-twtdl-injected')) return;
        const playerState = react.sibling.memoizedProps.playerState;
        const id = playerState.source.id;
        const contentType = playerState.tracks[0].contentType;
        const videoSource = pickVideoSource([...playerState.tracks[0].variants]);

        button.querySelector('span').textContent = BUTTON_LABELS[contentType] || 'Save Other (Video)';

        button.onclick = () => {
            document.body.click();
            handleDownload(video, contentType, videoSource, id);
        };
        button.onkeydown = event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                button.click();
            }
        };

        button.setAttribute('tabindex', 0);
        menu.insertBefore(button, menu.firstChild);
        menu.setAttribute('data-twtdl-injected', 1);
    }

    setInterval(() => {
        for (const video of document.querySelectorAll('video')) {
            if (video.getAttribute('data-twtdl-injected')) continue;
            video.parentNode.parentNode.parentNode.addEventListener('contextmenu', async () => {
                await new Promise(res => setTimeout(res, 0));
                injectMenu(video).catch(err => console.error('Failed to add save menu:', err));
            });
            video.setAttribute('data-twtdl-injected', 1);
        }
    }, 500);
})();
