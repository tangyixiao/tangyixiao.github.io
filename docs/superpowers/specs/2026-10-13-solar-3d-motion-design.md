# Solar system: real three-dimensional motion

## Goal

The homepage solar system currently reads as a flat, static disc. Two user reports define the work:

- The galactic-centre marker and its text label must not be displayed at all.
- "The whole solar system has to move in three dimensions — this is still a plane."

Four rounds of design questions settled what that means. The user wants the system to genuinely translate through the universe, not merely to be viewed from a rotating camera, and wants the internal composition to stop reading as a single motionless plate.

Five further requests were attached in the same round:

- The flow of time must be adjustable.
- Planets must already sit at their real positions for today's date when the page opens.
- The asteroid belt must be more realistic.
- The picker must be split into two levels.
- A further batch of bodies must be added.

The engineering consequence is a real translation law for the whole system, a displacement-limited camera, a time-scale control, epoch-derived initial angles, Jupiter Trojans, a two-level explorer picker, and a batch of new bodies with procedural materials. Everything below is a decision already agreed with the user; the document records what is settled and why, not a menu of options.

## Problem

- **The plane is physically real.** The eight planetary orbits are already true three-dimensional Kepler ellipses carrying J2000 inclination and longitude of ascending node. But the largest real inclination is Mercury's 7.005°, and the remaining seven fall between 0.773° and 3.395°. The ecliptic really is a thin disc, so a faithful simulation of it looks flat precisely because it is flat. The flatness is not a rendering bug.
- **The one moving object is too slow to see.** The sole animated element is a rigid great ring centred on the Sun, with `GALAXY.omega = 2π/1500` — one revolution in 25 minutes, or 14.4°/minute. Over ten seconds of watching, it turns 2.4°, which projects to less than a single pixel on screen. Motion that exists but is sub-pixel is indistinguishable from no motion.
- **Nothing provides parallax.** The Sun is pinned at the origin, the celestial-sphere texture and the background stars are static, and there is no offset reference frame anywhere in the scene. With no relative motion between the observer and any reference, the eye can only conclude that the ring is standing still.
- **The cheap fix is rejected.** The user explicitly ruled out amplifying the inclinations. Inclination values keep their real numbers in every mode and under every setting.
- Because of that last constraint, the three-dimensional reading must come from two honest sources instead: whole-system translation against a fixed galactic frame, and real bodies that genuinely carry large inclinations.

## Motion

### The system translates along the galactic circle

- The galactic ring becomes static. Its centre is fixed at the world-local `R·centre`, where `R = 0.97 ×` the current scene span is the indicative radius, and its plane lies strictly in the galactic plane. The ring is the track, so the track must not move.
- The solar-system body itself travels along that ring: `system.position = centre·R(1−cos θ) + l90·R·sin θ`, with `θ = time·GALAXY.omega`.
- At `θ = 0` the displacement is exactly zero, so the Sun starts precisely at the ring's origin point and moves toward `+l90` — galactic longitude 90°, in Cygnus. Starting at zero means the initial framing is unchanged from today's scene; the motion grows out of the current view rather than jumping into a new one.
- The trajectory is spanned by `centre` and `l90`, and its normal is the galactic pole. The motion plane therefore makes an exact **60.19°** angle with the ecliptic. That fixed, non-negotiable tilt is what finally supplies a second reference plane, and it is a true astronomical angle rather than an invented camera trick.
- The system translates as a rigid body: relative geometry inside the solar system is untouched, so planet positions, moon orbits, and the belt all keep their existing meaning. Only the whole assembly is carried along the track.
- The cruise reaches its maximum displacement at `θ = π`, half a revolution from the start.

### How the user's three-dimensional requirement is satisfied

- **Translation supplies global depth.** Because the system moves against a fixed galactic ring and fixed background, the scene has two frames that disagree, which is the only way a viewer reads motion in depth rather than motion in place.
- **Real high-inclination bodies supply local depth.** Pluto, Pallas, Eris, and Halley visibly leave the ecliptic disc, so the ecliptic itself can stay honest and thin without the scene reading as two-dimensional.
- **The ring supplies the reference.** Without a static track there is nothing to measure the translation against, which is why the ring remains in the scene as an element the user can reveal, rather than being removed along with the marker.

### The camera follows with a clamped residual, not a fixed ratio

- Let `ρ` be the Sun's world displacement relative to the "no-cruise" case. The camera computes `residual = clampMagnitude(ρ, M)` and translates both its position and its look-at target by `(ρ − residual)`.
- Bodies consequently move on screen by exactly `residual`, and the camera's own turning is bounded by `M`. The user chose this "partially following camera" option from three candidates because it keeps the system in frame while leaving visible motion.
- Browsing mode uses `M ≈ 75 px`; explore mode uses `M ≈ 11%` of the viewport height. Browse mode is about reading the page, so it tolerates only a small drift; explore mode is about watching the system, so it permits roughly a tenth of the frame before the camera catches up.
- A fixed follow ratio cannot work, and this is exactly why the clamp is the design. The maximum cruise displacement is `2R·sin(θ/2)` = **1164 world units**, which is 30.3 scene units at browse-mode scale, while the hero framing exposes only 46.07 scene units of visible height. The displacement is therefore equivalent to **65% of the screen height**. A proportional follow would either throw the system off-frame or cancel the motion outright; clamping decouples the two so that on-screen motion stays readable while the camera never swings wildly.

## Time

- A toolbar segmented control offers `1× · 4× · 16× · 60×`, defaulting to `1×`. The existing pause button stays. The multiplier scales the whole simulation clock, so every period scales together and the relative phasing of the system never changes.
- `1×` is defined as exactly today's pacing, so nothing existing is retimed: real rotation period 10 s = one Earth day, Earth's orbit 42 s per revolution, galactic circle 25 minutes per revolution.
- The control exists because the current pace makes planetary motion impossible to perceive at any zoom level. Speed is a viewing aid, not a change to the simulation's physical content: no element is re-scaled, only the clock that drives it.
- The multipliers are coarse steps rather than a slider so that each step is a distinct, nameable viewing mode: `1×` for accurate pacing, `4×` and `16×` for watching inner planets move, `60×` for watching the system cruise along the galactic ring. A continuous slider would invite micro-tuning that the scene does not reward.
- Because the multiplier scales one shared clock, pausing and resuming remain a single boolean and the time-scale setting is orthogonal to it.

## Initial conditions

- The orbital `angle` is no longer hardcoded. It is evaluated at module load from JPL J2000 linear elements for the current date: `T = (JD − 2451545) / 36525` and `M₀ = L₀ + L̇·T − ϖ`.
- All eight planets switch to the JPL table together. The code previously mixed NASA NSSDCA values and carried no rate term at all, so the scene could not reproduce any real date and effectively sat at a frozen epoch.
- The result the user asked for: opening the page places every planet at its true position for today, with no manual configuration and no stored state.
- Before this change the same page opened to the same sky on every visit, which was the strongest single signal that the scene was a diagram rather than a simulation.
- `T` is centuries since J2000 and `ϖ` is the longitude of perihelion, so the mean anomaly follows from the mean longitude at epoch plus its rate over the elapsed interval. Evaluating at module load keeps the scene a pure function of the current date, with no fetch, no cache, and no first-frame jump.

## Galactic ring and centre

- The galactic-centre sprite and the `银心 / GALACTIC CENTER` text label are deleted outright, including the `.celestial-label[data-body="galactic-center"]` element in the DOM. The label count drops from 10 to 9: the Sun plus the eight planets. The marker annotated a point the redesign no longer needs, and the user does not want it shown.
- The gold galactic ring is kept, because it remains the visible track of the system's cruise and the motion is unreadable without it, but it defaults to `visible = false` with a toolbar toggle. A permanently drawn ring competed with the system for attention and made an already busy scene busier than the motion justifies.
- The panel disclaimer text is rewritten so that the ring's explanation lives with the toggle, in the context where the user can actually turn it on, instead of describing an element that was always present.
- The marker and the ring are treated differently on purpose: the marker is an annotation the user rejected, while the ring is the geometric track the new motion is defined against. Deleting both, or keeping both, would each have been the wrong call.

## Asteroid belt and Jupiter Trojans

- The Kirkwood gaps already sit at their real resonance positions and are maintained unchanged: 3:1 at 2.502 AU, 5:2 at 2.825 AU, 7:3 at 2.958 AU, with the outer edge at 3.279 AU (the 2:1) and the inner edge at 2.065 AU (the 4:1).
- Added: the Jupiter Trojans as two clusters at L4 and L5, referenced to Jupiter with a mean-longitude offset of ±60° and a spread of about ±30°, roughly 300 objects per cluster on desktop.
- The request was a more realistic belt, and the Trojans are the largest real population the belt was missing; the existing gap structure was already correct and needed no rework.
- The Trojans are referenced to Jupiter rather than placed at fixed coordinates so that they librate with their primary, staying at L4 and L5 as the planet moves. Trojans that ignored Jupiter would have been a decorative clump that gave the lie away on close inspection.

## Explorer picker

- The picker becomes two levels. The upper level is a row of category chips — Star · Planet · Dwarf planet · Asteroid · Comet · Moon — and the lower level shows the selected category's body buttons.
- Opening the explorer lands on "Planet" by default, which keeps first-open appearance identical to today's picker.
- Category assignment: the Sun is Star; the eight planets are Planet; Pluto, Ceres, and Eris are Dwarf planet; Pallas is Asteroid; Halley is Comet; and the Moon, the four Galilean moons, Titan, and Triton are Moon.
- Moon buttons are labelled `parent·moon` (`母天体·卫星名`) because a bare "Titan" or "Io" inside a solar-system picker is ambiguous without its primary.
- Accessible names are otherwise unchanged (`选择地球` / `Select Earth`), so existing tests and screen-reader behaviour survive the regrouping untouched.
- Two levels exist because the body count grows from nine to twenty-one once the new bodies and moons land; a single flat row of that length stops being scannable and starts being a menu to hunt through. Categories restore a short, predictable list at each level.
- Chips are a single-select row rather than a nested tree, because every body belongs to exactly one class and there is no hierarchy worth expressing.

## New bodies

- Eleven new bodies are added, plus the Moon — previously only a decorative mesh — becoming selectable: **12 items in total.** Pluto, Ceres, Pallas, Eris, Halley's Comet, Io, Europa, Ganymede, Callisto, Titan, and Triton.
- Orbital elements are real values, not art-directed ones. Pluto `a = 39.482 AU`, `e = 0.2488`, `i = 17.16°`; Ceres `a = 2.7675`, `e = 0.0758`, `i = 10.593°`; Pallas `a = 2.773`, `e = 0.231`, `i = 34.84°`; Eris `a = 67.78`, `e = 0.4407`, `i = 44.04°`; Halley `a = 17.834`, `e = 0.96714`, `i = 162.26°`, retrograde.
- These high inclinations are the second half of the three-dimensional answer: the ecliptic stays honest and thin, while individual orbits visibly leave it. Halley at 162.26° runs retrograde, which reads as motion in its own right.
- Moons use parent-relative orbits and hide together with the existing Moon precedent in true-scale mode, so the true-scale rule keeps one meaning instead of two.
- `assets/solar/` holds only 15 textures and none of them depict these bodies, so every new body uses a **procedural material** — colour plus noise relief, loading no new images — and picker dots fall back to flat colour. Procedural surfaces avoid shipping unlicensed or invented imagery, and keep the texture-count assertion `data-scene-textures = 14` intact.
- The new orbital bodies take their initial positions from the same JPL linear-element evaluation used for the planets; moons are placed on their parent-relative orbits at load.
- The Moon is promoted rather than added, because it already existed in the scene as decoration; making it selectable costs nothing visually and removes the inconsistency of a visible body that cannot be inspected.

## Distance compression

- The art-mode law is unchanged: `88 × AU^0.55`. It was never a candidate for change, and keeping it means every existing distance and framing decision stays valid.
- The consequence is deliberate and accepted: Eris (907 units) and Halley's aphelion (627 units) fall outside the default wide view (span 600) and become visible only after the camera flies to them on selection. Real distances are preferred over a rescaled scene.
- `data-scene-outside-bodies` continues to count only the Sun and the eight planets. Dwarf planets and comets are excluded, because their real distances would otherwise make the attribute meaningless as a budget check.

## Tests

- The `.celestial-label` assertion changes from 10 to 9, matching the removed galactic-centre label.
- Planet buttons clicked by accessible name keep their current names, so no accessible-name assertion needs rewriting.
- New assertions cover: time-scale step switching, the galactic ring hidden by default and toggleable, picker category switching, and selecting Pluto and Halley.
- Pluto and Halley are the two bodies chosen for selection tests because they exercise opposite extremes: the nearest new dwarf planet and the retrograde comet on a highly eccentric orbit. If those two resolve and fly correctly, the intermediate bodies are covered by the same code path.
- Assertions continue to read state from DOM data attributes rather than from internal module state, so the tests keep validating the rendered scene.

## Out of scope

- Inclination values are not enlarged, in any mode or under any setting.
- No new image assets are downloaded or authored; every new body is procedural.
- No change to the distance-compression law or to the wide-view span.
- No redesign of the explorer's accessible names, and no changes to homepage sections outside the solar-system scene.
- No N-body or perturbation physics: orbits remain Keplerian elements evaluated analytically. The Trojans librate about their Lagrange points as a referenced population, not as a simulated gravitational solution.
- No real-time ephemeris service or network fetch; the JPL linear elements are the only source, evaluated locally.
