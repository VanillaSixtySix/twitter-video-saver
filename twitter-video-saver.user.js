// ==UserScript==
// @name         Twitter Video Saver
// @namespace    https://f66.dev
// @version      1.0.2
// @description  Adds a "Save Video" context menu option to Twitter videos.
// @author       Vanilla Black
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      video.twimg.com
// @connect      t.co
// @icon         https://www.google.com/s2/favicons?domain=twitter.com
// @updateURL    https://raw.githubusercontent.com/FlyingSixtySix/twitter-video-saver/main/twitter-video-saver.user.js
// @downloadURL  https://raw.githubusercontent.com/FlyingSixtySix/twitter-video-saver/main/twitter-video-saver.user.js
// @homepageURL  https://github.com/FlyingSixtySix/twitter-video-saver
//
// ***** ADD A @connect <your URL> IF UPDATING TWITFIX_URL *****
// @connect      fxtwitter.com
// @connect      twitfix.f66.dev
// ==/UserScript==

(async () => {
    // TwitFix host - be sure there's a trailing slash.
    // ALSO BE SURE TO ADD A @connect LINE IN ==UserScript== ABOVE
    const TWITFIX_URL = 'https://twitfix.f66.dev/';

    /**
     * Downloads data with the given file name and type.
     *
     * Credit: https://stackoverflow.com/a/30832210/6901668
     *
     * @param data The binary data.
     * @param filename The output filename.
     * @param type The MIME type.
     */
    function downloadFile(data, filename, type) {
        const file = new Blob([data], { type });
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(file, filename);
        } else {
            const a = document.createElement('a');
            const url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    /**
     * Downloads the video from the given Tweet path, i.e. /i/status/[~19 digit snowflake].
     *
     * @param path The path to the Tweet with the video.
     */
    function downloadVideo(path) {
        // Because of CSP, we have to request using Tampermonkey.
        GM_xmlhttpRequest({
            method: 'GET',
            url: TWITFIX_URL + 'dir' + path,
            responseType: 'blob',
            headers: {
                referer: 'https://twitter.com',
                origin: 'https://twitter.com'
            },
            onload: function(info) {
                if (info.readyState === 4 && info.status === 200) {
                    // info.response is the video binary
                    downloadFile(info.response, path.split('/').at(-1), 'video/mp4');
                }
            }
        });
    }

    // It's simpler to use an interval instead of a MutationObserver in this case.
    setInterval(async () => {
        // Get all the videos on the page. I haven't run into instances of false-positives yet!
        const videos = document.querySelectorAll('video');
        for (const video of videos) {
            // If this video has already been injected, continue to the next video.
            if (video.getAttribute('data-twtdl-injected')) continue;
            // Add an event listener to the third parent for right clicks.
            video.parentNode.parentNode.parentNode.addEventListener('contextmenu', async event => {
                // Wait for right click menu to be created in DOM.
                await new Promise(res => setTimeout(res, 0));
                const rightClickMenu = video.parentNode.parentNode.parentNode.lastChild.lastChild.lastChild;

                // If we've already injected into the right click menu, nothing needs done.
                // This is needed because you can right click multiple times on a video and keep the same element.
                if (rightClickMenu.getAttribute('data-twtdl-injected') != null) return;

                // Create the 'Save X' button based on the existing 'Copy X Address' button.
                const newButton = rightClickMenu.children[0].cloneNode(true);

                // If the user were on the status of the video directly (i.e. /i/status/...), we could just use the
                // path and pass it into TwitFix. However, this fails if the user is on the timeline or looking at
                // a quote tweet of the video's status. Accessing the ID of the video's status on the timeline is
                // fairly simple if it's not quote tweeted--just get the href attribute from the timestamp element.
                // If it's quote-tweeted, that timestamp element isn't a link but just text, and there are no other
                // attributes in DOM telling us what the status ID of that quote tweet could be.
                // The only solution I can think of is to find and access React's internal instance for a nearby
                // element that holds the props we need to get information on the video's status.

                // The specific element we need is a couple parents up.
                const reactElem = video.parentNode.parentNode;
                // Get all of the property names. This should hold two React-specific properties - one for the instance
                // and one for handling events.
                const propertyNames = Object.getOwnPropertyNames(reactElem);
                // We just need the internal instance, so find the full property name that starts with it.
                const internalPropName = propertyNames.find(name => name.startsWith('__reactInternalInstance'));
                // Now access the internal react instance.
                const react = reactElem[internalPropName];
                // Access the playerState prop from a sibling's memoized props. I don't know what this means but it has
                // what we need.
                const playerState = react.sibling.memoizedProps.playerState;
                // Get the status ID of the video source.
                const id = playerState.source.id;

                // Get the type of media.
                const contentType = playerState.tracks[0].contentType;
                // Depending on the type, set the text of the button.
                switch (contentType) {
                    // For whatever reason (probably compatibility and lightweightness), GIFs are served as MP4s.
                    case 'gif':
                        newButton.children[0].children[0].children[0].innerText = 'Save Gif (Video)';
                        break;
                    case 'media_entity':
                        newButton.children[0].children[0].children[0].innerText = 'Save Video';
                        break;
                    // Just in case there's something I'm not accounting for, consider it as 'other' but still a video.
                    default:
                        newButton.children[0].children[0].children[0].innerText = 'Save Other (Video)';
                        break;
                }
                // When the button is clicked, download the video.
                newButton.onclick = () => downloadVideo('/i/status/' + id);
                // Update the tabindex of the "Copy Video Address" button for accessibility.
                rightClickMenu.children[0].setAttribute('tabindex', rightClickMenu.length);
                // Set the tabindex of the "Save Video" button to be the first.
                newButton.setAttribute('tabindex', 0);
                // Add the button to the beginning of the right cick menu.
                rightClickMenu.insertBefore(newButton, rightClickMenu.firstChild);
                // Set the injected attribute so we don't add more than one "Save Video" button.
                rightClickMenu.setAttribute('data-twtdl-injected', 1);
            });
            // Set the injected attribute so we don't add more than one contextmenu listener to the same video.
            video.setAttribute('data-twtdl-injected', 1);
        }
    }, 500);
})();
