# twitter-video-saver
Adds a "Save Video" context menu option to Twitter videos.

<img src="https://files.f66.dev/uploads/NeJm8KpNfIfj1FJj.png">

## Installation

1. Install [TamperMonkey](https://www.tampermonkey.net/)
2. [Click here](https://raw.githubusercontent.com/FlyingSixtySix/twitter-video-saver/main/twitter-video-saver.user.js) and click "Install" - or alternatively, click on `twitter-video-saver.user.js` in the file list and click "Raw"
3. Refresh Twitter

## Notes
- This userscript makes use of the great [TwitFix](https://github.com/robinuniverse/twitfix) by [Robin Universe](https://github.com/robinuniverse).
If you want to use your own TwitFix instance, simply update the `TWITFIX_URL` constant.
By default, my instance at https://twitfix.f66.dev/ will be used.
- This script is susceptible to breakage if Twitter changes the video element or state structures.
- By default, videos are named after their status ID.
This means you can use the ID in `1465898895230263297.mp4` to get to the original status, like so: https://twitter.com/i/status/1465898895230263297
- As a side-effect of GIFs being served as MP4s, they will be saved as `.mp4`.
