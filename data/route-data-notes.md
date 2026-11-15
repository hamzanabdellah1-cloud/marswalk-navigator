# MarsWalk Navigator — NASA/USGS route demo

This page demonstrates actual least-cost route calculations on the preprocessed Gale boxwork DEM grid. The calculation box is separate from the color context map shown on the overview page. It uses the local USGS MSL Gale 1 m DEM crop, served through NASA/JPL Mars Trek, resampled to a 300 × 225 grid with 3.005 m cell spacing.

The pathfinder runs A* against the grid's elevation-derived slope field. It compares three parameter presets: shortest (distance only), gentlest (slope penalty), and ridge-interest heuristic (topographic position score; a terrain heuristic, not measured science interest). It reports distance, maximum slope, ascent, and descent. It does not model traction, rocks, wheel slip, or mission safety.

The original DEM retrieval date was not recorded in the source project. The local crop was copied on 2026-11-15. The context color image in `assets/maps/orbital.jpg` has different bounds and is for context only.
