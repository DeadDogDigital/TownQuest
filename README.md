# Hexham Christmas Adventure v1

A mobile-first prototype for the Hexham Christmas Window Trail game.

## What this version demonstrates

* Shared-style town Christmas Spirit meter
* 8 sample Hexham locations on a live OpenStreetMap map
* Player inventory and supplies
* Discovering locations and earning resources
* Donating and sharing resources
* Story/event calendar
* Simulated live event that changes shared Spirit
* Notification permission entry point
* Local persistence using localStorage

## What is not yet live multiplayer

The prototype stores its state in the browser. The production version needs a shared backend, player/session IDs, server-side validation, real-time subscriptions, scheduled push notifications, QR/GPS validation, and an admin console.

## Proposed production stack

Netlify frontend + Supabase database/realtime/auth/functions, with Web Push for notifications. The public game can remain a PWA so families do not need an App Store download.
