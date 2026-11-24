# TableTop VR arcade

Standalone browser showroom at /vr/. The Unity project is unchanged.

## Animal introduction

The approved 40-second Cube World Adventure promo is near the top of Home and first on the VR page. Existing media is retained. The video loads on request and pauses the desktop 3D renderer while playing. Its poster is a frame from the same movie.

First VR entry opens a real 3D introduction, rather than a flat movie: choose Follow the Animals for a moving forest-to-spaceship journey or Stay in Place for fixed viewpoints with a faded scene transition. Physical head rotation and leaning remain tracked. Either hand's browser pinch or either controller trigger selects the shared controls. Sound and Skip controls are available before choosing a view. Starting either view hides the entire journey menu, including its title and input rays; completion returns to the existing arcade and restores its sound setup controls. Animal Journey replays it from room navigation.

After the introduction, room sound/music and replay controls remain available until Welcome is selected. Welcome collapses that panel to just Welcome and Step Back, each 0.40m wide by 0.12m tall. They sit below eye level and about 30 degrees to the right, face the user, and remain anchored rather than following head turns. Teleport/Step Back repositions them; seated height and room bounds are respected. A fresh VR session or replay ending restores the sound setup panel. Individual game panels retain their existing audio controls.

All in-world buttons now use the shared arcade-buttons.js design: charcoal beveled 3D housings, cut-corner neon faceplates, readable control glyphs, inset rails and restrained hover/press highlights. Cubes controls match violet cabinet trim, Snake green and Pongo gold; room controls use teal with gold Welcome/primary actions. Their previous sizes, positions, hit areas and compact-navigation behavior are retained. Faces remain unlit for legibility, and glow is baked into a 600×160 canvas rather than using additional lights or bloom. Each button uses 110 triangles / two meshes, owns its disposable resources, and redraws its existing texture only when its label changes.

The five video-panel controls use uniform x/y scaling to retain the face artwork's 3.75:1 proportions: the 0.60m buttons are 0.16m tall and the 1.0m Music button is 0.267m tall. These replace the old 0.60×0.36m buttons that stretched letters vertically. Their faces use 1200×320 textures, larger 58px logical text, mipmaps and device-supported anisotropic filtering capped at 8×. Sound/music label changes retain that resolution. Other controls keep their existing texture budget and layout. Checks cover proportions and nonoverlap under seated/standing viewer scaling; perceived headset sharpness is unverified.

Scenery is exported from the approved isolated Unity promo set, grouped into 60 material batches / 2,570 instances of one 108-triangle rounded cube. Only the current forest or interior is visible. All twelve original KUBIKOS animals retain their skinned Idle and Walk animation clips (268–1,168 triangles each). Their shared atlas and guarded seats keep heads clear of the game boards. They are embedded scene content, not an asset distribution. The gameplay Unity project is unchanged.

The scenery JSON (~0.4 MB), twelve animal models (~2.2 MB total), and journey music load only on VR entry, with shader preparation before the view opens. The flat movie (~16.6 MB) is separate and does not preload. Journey music uses the user's Gear 180 track and a 127 BPM timing grid; prior mute/volume preferences persist. The original menu track resumes afterward. Aggregate analytics cover promo play/completion and journey open, view choice, skip/completion, and loading failure without motion or profile data.

The finale revision uses the song's lift near 1:33: a 128-beat phrase jump at 27.926 seconds moves to source time 1:28.398, with a short beat-aligned crossfade. The last accented downbeat is at 37.847 (source 1:38.320), followed by a filtered stereo echo tail and silence at the file boundary. Both movie versions keep identical decoded video frames. The VR introduction now lasts 40 seconds so its final hit and tail finish before the menu track resumes. The previous movie and music assets remain available; the pages use promo-finale.mp4 and the 3D introduction uses journey-finale.mp3 to avoid stale cached audio.

Additional checks validate all twelve GLBs, actual skeletal motion, scenery matrices, seated height, physical leaning/head orientation, board clearance, both input paths, moving/stationary choices, automatic completion, skip/replay, room restoration, and audio-clock switching. These are CPU/mocked-browser checks. Browser preview access was unavailable; visual rendering and headset performance require a device check. On Quest, enter VR, try Follow, Music and Skip, then replay with Stay in Place and check the existing samples.

## Experience

- A 12m virtual arcade based on TableTopVirtualRoom.BuildRoom, with six floor teleport destinations and Step Back / Welcome navigation.
- Three arcade exhibits, game-specific 20s landscape videos and simplified playable browser samples.
- The original Penguin, White Fox and Unicorn models, reduced on the Companion Club pedestal. GLBs are derived from the purchased KUBIKOS FBXs, retain Idle frames 0-40 at 30fps, and share the original 2048px texture atlas. These are embedded showroom assets, not a reusable asset download.
- Left wall: real top-five scores with saved profile icons. Right wall: each game's current high-score champion, portrait and trophy. Scores come from the existing public snapshot; old rows without metadata have an unknown icon.
- Mood lighting, one prefiltered environment, one 1024px soft-shadow pass, neon wall frames and rounded cabinets. UI and video bypass scene tone mapping.
- Loading waits for assets and sample shader preparation; it has no forced delay.

## Samples and input

Cubes has bounded x/z movement, quarter turns, hard drop, depth-lane line clearing and a 30-point preview goal. Snake moves in all six directions, wraps x/y/z, grows with food, detects self-collision and has a five-food goal. Pongo uses 3D constant-speed flight, horizontal tiltable paddle, three 1.35/1/.65 targets worth 5/10/15 points, an open bottom, three lives, swept hits, debris, trail and landing ring. Its preview goal is 50. These follow the core solo mechanics, not the complete Unity game or progression.

Either hand's browser pinch/select or either controller's trigger can select controls. XR-standard thumbsticks now also control Cubes and Snake: left stick moves/steers x/z; right stick turns Cubes or selects Snake Up/Down. A/X starts an inactive sample and drops a piece during Cubes play; B/Y restarts. Dead zone, neutral hysteresis, delayed cell repeat and one-turn-per-flick avoid drift/spam. Joysticks do not move the room rig.

Exhibits fit to eye height without changing headset tracking. Control rows share a plane and do not overlap. Samples normally start 4.75 normalized meters away, capped to the room interior from rear positions. Snake's floor marker is behind the animal pedestal. Step Back leaves the game anchored and rejects destinations near walls/tables.

A sample ending offers Meta Store, itch.io, Play Again and Back to Room. Store selection explicitly exits VR before navigation. One sample runs at a time; its targets, buffers and generated textures are released on close/switch.

## Media

Videos: Cubes source 182-202s, Snake 373-393s, Pongo 548-568s from the user's Nov22 1:00 PM solo recording. Exports are 1280x720 / 30fps / 20s with fit/pad and square pixels. WhatsApp source is about 480p: these exports are upscaled, not restored native HD. Original conversation is omitted; the user's existing Mixkit689 music is quiet background audio. No prior site media was removed. Runtime video fitting also prevents stretching unusual aspect ratios.

The page and in-world panel clearly distinguish simplified web samples from full-game footage.

## Analytics and discoverability

assets/analytics.js loads the user's tabletopcubes.goatcounter.com tracker on Home, VR, About and Privacy pages. Named aggregate events cover sample open/start/end/win, video play/completion, VR entry/exit and Meta/itch store clicks. No player names, scores, hand poses or gamepad-axis payloads are sent. A bounded queue covers tracker load delays. Validation sends no production events; private dashboard totals have not been read. Counts depend on visitor blocking/privacy settings.

SEO includes canonical URLs/descriptions on four pages, VR social previews, WebApplication/WebSite JSON-LD, readable HTML sample/control information, robots.txt and sitemap.xml. This prepares discoverability; indexing/rankings and Search Console ownership are not established by deployment. The website-specific analytics notice is separate from the legacy game privacy text.

## Build and verification

Three.js 0.187.0, self-hosted in showroom.bundle.js; see THREE-LICENSE.txt. Source entry: showroom.js. Bundle with esbuild, ESM, ES2022, minified. Isolated build/export/test tools live outside this repository under Documents/Codex/WebXR-Tools; legacy website dependencies are unchanged.

Checks include GLB validity and animation, original media preservation, both input-source ray paths, thumbstick dead zone/repeat/edges, three-axis wrapping, 3D Pongo target/paddle/miss rules, seated layout, teleport offsets, lifecycle cleanup, aspect ratios, analytics queue/payloads, SEO metadata and live HTTP assets. Browser/GPU APIs are mocked in interaction tests. Actual headset visuals, physical input, device frame timing and live private analytics totals remain unverified.

Quest test: open https://www.tabletopcubes.com/vr/ in the headset browser, refresh, enter VR, and try both controllers then hands. Check menus, floor teleport, Step Back, all sample controls, thumbsticks, video playback and end-store choices. This does not require a Unity rebuild.

## Webpage audio

Background loop: the user's mixkit-game-level-music-689.wav, normalized to -18 LUFS and exported as 128kbps MP3. UI click: the user's mixkit-modern-technology-select-3124.wav, trimmed to 0.24 seconds with a short fade and MP3 export. Originals remain unchanged.

Music begins only after a user interaction, defaults to quiet volume, and pauses for gameplay videos or a hidden page. The video track remains the only music during video playback. Master mute applies to music, clicks and video; mute and music level persist locally. Desktop has Sound and music-volume controls; in-world room navigation and sample panels have Sound On/Off buttons.

Pointer/pinch/trigger UI selections use one shared click path; direct thumbstick gameplay commands do not spam UI clicks. The short click buffer decodes once, with a tiny synthesized confirmation available on the very first interaction while it loads. Music streams from one looping Audio element. Tests cover user-activation gating, mute persistence, volume limits, click debounce and video/visibility pause-resume. Audio files decode without errors; actual headset output is not verified.
