# The Lost Spirit of Christmas · Hexham

The current production experience is a mobile-first, paper-led Christmas window trail for Hexham. The printed trail is the main activity; the website adds the story, window details, optional puzzles and a map.

## Current Christmas Trail

- 25 participating window destinations, defined in `trail-content.js`
- Original printed QR destinations preserved through each stop's `qrId`
- Individual pages at `/window/01` through `/window/25`
- Legacy QR routes at `/trail/{qrId}`
- Five story themes based on the spirits of *A Christmas Carol*
- Optional browser-based puzzles, with completion stored locally on the visitor's device
- A Leaflet/OpenStreetMap map, with coordinates and address labels in `map-data.js`
- A Discover Hexham directory linking to all current trail participants
- Netlify redirects in `_redirects` send clean routes to the single-page application

## Main files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell, styling, metadata and external map library |
| `trail.js` | Route handling, page rendering and puzzle interactions |
| `trail-content.js` | Window, story, clue and theme content |
| `map.js` | Leaflet map rendering and directions links |
| `map-data.js` | Address labels and map coordinates |
| `_redirects` | Netlify route fallback |
| `manifest.webmanifest` | Basic installable web app metadata |

## TownQuest legacy game

The repository also retains the earlier location-based TownQuest prototype:

- `app.js`
- `game-engine.js`
- `game-content.js`

That code contains the original GPS adventure, Supabase integration, shared town-spirit mechanics and game economy. It is not loaded by the current Christmas Trail entry point. Keep it separate from the seasonal trail and do not remove it as part of routine Christmas Trail changes.

## Data and privacy notes

- Trail puzzle completion is stored in the visitor's browser using local storage.
- The current Christmas Trail does not require an account or location permission.
- The legacy TownQuest game has separate Supabase configuration and behaviour. Do not expose a Supabase secret or service-role key in browser code.
- Map tiles and historic illustrations are loaded from external services, so those elements require an internet connection.

## Deployment

The site is hosted on Netlify and connected to this GitHub repository. Changes merged into the production branch trigger a Netlify deployment.

## Before changing printed trail destinations

Do not renumber stops or change their `qrId` values without checking the printed paper trail and QR codes. The display order and original QR identifiers are deliberately separate.
