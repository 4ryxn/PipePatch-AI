# PipePatch AI final project report

## Abstract
PipePatch AI is a safety-bounded web application for documenting a narrow outdoor Schedule-40 PVC irrigation clean-cut case. A React/TypeScript/Vite browser client collects a user-confirmed image; FastAPI validates it, optionally requests Gemini observations, and deterministic Python gates decide whether generic guidance is permitted.

## Scope and architecture
The MVP supports only confirmed clean transverse cuts, 1/2, 3/4, and 1 inch Schedule-40 PVC. Gemini observes; it never authorizes repairs. OpenCV ArUco calibration establishes an approximate scale, then user-selected measurement points provide advisory estimates. Assessment, guidance, parts, suppliers, and text-only optional history are all blocked when uncertainty or unsupported damage occurs.

## Privacy, safety, and limitations
Photos are not retained. History is opt-in and excludes images, locations, prices, suppliers, and raw AI content. Supplier data is public OSM discovery only and never promises stock, price, or routing. The repository has automated tests and synthetic offline evaluation tooling, but no claimed field accuracy, user study, cost saving, or supplier coverage. Future work includes consented evaluated field data, usability testing, production monitoring, and carefully approved scope expansion.

## References
FastAPI, React, TypeScript, Vite, Google GenAI SDK, OpenCV ArUco, OpenStreetMap/Nominatim/Overpass policies, SQLAlchemy, Alembic, pwdlib, Neon, Vercel, and GitHub Actions official documentation.
