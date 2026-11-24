# TableTop VR arcade

Standalone browser showroom at /vr/. The Unity project is unchanged.

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
