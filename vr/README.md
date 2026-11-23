# TableTop VR showroom

Standalone, buildless WebXR page at `/vr/`. The Unity game and its project settings are unchanged.

## Included

- Three game display tables using actual solo screenshots and existing solo/multiplayer videos.
- The original KUBIKOS Penguin mesh and Idle animation, converted from the imported FBX to GLB. The atlas is a resized copy of the original texture; no replacement animal was generated.
- Desktop/touch orbit preview, accessible HTML game buttons, reduced-motion support, and a regular website fallback.
- WebXR controller ray selection for either input source, hit dots, and optional browser hand tracking/pinch selection. In-world video Play/Pause, Sound, Close, and Meta Store buttons.
- No automatic video download/playback. One video at a time. No shadows, postprocessing, extra physics, or online services.

## Sources and dependencies

`assets/penguin.glb`: derived from `Assets/KUBIKOS-Animated Cube Mini Animals 2/Animals2_Models/Penguin.fbx`, Idle frames 0–40 at 30fps, matching its Unity import metadata. Original model/texture remain subject to the purchased asset license; they are included only as assets of this showroom, not a reusable asset download offering.

`assets/animal-atlas.webp`: original `KUBIKOS_Animals2_D.png`, downsampled to 1024 square for the small companion display. Original UVs are retained; runtime TextureLoader uses flipY=true.

Three.js 0.187.0, self-hosted in `showroom.bundle.js`; see `THREE-LICENSE.txt`. The entry source is `showroom.js`. Rebuild with esbuild, ESM output, ES2022 target and minification. The developer's isolated dependency/build tools live outside the website repository at `C:/Users/micha/Documents/Codex/WebXR-Tools`; they do not affect the site's legacy package.json/node_modules.

## Verification limits

Static source/bundle checks, glTF validation, animation/geometry checks, preservation of existing media, and HTTP checks are automated. Actual WebXR session, hand tracking, device frame timing, audiovisual appearance, and controller selection require browser/headset testing. Do not claim device verification from static checks.

## Quest test

Open https://www.tabletopcubes.com/vr/ in the headset browser (not Unity/Quest Link). Select Enter VR and allow the session. Try each game's display with left and right controllers; check the hit dot, Play/Pause, Sound, Close, and Meta Store. If using hands, test pinch selection separately; availability depends on browser support. Confirm the penguin animates, textures are correct, and the room stays stable when turning your head. Exit VR and check the normal site still works.

This is a showroom, not a browser port of the playable Unity games.
