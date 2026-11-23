# TableTop VR showroom

Standalone, buildless WebXR page at `/vr/`. The Unity game and its project settings are unchanged.

## Included

- Three game display tables using actual solo screenshots and existing solo/multiplayer videos.
- The original KUBIKOS Penguin mesh and Idle animation, converted from the imported FBX to GLB. The atlas is a resized copy of the original texture; no replacement animal was generated.
- Desktop/touch orbit preview, accessible HTML game buttons, reduced-motion support, and a regular website fallback.
- WebXR controller ray selection for either input source, hit dots, and optional browser hand tracking/pinch selection. In-world video Play/Pause, Sound, Close, and Meta Store buttons.
- Six clear-floor teleport destinations. Either controller's select/trigger or either tracked hand's browser pinch/select uses the same targets. Tracked physical room offsets and head height are preserved; no forced camera turn. The video viewer opens in front of the current viewing position and blocks teleport targets until closed.
- Environment geometry follows `TableTopVirtualRoom.BuildRoom`: 12m square shell, ceiling at 4.55m, twenty wall bays, half-meter floor lines and cyan trim, rendered in four instanced batches. Showroom game displays remain separate exhibits.
- Teleport reads the rig-parented application camera, not the detached XR ArrayCamera, so repeated teleports retain the rig offset. Regression checks model a detached XR camera and repeat floor-ray selections with both input sources and a nonzero physical tracking offset.
- No automatic video download/playback. One video at a time. No shadows, postprocessing, extra physics, or online services.

## Sources and dependencies

`assets/penguin.glb`: derived from `Assets/KUBIKOS-Animated Cube Mini Animals 2/Animals2_Models/Penguin.fbx`, Idle frames 0â€“40 at 30fps, matching its Unity import metadata. Original model/texture remain subject to the purchased asset license; they are included only as assets of this showroom, not a reusable asset download offering.

`assets/animal-atlas.webp`: original `KUBIKOS_Animals2_D.png`, downsampled to 1024 square for the small companion display. Original UVs are retained; runtime TextureLoader uses flipY=true.

Three.js 0.187.0, self-hosted in `showroom.bundle.js`; see `THREE-LICENSE.txt`. The entry source is `showroom.js`. Rebuild with esbuild, ESM output, ES2022 target and minification. The developer's isolated dependency/build tools live outside the website repository at `C:/Users/micha/Documents/Codex/WebXR-Tools`; they do not affect the site's legacy package.json/node_modules.

## Verification limits

Static source/bundle checks, glTF validation, animation/geometry checks, preservation of existing media, and HTTP checks are automated. Actual WebXR session, hand tracking, device frame timing, audiovisual appearance, and controller selection require browser/headset testing. Do not claim device verification from static checks.

## Quest test

Open https://www.tabletopcubes.com/vr/ in the headset browser (not Unity/Quest Link). Select Enter VR and allow the session. Try each game's display with left and right controllers; check the hit dot, Play/Pause, Sound, Close, and Meta Store. If using hands, test pinch selection separately; availability depends on browser support. Confirm the penguin animates, textures are correct, and the room stays stable when turning your head. Exit VR and check the normal site still works.

## Playable mini samples

Selecting a display's PLAY circle hides that exhibit and opens its video panel plus a separate mini board in front. Either WebXR input source uses the same point-and-select buttons. Desktop users choose Play mini sample in the details dialog, then use the same controls with mouse/touch.

- Cubes: four small piece shapes, one-cell movement, bounded quarter turns, hard drop, line clearing, game over and a 30-point sample goal.
- Snake: a 10x10 sample board, growth/food, edge wrapping and self collision, directional buttons and a five-food goal.
- Pongo: point at the board to position the paddle, bounce at a moving target, three lives and a 50-point goal. Left/right buttons are also available.

Only one sample runs at once. Sample cells use five instanced batches; targets, generated text textures, mesh buffers and materials are released when closing or switching. No network gameplay or Unity services are used. These are simplified browser samples, not full ports of the Unity games or their gesture recognizers.

At a sample win or game over, an in-world purchase card (and accessible desktop card) offers Meta Store, itch.io, Play Again, and Back to Room. Store buttons explicitly exit an active XR session before navigating. End detection is one-shot per round and is reset on replay.

Seated layout: the exhibit fits to tracked eye height (tested at 0.9m, 1.2m and 1.8m in the simulation) without altering headset tracking. Sample control rows share one plane, have separated vertical bounds, and sit below the board's front edge. Physical headset appearance remains to be checked.

## Score walls

Left wall: top five full-game scores for Cubes, Snake and Pongo, with original animal portraits. Right wall: current high-score leader per game, their portrait and a gold trophy composition. These are leaderboard leaders, not a claim about the last multiplayer match. New Rankings and Champions floor destinations provide closer viewing.

Uses the existing public leaderboard snapshot, updated hourly by GitHub Actions. Server-side export explicitly requests score metadata and publishes only the stable profileIcon ID (0–11), rank, display name and points. No service credentials are sent to the browser. Missing old icon metadata is visibly unknown. Six cached canvas textures refresh only when data/images change; data is checked every five minutes, not every frame.

Samples now open at 3.8 normalized meters rather than 3.3, preserving the seated fit. Step Back moves the rig 0.6m opposite horizontal head direction while keeping the sample anchored and preserving tracked eye height. It debounces selects and rejects destinations near walls, tables or the companion pedestal. Room navigation has Step Back and Welcome; each sample has Step Back and Back to Room near its game controls.

Current sample distance: 4.75 normalized meters, 25% beyond the previous 3.8m placement. Cubes Forward/Back moves the active piece through ten depth lanes with bounds and occupancy checks; cleared ten-cell lines collapse blocks above in the same lane. Snake wraps modulo ten across all four edges. Sample blocks use rounded geometry and shaded materials in five instanced batches; the Pongo paddle is rounded. Room Step Back and Welcome buttons are reduced, as is the sample's Step Back button.
