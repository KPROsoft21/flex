# flex

<p align="center">
  <img src="./flex-logo.png" alt="flex logo" width="140" />
</p>

A retro arcade reaction game built for Expo Go.

flex is a 3x3 tap-speed game with glitchy CRT visuals, multiple cabinet skins, Easy and Hard modes, and session leaderboards.

## Features

- Big retro arcade home screen with Play, Settings, and Leaderboards.
- Play opens a dedicated Easy/Hard mode select screen.
- Easy mode: tap each lit square before it turns off.
- Hard mode: tap non-red lights only. Tapping red ends the run.
- Three missed safe lights ends the game.
- Pacing gets harder as your score rises, with a grace window for close taps.
- Full-screen red alarm flash when you miss.
- Multiple retro styles: CRT Green, Synthwave, Amber Cabinet, and Vector Blue.
- Session leaderboards for Easy and Hard.

## Run

```sh
npm install
npm start
```

Scan the QR code with Expo Go.

## Controls

Tap the active tile as soon as it lights up. In Hard mode, red is a trap.

## Notes

This project targets Expo SDK 54 and uses only React Native core components.
