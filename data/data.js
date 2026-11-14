/*
  Loaded with a script tag so the page works from a double-click.
  The three map files share one frame: 900 m by 675 m, centered on the
  published boxwork image point 137.302600 E, 4.876048 S.
*/
window.MARSWALK_DATA = {
  "views": [
    {
      "id": "orbital",
      "file": "assets/maps/orbital.jpg",
      "alt": "Grayscale HiRISE view of boxwork ridges. Lines on top are a conceptual route.",
      "caption": "MRO HiRISE Curiosity roving-site mosaic. NASA/JPL Mars Trek. Older than the 2025 stop photos."
    },
    {
      "id": "terrain",
      "file": "assets/maps/terrain.jpg",
      "alt": "Gray hillshade of the same ground, made from the 1 m Gale elevation model.",
      "caption": "Hillshade of the USGS MSL Gale DEM, 1 m, in the same frame. NASA/JPL Mars Trek."
    },
    {
      "id": "geology",
      "file": "assets/maps/geology.jpg",
      "alt": "A single pale color. The global geologic map shows one unit here, not the ridges.",
      "caption": "Regional context only. USGS Geologic Map of Mars (Tanaka et al., 2014). One unit fills this frame."
    }
  ],
  "layers": [
    {
      "name": "Global orbital image",
      "badge": "Broad",
      "tone": "red",
      "reason": "Too coarse to see a walking route.",
      "title": "Viking MDIM 2.1 Color Mosaic",
      "credit": "NASA/JPL Mars Trek",
      "note": "Layer id Mars_Viking_MDIM21_ClrMosaic_global_232m, confirmed in WMTS GetCapabilities. Far too coarse for this walk."
    },
    {
      "name": "Gale orbital image",
      "badge": "Old",
      "tone": "green",
      "reason": "Detailed ridges, from before the 2025 photos.",
      "title": "MRO HiRISE, Curiosity roving-site mosaic",
      "credit": "NASA/JPL-Caltech/University of Arizona, via NASA/JPL Mars Trek",
      "page": "https://trek.nasa.gov/tiles/Mars/EQ/curiosity_hirise_mosaic/1.0.0/WMTSCapabilities.xml",
      "note": "Layer id curiosity_hirise_mosaic, confirmed in WMTS GetCapabilities. Older than the 2025 stop photos."
    },
    {
      "name": "Global elevation",
      "badge": "Broad",
      "tone": "red",
      "reason": "Too coarse to measure this walk.",
      "title": "MGS MOLA colorized shaded relief",
      "credit": "NASA/JPL Mars Trek; data from MOLA / MGS",
      "page": "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml",
      "note": "Layer id Mars_MGS_MOLA_ClrShade_merge_global_463m. Not used for the profile. One pixel is larger than this walk."
    },
    {
      "name": "Gale elevation",
      "badge": "Uncertain",
      "tone": "yellow",
      "reason": "The route finder samples this 1 m model.",
      "title": "MSL Gale DEM Mosaic, 1 m",
      "credit": "USGS Astrogeology / MSL project, via NASA/JPL Mars Trek",
      "page": "https://trek.nasa.gov/tiles/Mars/EQ/Gale_DEM_SMG_1m/1.0.0/WMTSCapabilities.xml",
      "note": "Layer id Gale_DEM_SMG_1m. The route grid is resampled from this 1 m mosaic. The uncertainty band uses that 1 m pixel size."
    },
    {
      "name": "Global geology",
      "badge": "Broad",
      "tone": "red",
      "reason": "Too broad to map one short walk.",
      "title": "Geologic Map of Mars (SIM 3292)",
      "credit": "USGS (Tanaka et al., 2014)",
      "page": "https://pubs.usgs.gov/sim/3292",
      "note": "Layer id SIM3292_Global_Geology. Scale 1:20,000,000. The smallest outcrop drawn is 40 by 100 km, so this walk is a single unit. Regional context only. Not the geology of the route."
    },
    {
      "name": "Local geology",
      "badge": "Uncertain",
      "tone": "yellow",
      "reason": "No local map separates ridges from hollows.",
      "title": "Gale landing-site geology and mineral units",
      "credit": "Anderson & Bell 2010; Milliken et al. 2010",
      "note": "Predates the 2025 boxwork photos. Units are broad."
    }
  ],
  "unknown": [
    "No soil-traction data.",
    "No rock or boulder data at walking scale.",
    "The DEM may have stereo artifacts.",
    "The orbital image is older than the 2025 Curiosity photos.",
    "Science interest is a terrain heuristic, not a measurement."
  ],
  "examples": [
    { "stop": 0, "x": 58, "y": 58 },
    { "stop": 1, "x": 66, "y": 44 }
  ],
  "stops": [
    {
      "title": "Boxwork ridge, close-up",
      "file": "assets/stops/stop-1.jpg",
      "download_jpg": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia26/pia26558/PIA26558.jpg",
      "look": "A low, curb-like ridge, part of the crisscrossing network that forms the boxwork pattern.",
      "why": "Scientists think groundwater left minerals that hardened the ridge edges. Wind later carried away the softer rock around them.",
      "photo": "Curiosity Views a Fractured Boxwork Pattern Up Close",
      "credit": "NASA/JPL-Caltech/MSSS",
      "date": "May 16, 2025",
      "pia": "PIA26558",
      "page": "https://www.jpl.nasa.gov/images/pia26558-curiosity-views-a-fractured-boxwork-pattern-up-close/"
    },
    {
      "title": "Ridges and hollows, wide view",
      "file": "assets/stops/stop-2.jpg",
      "download_jpg": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia26/pia26560/PIA26560.jpg",
      "look": "Low ridges separating lower-lying hollows.",
      "why": "The team is studying the texture, chemistry, and mineralogy of ridges and hollows. That work asks how this surface formed and changed.",
      "photo": "Curiosity Views Boxwork Patterns at a Distance",
      "credit": "NASA/JPL-Caltech/MSSS",
      "date": "May 2025",
      "pia": "PIA26560",
      "page": "https://www.jpl.nasa.gov/images/pia26560-curiosity-views-boxwork-patterns-at-a-distance/",
      "dateNote": "May 2025 only. The source pages do not agree on the day, so no exact date is shown."
    }
  ],
  "note": {
    "sentence": "The team is characterizing the texture, chemistry and mineralogy of ridges and hollows to understand how the surface formed and changed.",
    "author": "Sharon Wilson Purdy, Smithsonian National Air and Space Museum",
    "page": "https://science.nasa.gov/blog/curiosity-blog-sols-4655-4660-boxworks-with-a-view/"
  },
  "instruments": [
    {
      "name": "ChemCam",
      "role": "A laser vaporizes a rock surface. Spectrographs read the light to find elements.",
      "page": "https://science.nasa.gov/mission/msl-curiosity/science-instruments/"
    },
    {
      "name": "CheMin",
      "role": "An X-ray diffraction instrument that identifies minerals.",
      "page": "https://science.nasa.gov/mission/msl-curiosity/science-instruments/"
    }
  ],
  "references": [
    {
      "title": "HiRISE Views Mount Sharp's Boxwork (PIA26306)",
      "credit": "NASA/JPL-Caltech/University of Arizona",
      "page": "https://science.nasa.gov/resource/hirise-views-mount-sharps-boxwork/",
      "note": "Citation only. Not shown on the map. Acquired Dec. 10, 2006. Released Nov. 18, 2024."
    },
    {
      "title": "Curiosity's Proposed Path up Mount Sharp",
      "credit": "NASA/JPL-Caltech/ESA/University of Arizona/JHUAPL/MSSS/USGS Astrogeology Science Center",
      "page": "https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/",
      "note": "Citation only. Not shown on the map. May 15, 2019."
    },
    {
      "title": "NASA/JPL Mars Trek",
      "credit": "NASA Solar System Exploration Research Virtual Institute and JPL",
      "page": "https://trek.nasa.gov/mars/",
      "note": "Portal for the map layers. It also includes a sun-angle view."
    },
    {
      "title": "Boxwork image center used for this frame",
      "credit": "Siebach and Grotzinger, HiRISE PSP_001752_1750",
      "note": "137.302600 E, 4.876048 S. The frame is 900 m by 675 m around that point."
    }
  ]
};
