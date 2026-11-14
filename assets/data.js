/* Loaded as a script so the page works from a double-click. */
window.MARSWALK_DATA = {
  "views": [
    {
      "id": "orbital",
      "file": "assets/base-map.jpg",
      "alt": "Grayscale orbital view of ridged ground. Lines on top are a conceptual route.",
      "caption": "Local orbital image. Gale mosaic credit is in Sources."
    },
    {
      "id": "terrain",
      "caption": "Layer not available yet. Global elevation is context only."
    },
    {
      "id": "geology",
      "caption": "Layer not available yet. No geology picture is loaded."
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
      "note": "Far too coarse for a walking route. Regional context only."
    },
    {
      "name": "Gale orbital image",
      "badge": "Old",
      "tone": "green",
      "reason": "A 2012 to 2013 view. Dunes may have changed.",
      "title": "MSL Gale Merged Orthophoto Mosaic, 25 cm",
      "credit": "NASA/JPL-Caltech/UArizona; USGS Astrogeology (Calef & Parker, 2016)",
      "page": "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm",
      "note": "Orbital view from 2012 to 2013. Dunes may have changed."
    },
    {
      "name": "Global elevation",
      "badge": "Broad",
      "tone": "red",
      "reason": "Too coarse to measure this walk.",
      "title": "MGS MOLA colorized shaded relief",
      "credit": "NASA/JPL Mars Trek; data from MOLA / MGS",
      "note": "One pixel is larger than the whole walk."
    },
    {
      "name": "Gale elevation",
      "badge": "Uncertain",
      "tone": "yellow",
      "reason": "Slope from this layer is not checked.",
      "title": "MSL Gale DEM Mosaic, 1 m",
      "credit": "USGS Astrogeology / MSL project",
      "page": "https://astrogeology.usgs.gov/search/map/Mars/MarsScienceLaboratory/Mosaics/MSL_Gale_DEM_Mosaic_10m",
      "note": "Local slope from this layer is not checked."
    },
    {
      "name": "Global geology",
      "badge": "Broad",
      "tone": "red",
      "reason": "Too broad to map one short walk.",
      "title": "Geologic Map of Mars (SIM 3292)",
      "credit": "USGS (Tanaka et al., 2014)",
      "page": "https://pubs.usgs.gov/sim/3292",
      "note": "At walk scale the site is one polygon. Regional context only."
    },
    {
      "name": "Local geology",
      "badge": "Uncertain",
      "tone": "yellow",
      "reason": "Local geology map is still uncertain.",
      "title": "Gale landing-site geology and mineral units",
      "credit": "Anderson & Bell 2010; Milliken et al. 2010",
      "note": "Predates the 2025 boxwork photos. Units are broad."
    }
  ],
  "stops": [
    {
      "title": "Boxwork ridge, close-up",
      "file": "assets/pia26558.jpg",
      "look": "A low, curb-like ridge: part of the crisscrossing network that makes the boxwork pattern.",
      "note": "NASA says scientists think the hardened edges of such ridges may have formed from ancient groundwater, with minerals left behind hardening like cement before wind carved away the surrounding rock.",
      "photo": "Curiosity Views a Fractured Boxwork Pattern Up Close",
      "credit": "NASA/JPL-Caltech/MSSS",
      "date": "2025-05-16",
      "pia": "PIA26558",
      "page": "https://www.jpl.nasa.gov/images/pia26558-curiosity-views-a-fractured-boxwork-pattern-up-close/"
    },
    {
      "title": "Ridges and hollows, wide view",
      "file": "assets/pia26560.jpg",
      "look": "Low ridges separating lower-lying hollows across the boxwork region.",
      "note": "Per NASA, these images gave the first up-close views of the boxwork region in the foothills of Mount Sharp.",
      "photo": "Curiosity Views Boxwork Patterns at a Distance",
      "credit": "NASA/JPL-Caltech/MSSS",
      "date": "May 2025",
      "pia": "PIA26560",
      "page": "https://www.jpl.nasa.gov/images/pia26560-curiosity-views-boxwork-patterns-at-a-distance/",
      "dateNote": "Date shown as May 2025 until the listed day is checked."
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
      "page": "https://science.nasa.gov/mission/msl-curiosity/science-instruments/"
    },
    {
      "name": "CheMin",
      "page": "https://science.nasa.gov/mission/msl-curiosity/science-instruments/"
    }
  ],
  "references": [
    {
      "title": "HiRISE Views Mount Sharp's Boxwork",
      "credit": "NASA/JPL-Caltech/University of Arizona",
      "page": "https://science.nasa.gov/resource/hirise-views-mount-sharps-boxwork/"
    },
    {
      "title": "Curiosity's Proposed Path up Mount Sharp",
      "credit": "NASA/JPL-Caltech/ESA/University of Arizona/JHUAPL/MSSS/USGS Astrogeology Science Center",
      "page": "https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/",
      "note": "2019 planning map. Use as a visual reference only and label its date."
    }
  ]
};

window.MARSWALK_ROUTES = [
  {
    "id": "main",
    "name": "Route A (Main)",
    "distance_m": null,
    "max_slope_deg": null,
    "tradeoffs": [
      "Fewer bends on the picture.",
      "Length and slope are not measured."
    ],
    "source": "No cited measurement.",
    "method": "Hand-placed percentages of the picture. Not Mars coordinates."
  },
  {
    "id": "alternate",
    "name": "Route B (Alternate)",
    "distance_m": null,
    "max_slope_deg": null,
    "tradeoffs": [
      "Wider line between the same stops.",
      "Length and slope are not measured."
    ],
    "source": "No cited measurement.",
    "method": "Hand-placed percentages of the picture. Not Mars coordinates."
  }
];
