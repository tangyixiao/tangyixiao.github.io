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

## NASA / USGS body maps (project-added)

Eight additional, project-added maps — **not** part of the Solar System Scope
set — replaced the procedural surfaces of the Galilean satellites, Titan,
Triton, Pluto and Ceres. All are US-government (NASA / USGS Astrogeology)
cartographic products, generally not copyrighted (see
[NASA Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
and the USGS Astrogeology terms). Each is an equirectangular global mosaic;
retrieved URLs, original hashes and dimensions are recorded in `sources.json`.

- `io.webp` — USGS [Io Galileo SSI Global Mosaic (color-merged)](https://astropedia.astrogeology.usgs.gov/download/Io/Voyager-Galileo/Io_Galileo_SSI_Global_Mosaic_ClrMerge_1km.cub), kept at native 1024×512.
- `europa.webp` — [Europa Voyager/Galileo SSI global mosaic](https://commons.wikimedia.org/wiki/File:Europa_Voyager_GalileoSSI_global_mosaic.jpg) (NASA/JPL), unimaged areas filled with the mean surface color.
- `ganymede.webp` — USGS [Ganymede Voyager/Galileo SSI global mosaic](https://astropedia.astrogeology.usgs.gov/download/Ganymede/Voyager-Galileo/Ganymede_Voyager_GalileoSSI_global_mosaic_1km.cub), unimaged areas filled.
- `callisto.webp` — USGS [Callisto Voyager/Galileo SSI global mosaic](https://astropedia.astrogeology.usgs.gov/download/Callisto/Voyager-Galileo/Callisto_Voyager_GalileoSSI_global_mosaic_1km.cub), unimaged areas filled.
- `titan.webp` — NASA Cassini ISS [Titan global map (April 2011)](https://commons.wikimedia.org/wiki/File:Titan_map_April_2011_full.png), re-graded toward the observed orange haze color.
- `triton.webp` — Voyager 2 [Triton global map](https://commons.wikimedia.org/wiki/File:Triton_Map.jpg) (NASA/JPL), unseen hemisphere filled gray as in the source.
- `pluto.webp` — NASA New Horizons [Pluto global map, PIA20658](https://photojournal.jpl.nasa.gov/catalog/PIA20658), edges filled.
- `ceres.webp` — USGS/DLR [Dawn FC Ceres global map](https://astropedia.astrogeology.usgs.gov/download/Ceres/Dawn/Ceres_Dawn_FC_DLR_global_2048.cub).

Changes made here: resampled to 2048×1024 (io excepted) and re-encoded as
WebP q84 with ffmpeg; missing-data regions were keyed out and filled with a
mean color, and Titan was re-graded, so these are derived cartographic maps,
not unmodified photographs. Credit: NASA/JPL, USGS Astrogeology Science
Center, DLR (Ceres frame camera processing).

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
