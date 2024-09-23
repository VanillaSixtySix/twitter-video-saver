# twitter-video-saver
Adds a "Save Video" context menu option to Twitter videos.

## Installation

1. Install [TamperMonkey](https://www.tampermonkey.net/)
2. [Click here](https://raw.githubusercontent.com/FlyingSixtySix/twitter-video-saver/main/twitter-video-saver.user.js) and click "Install" - or alternatively, click on `twitter-video-saver.user.js` in the file list and click "Raw"
3. Refresh Twitter

## Notes
- This script is susceptible to breakage if Twitter changes the video element or state structures.
- By default, videos are named after their status ID.
This means you can use the ID in `1465898895230263297.mp4` to get to the original status, like so: https://twitter.com/i/status/1465898895230263297
- GIFs will be converted by a hosted [mediaconf](https://github.com/VanillaSixtySix/mediaconv) instance.
