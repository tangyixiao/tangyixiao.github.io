# Solar surface and sky maps

The 14 planet, moon and sky maps in this directory are by
**Solar System Scope / INOVE**, licensed
under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

Original collection: <https://www.solarsystemscope.com/textures/>

The maps incorporate NASA imagery and elevation data, with artistic color
adjustments and reconstructed areas where observations are incomplete. They
are not presented as unmodified NASA photographs. `sun.webp` is a surface
texture, not live solar imagery; `stars_milky_way.webp` is a decorative sky map.

Changes made here: converted the original 2K JPEG/PNG maps to WebP (quality 84).
The application uses a 1K GPU copy on mobile. Original dimensions, SHA-256
hashes, original URLs and pinned retrieval mirrors are recorded in `sources.json`.
The original host could not be reached from the development machine; the same
attributed files were retrieved from the pinned public repositories recorded
in that manifest. No application code from those repositories is used.

The visual layout, lighting, shaders, camera, simulation and interface are
project-authored. Orbital sizes and speeds remain artistic, not NASA ephemerides.
Planet information uses the [NASA NSSDCA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/).
Solar diameter uses twice the mean radius in the [NASA Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html).
Interface inspiration: [NASA Eyes on the Solar System](https://eyes.nasa.gov/apps/solar-system/).

## stars_deepstar.webp (black hole page backdrop)

An additional, project-added map — **not** part of the Solar System Scope set:

- Source: NASA SVS [Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851/),
  `starmap_2020_8k.exr` (8192×4096, image/aces, 130,530,278 bytes).
- Credit: **NASA/Goddard Space Flight Center Scientific Visualization Studio**.
  Gaia DR2: ESA/Gaia/DPAC. NASA imagery is generally not copyrighted
  (see [NASA Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)).
- Derived here: exposure +2.2 stops, sRGB-style tone curve and Lanczos downscale
  to 4096×2048, encoded as WebP q88 with ffmpeg. SHA-256 of the derived file:
  `28a488acea0794d386850c44c429127af36e2578d842769579736ea510e4857a` (see `sources.json`).
