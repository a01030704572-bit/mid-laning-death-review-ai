# Mid Lane Review Companion Overwolf Collector

This folder is a skeleton for a future Overwolf Native collector for the Mid Laning Decision Review AI product.

## Current status

- Skeleton only.
- No upload, storage, Riot API, or web app API calls.
- No real-time coaching or live strategic recommendations.
- Requires Overwolf developer whitelist/application approval before it can be loaded and tested as an unpacked app.

## Intended future flow

1. The collector runs quietly during a League of Legends match.
2. It listens for safe game and launcher events.
3. It records review-relevant moments such as deaths, kills, assists, objectives, and recall-like events.
4. It may request short replay captures in a later phase.
5. It builds an `OverwolfCapturePackage`-compatible JSON payload.
6. The web app can later validate that package through the debug importer or a future ingestion API.

## Loading later

After Overwolf developer access is available:

1. Open Overwolf.
2. Go to Packages.
3. Choose Load unpacked.
4. Select this `overwolf-collector` folder.

## Manual QA with the web app debug importer

1. Open the web app with `?debug=true`.
2. Find the Overwolf Capture Debug Importer.
3. Copy `overwolf-collector/samples/sample-capture-package.json`.
4. Paste it into the importer.
5. Expected result: `safe true`, session status `validated`, and no validation issues.

## Safety notes

- Do not provide real-time coaching or live strategic recommendations.
- Do not upload clips or event data from this skeleton.
- Do not include local file paths in exported capture package payloads.
- Treat video/event data as post-game review evidence, not live assistance.
