// ==UserScript==
// @name         Twitter Video Saver
// @namespace    https://f66.dev
// @version      1.2.0
// @description  Adds a "Save Video" context menu option to Twitter videos.
// @author       Vanilla Black
// @match        https://twitter.com/*
// @run-at       document-idle
// @connect      t.co
// @icon         https://www.google.com/s2/favicons?domain=twitter.com
// @updateURL    https://raw.githubusercontent.com/FlyingSixtySix/twitter-video-saver/main/twitter-video-saver.user.js
// @downloadURL  https://raw.githubusercontent.com/FlyingSixtySix/twitter-video-saver/main/twitter-video-saver.user.js
// @homepageURL  https://github.com/FlyingSixtySix/twitter-video-saver
// ==/UserScript==

(async () => {
    setInterval(async () => {
        const videos = document.querySelectorAll('video');
        for (const video of videos) {
            if (video.getAttribute('data-twtdl-injected')) continue;
            video.parentNode.parentNode.parentNode.addEventListener('contextmenu', async () => {
                await new Promise(res => setTimeout(res, 0));
                const rightClickMenu = video.parentNode.parentNode.parentNode.lastChild.lastChild.lastChild;

                if (rightClickMenu.getAttribute('data-twtdl-injected') != null) return;

                const newButton = rightClickMenu.children[0].cloneNode(true);

                const reactElem = video.parentNode.parentNode;
                const propertyNames = Object.getOwnPropertyNames(reactElem);
                const internalPropName = propertyNames.find(name => name.startsWith('__reactInternalInstance'));
                const react = reactElem[internalPropName];
                const playerState = react.sibling.memoizedProps.playerState;
                const id = playerState.source.id;
                let videoSource = playerState.tracks[0].variants.find(variant => variant.type === 'video/mp4');
                videoSource = videoSource || playerState.tracks[0].variants[0];

                const contentType = playerState.tracks[0].contentType;
                switch (contentType) {
                    case 'gif':
                        newButton.children[0].children[0].children[0].innerText = 'Save Gif (Video)';
                        break;
                    case 'media_entity':
                        newButton.children[0].children[0].children[0].innerText = 'Save Video';
                        break;
                    default:
                        newButton.children[0].children[0].children[0].innerText = 'Save Other (Video)';
                        break;
                }
                newButton.onclick = async event => {
                    const progressElement = document.createElement('div');
                    progressElement.style.cssText = `
                        position: absolute;
                        top: 12px;
                        left: 12px;
                        height: 20px;
                        pointer-events: none !important;
                        background: rgba(0, 0, 0, 0.77);
                        color: rgb(255, 255, 255);
                        line-height: 13px;
                        font-size: 13px;
                        font-weight: 700;
                        font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        border-radius: 4px;
                        padding: 0 4px 0 4px;
                        line-height: 20px;
                    `;
                    progressElement.innerText = '0%';
                    video.parentNode.parentNode.parentNode.lastChild.lastChild.appendChild(progressElement);

                    const xhr = new XMLHttpRequest();
                    xhr.responseType = 'blob';
                    xhr.open('GET', videoSource.src, true);
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState !== 4) return xhr.onerror(new Error('status code ' + xhr.status));
                        const a = document.createElement('a');
                        const url = URL.createObjectURL(new Blob([xhr.response], { type: videoSource.type }));
                        a.href = url;
                        a.download = id + '.mp4';
                        a.click();
                        URL.revokeObjectURL(url);
                        a.remove();

                        console.info(`Successfully downloaded video "${id}.mp4"`);
                        setTimeout(() => {
                            progressElement.remove();
                        }, 500);
                    }
                    xhr.onprogress = info => {
                        let progress = Math.floor((info.loaded / info.total) * 100);
                        if (progress < 0) progress = 100;
                        progressElement.innerText = progress + '%';
                    };
                    xhr.onerror = err => {
                        progressElement.innerText = 'ERROR';
                        console.error('Failed to download video:', err.error || 'Unknown', err);
                        setTimeout(() => {
                            progressElement.remove();
                        }, 3000);
                    };
                    xhr.send();
                };
                rightClickMenu.children[0].setAttribute('tabindex', rightClickMenu.length);
                newButton.setAttribute('tabindex', 0);
                rightClickMenu.insertBefore(newButton, rightClickMenu.firstChild);
                rightClickMenu.setAttribute('data-twtdl-injected', 1);
            });
            video.setAttribute('data-twtdl-injected', 1);
        }
    }, 500);
})();
