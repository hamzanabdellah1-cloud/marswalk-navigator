#!/bin/sh
# Download the credited Curiosity stop images.
# Run from the project root with Git Bash: sh tools/download_assets.sh
# The URLs are the download_jpg values in data/data.js.
# Full NASA JPEGs are about 1.8 MB and 3.2 MB. The page files stay under about 400 KB.
set -eu
cd "$(dirname "$0")/.."
mkdir -p assets/stops

fetch() {
  dest="$1"
  url="$2"
  tmp="${dest}.download"
  curl -fL --retry 3 -o "$tmp" "$url"
  bytes=$(wc -c < "$tmp" | tr -d ' ')
  if [ "$bytes" -le 409600 ]; then
    mv "$tmp" "$dest"
    echo "$dest is $bytes bytes."
  else
    mv "$tmp" "${dest}.full.jpg"
    echo "NASA JPEG is $bytes bytes, over about 400 KB."
    echo "Full file saved as ${dest}.full.jpg"
    echo "The page still uses the smaller file: $dest"
  fi
}

fetch assets/stops/stop-1.jpg "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia26/pia26558/PIA26558.jpg"
fetch assets/stops/stop-2.jpg "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia26/pia26560/PIA26560.jpg"
