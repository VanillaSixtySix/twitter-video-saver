# twitter-video-saver-userscript
Adds a "Save Video" context menu option to Twitter videos.

<img src="https://files.f66.dev/uploads/NeJm8KpNfIfj1FJj.png">

## Installation
[Click here](https://raw.githubusercontent.com/FlyingSixtySix/twitter-video-saver/main/twitter-video-saver.user.js) and click "Install"!

If needed, updates will be applied depending on your TamperMonkey/GreaseMonkey update frequency.

## Notes
- This userscript makes use of the great [TwitFix](https://github.com/robinuniverse/twitfix) by [Robin Universe](https://github.com/robinuniverse).
If you want to update it, simply change `TWITFIX_URL` near the top of `userscript.js`.
- This script is susceptible to breakage if Twitter changes the video element or state structures.
- By default, videos are named after their status ID.
This means you can use the ID in `1465898895230263297.mp4` to get to the original status, like so: https://twitter.com/i/status/1465898895230263297
