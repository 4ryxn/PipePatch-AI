# PipePatch AI — Product Specification

**Project stage:** Phase 1 foundation complete; this document specifies the planned MVP.  
**Status:** Design baseline for implementation and final-year project reporting.  
**Current implementation:** Backend health endpoint and mobile health display only. No analysis, AI, database, image storage, or repair logic is implemented yet.

## 1. Project title and abstract

**Title:** PipePatch AI: Safety-Gated Visual Assistance for Straight PVC Irrigation Pipe Repairs

PipePatch AI is a mobile-assisted decision-support system for a narrowly defined irrigation repair problem: a clean transverse cut in an exposed, straight section of outdoor Schedule-40 PVC irrigation pipe. A user captures photos that include a printed ArUco calibration marker. The backend uses a vision model to extract visual observations and OpenCV to validate the marker and calculate physical dimensions. Deterministic Python rules, rather than the vision model, decide whether the evidence is sufficient and whether guidance is allowed. When all safety gates pass, the application can present a conservative repair method based on a pressure-rated telescoping/slide repair coupling, curated parts, tools, safety checks, and a non-live approximate material-cost range. Unsupported or uncertain cases must stop without repair advice.

## 2. Problem statement

Homeowners, grounds staff, and small irrigation-maintenance teams may encounter damaged PVC irrigation pipe but lack confidence identifying pipe size, suitable repair fittings, and safe limits of a repair. Ordinary photographs cannot safely establish an exact physical pipe size. Incorrect sizing or use of inappropriate fittings can produce leaks, property damage, or unsafe pressurized-system work.

The project investigates whether calibrated visual observations plus deterministic safety rules can help users recognize a very limited repair case while refusing ambiguous, unsupported, or potentially hazardous situations.

## 3. Target users

- Homeowners repairing a visible outdoor irrigation lateral line.
- Groundskeepers or maintenance staff performing simple, supervised irrigation repairs.
- Final-year project evaluators assessing a bounded computer-vision and rule-based decision-support system.

The product is not intended to replace a licensed plumber, irrigation professional, local code requirements, or manufacturer installation instructions.

## 4. Project objectives

1. Identify whether a submitted capture is eligible for the narrowly scoped MVP analysis.
2. Establish physical scale using a printable ArUco marker; never infer exact pipe size from an ordinary image alone.
3. Classify the pipe only among the supported nominal Schedule-40 sizes: 1/2 in, 3/4 in, and 1 in.
4. Produce repair guidance only after deterministic safety gates validate all required observations and measurements.
5. Provide a curated, non-live parts list, tools, safety checks, and approximate material-cost range for a supported case.
6. Refuse or request another image for low-confidence, conflicting, incomplete, or unsupported cases.
7. Minimize personal data and do not retain submitted images or use them for training by default.

## 5. Functional requirements

| ID | Requirement | Acceptance test |
| --- | --- | --- |
| FR-01 | The mobile app shall let an anonymous user begin a new assessment and capture or select required images. | A user can complete the capture flow without creating an account. |
| FR-02 | The app shall show printable-marker instructions and require confirmation that the configured marker was printed at 100% scale. | The flow cannot submit an automated measurement capture without marker instructions and confirmation. |
| FR-03 | The backend shall validate that an expected ArUco marker is detected, decodable, and large enough for measurement. | Invalid, missing, or undersized marker fixtures return a refusal/request-for-new-image result. |
| FR-04 | The vision model shall return structured visual observations only; it shall not decide repair eligibility or generate repair instructions. | A code review and unit test show that model output is passed to deterministic gating before any guidance response. |
| FR-05 | Deterministic Python rules shall decide support, refusal, or recapture using model observations, marker validation, measurements, and confidence values. | Given fixed inputs, rule-engine tests return repeatable outcomes without invoking an AI model. |
| FR-06 | Exact nominal size shall be selected only from a valid calibrated measurement and only from 1/2 in, 3/4 in, or 1 in Schedule-40 reference ranges. | Ruler-only or uncalibrated images cannot return an exact automated size. |
| FR-07 | A supported result shall include the repair method, curated parts, required tools, safety checks, and an approximate material-cost range. | A golden supported-case response contains all required fields and states that pricing is not live. |
| FR-08 | The primary supported repair method shall be a correctly sized, pressure-rated telescoping/slide repair coupling. | The curated knowledge base maps each supported size to a pressure-rated slide-coupling method. |
| FR-09 | The app shall display an unambiguous stop/refusal state for unsupported or uncertain cases and shall not show repair steps in that state. | API and UI tests verify the absence of repair guidance for all refusal codes. |
| FR-10 | The system shall provide a manual ruler-verification step, but shall label it as user verification rather than automated measurement. | The UI never displays an exact automated size when only ruler verification is available. |
| FR-11 | The backend shall expose a health endpoint and versioned analysis contracts. | `GET /health` returns 200; contract tests validate planned `/v1` schemas when implemented. |
| FR-12 | Retailer inventory, availability, supplier selection, and live prices shall not be represented as current facts in the MVP. | Output fixtures contain only curated generic parts and approximate, dated cost ranges. |

## 6. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Safety | Fail closed: missing, conflicting, or insufficient evidence returns no repair advice. |
| Reliability | The rule engine must be deterministic and covered by unit tests for every safety gate and refusal code. |
| Performance | Target a normal analysis result or refusal within 15 seconds on a typical development-network connection; timeout must return a safe retry state. |
| Accessibility | Mobile screens shall use readable labels, sufficient contrast, non-colour-only status signals, and screen-reader labels for capture and result states. |
| Maintainability | Mobile code is React Native/Expo/TypeScript; backend code is Python/FastAPI/Pydantic; components and modules remain small and typed. |
| Observability | Log request IDs, timing, rule outcomes, and non-sensitive error codes only. Do not log image contents, raw images, API keys, or full model prompts/responses that may contain image-derived data. |
| Reproducibility | Dependencies shall be pinned or lockfile-controlled; API schemas and parts knowledge shall be versioned. |
| Availability | The MVP may be unavailable when its backend or model service is unreachable; it must fail safely and explain the next action. |

## 7. Supported pipe cases

All of the following must be true before guidance is permitted:

- Outdoor irrigation PVC pipe.
- White, rigid Schedule-40 PVC consistent with the curated reference set.
- An exposed, straight pipe segment with sufficient visible length around the damage for inspection and coupling installation.
- A single clean, transverse cut with two accessible pipe ends.
- Nominal size measured with a validated configured ArUco marker and classified as 1/2 in, 3/4 in, or 1 in.
- No visible evidence of fittings, valves, branch connections, crushing, deformation, contamination, or additional damage in the relevant repair area.
- The correct pressure-rated telescoping/slide repair coupling is available in the curated parts knowledge for the measured size.

## 8. Unsupported and hazardous cases

The system shall stop and recommend qualified local assistance or manufacturer guidance, as appropriate, when it detects or cannot exclude any of the following:

- Any pipe material, colour, pressure class, or schedule that cannot be confidently identified as the supported Schedule-40 PVC case.
- Ruler-only, missing-marker, malformed-marker, incorrectly printed, occluded, blurred, or perspective-invalid marker images.
- Nominal sizes other than 1/2 in, 3/4 in, and 1 in, or a measurement outside configured tolerance.
- A pipe embedded in concrete, concealed, inaccessible, under tension, or lacking room for the intended repair coupling.
- Cuts that are angled, jagged, crushed, melted, split, heavily scratched, contaminated, or accompanied by more than one damaged location.
- Damage involving elbows, tees, reducers, unions, valves, backflow equipment, existing fittings, mainlines, pumps, electrical equipment, or unidentified pipes.
- Any indication that the line remains pressurized, that water cannot be isolated, or that the user cannot safely excavate or access the pipe.
- Unclear ownership, possible utility line involvement, hazardous surroundings, or conditions that require local code compliance verification.
- Low-confidence, contradictory, or missing visual observations or measurement inputs.

The MVP shall never recommend flexible rubber drain couplings for pressurized irrigation repair.

## 9. Safety-gating rules

The decision pipeline is ordered and fail-closed. A later gate cannot override a failed earlier gate.

1. **Capture validity:** Confirm required image count, readable expected ArUco marker ID, configured marker dimensions, image quality, and marker geometry.
2. **Scale validity:** Use OpenCV marker pose/scale calculations to estimate pipe dimensions. Reject invalid perspective, insufficient marker pixel area, or measurements with excessive uncertainty.
3. **Visual eligibility:** Ask the vision model for bounded observations: probable material, outdoor irrigation context, straight exposed segment, clean transverse cut, accessible ends, fittings/valves/branches, and hazards.
4. **Observation consistency:** Reject conflicts between images, between vision observations and measurement evidence, or between claimed size and calibrated geometry.
5. **Size classification:** Compare calibrated dimensions against configurable Schedule-40 reference ranges. Accept only one unambiguous supported nominal size within tolerance.
6. **Repair feasibility:** Confirm enough straight, accessible pipe exists for the specified pressure-rated slide coupling and no unsupported adjacent component is present.
7. **Guidance authorization:** Only after all prior gates pass may deterministic rules select a curated repair template and parts list.

Initial conservative provisional thresholds, subject to calibration against the evaluation dataset, are:

- Marker detected and decoded in each measurement image; marker perimeter fully visible.
- Marker projected width at least 150 pixels and reprojection error at most 2.0 pixels.
- Image-quality score at least 0.85 and visual-observation confidence at least 0.90 for each safety-critical observation.
- Measurement relative uncertainty at most 5%; supported-size classification margin at least 10% from the nearest alternative class boundary.
- Cross-image dimensional disagreement at most 5%.

These are starting values, not validated operating limits. The evaluation dataset must be used to recalibrate them for safety-focused recall: uncertainty must increase refusals, not produce guesses.

## 10. Complete mobile user flow

1. **Welcome and scope:** Explain that PipePatch AI handles only a clean cut in exposed, straight outdoor Schedule-40 PVC and may refuse cases. User selects “Start assessment.”
2. **Safety pre-check:** User confirms water is shut off, the line is depressurized, area is safe, and the pipe is accessible. A negative answer stops the flow.
3. **Marker preparation:** Show the configured printable ArUco marker ID, physical side length, units, print-at-100%-scale instructions, and print verification. User confirms it is present.
4. **Capture guidance:** Show overlay guidance to place the marker in the same plane as the pipe, keep the cut and adjacent pipe visible, avoid blur/glare, and capture the required views.
5. **Capture review:** User retakes or confirms photos. The app performs basic local checks such as file presence and then uploads over HTTPS.
6. **Analysis progress:** Display non-diagnostic progress and a cancel option. No repair conclusion is displayed until the server returns a gated result.
7. **Outcome routing:**
   - Supported: show measured nominal size with calibration basis, repair overview, parts, tools, safety checks, steps, cost disclaimer, and a final verify-before-restoring-water prompt.
   - Recapture required: show the non-sensitive reason and concrete retake instructions; no repair steps.
   - Unsupported/hazardous: show stop message, reason category, and appropriate next action; no repair steps.
   - Service failure: explain that no conclusion was made, preserve only local in-progress state if needed, and offer retry.
8. **Manual verification:** For a supported result, let the user manually compare against a ruler; mark it as user verification only and instruct them to stop if it disagrees with the calibrated result.
9. **Completion:** Present safe cleanup and pressure-restoration checks. No cloud history is created for anonymous MVP users.

## 11. Planned mobile screens

| Screen | Purpose | Key controls and states |
| --- | --- | --- |
| Welcome/scope | Set expectations and boundaries. | Start; scope summary; privacy summary. |
| Safety pre-check | Confirm safe isolation and access. | Confirm each item; stop and exit. |
| Marker setup | Explain marker configuration and printing. | Marker ID/size; print instructions; confirmation. |
| Capture | Acquire guided photos. | Camera/gallery; overlay; flash; retake; accessibility labels. |
| Capture review | Confirm images before upload. | Thumbnails; retake; submit. |
| Analysis progress | Communicate pending work without false assurance. | Cancel; timeout/retry state. |
| Supported result | Deliver gated repair information. | Measurement basis; parts; tools; checks; steps; manual verification. |
| Recapture required | Request better evidence. | Reason; photo guidance; retake. |
| Unsupported/hazardous | Stop safely. | Reason category; seek-professional guidance; restart. |
| Privacy/settings | Explain data practice and marker configuration source. | Policy summary; local-state clearing control. |

## 12. Backend architecture

The backend is a Python FastAPI service using Pydantic request/response models. It is the only component permitted to call OpenAI or any other AI provider. The Expo mobile app communicates only with this backend and contains no API credentials.

Planned backend modules:

- **API layer:** FastAPI routers, Pydantic contracts, request-size/type validation, request IDs, and error mapping.
- **Capture validation:** MIME, size, dimensions, image count, and basic image-quality checks.
- **Calibration service:** OpenCV ArUco detection, configured marker verification, perspective/pose validation, measurement and uncertainty calculation.
- **Vision adapter:** Backend-only provider client; builds a bounded prompt and validates structured output against Pydantic models.
- **Safety rule engine:** Pure deterministic Python functions that combine validated observations and measurements into a decision.
- **Repair knowledge service:** Versioned curated templates, parts, tool requirements, safety checks, and approximate cost ranges.
- **Persistence abstraction:** Future SQLite repositories for non-image metadata and knowledge versions. Phase 1 has no database.
- **Privacy/operations layer:** Ephemeral image handling, redacted structured logs, configuration loading, and audit-friendly decision summaries.

No backend module may allow a model response to bypass the safety rule engine. The backend must not persist raw images by default.

## 13. Backend API contracts

All future endpoints are versioned under `/v1`; their definitions are planned contracts, not Phase 1 implementations.

### `GET /health` (implemented)

Response `200`:

```json
{ "status": "ok" }
```

### `POST /v1/analyses` (planned)

Accepts multipart image files and structured capture metadata. The mobile client sends no secrets.

Required metadata:

```json
{
  "marker": {
    "dictionary": "DICT_4X4_50",
    "marker_id": 17,
    "side_length_mm": 50.0,
    "print_scale_confirmed": true
  },
  "client_capture_id": "uuid",
  "app_version": "string"
}
```

Success response `200` is one of the following discriminated outcomes:

```json
{
  "analysis_id": "uuid",
  "outcome": "supported",
  "result": {
    "nominal_size_in": "3/4",
    "measurement_basis": "validated_aruco_marker",
    "measurement_uncertainty_percent": 3.1,
    "repair": { "...": "curated repair guidance" }
  }
}
```

```json
{
  "analysis_id": "uuid",
  "outcome": "recapture_required",
  "reason_code": "marker_not_detected",
  "message": "Place the complete printed marker beside the pipe and retake the image.",
  "repair_guidance": null
}
```

```json
{
  "analysis_id": "uuid",
  "outcome": "unsupported",
  "reason_code": "adjacent_fitting_detected",
  "message": "This repair is outside PipePatch AI's supported scope.",
  "repair_guidance": null
}
```

Responses for `400`, `413`, `415`, `422`, `429`, `500`, and `503` must use a typed error envelope with `request_id`, stable `code`, safe user message, and retryability. Error responses must never include a secret, raw model content, or image data.

## 14. Structured AI output schema

The vision adapter shall require JSON conforming to a Pydantic model similar to the following. Values are observations, not authoritative decisions.

```json
{
  "schema_version": "1.0",
  "overall_image_quality": { "value": "adequate", "confidence": 0.94 },
  "pipe_material_observation": { "value": "pvc_like", "confidence": 0.91 },
  "context_observation": { "value": "outdoor_irrigation_like", "confidence": 0.92 },
  "geometry": {
    "straight_exposed_segment": { "value": true, "confidence": 0.95 },
    "clean_transverse_cut": { "value": true, "confidence": 0.93 },
    "two_accessible_ends": { "value": true, "confidence": 0.89 }
  },
  "nearby_components": {
    "fitting_or_valve_visible": { "value": false, "confidence": 0.92 },
    "tee_or_branch_visible": { "value": false, "confidence": 0.94 },
    "additional_damage_visible": { "value": false, "confidence": 0.90 }
  },
  "hazards": {
    "pressurization_or_water_flow_visible": { "value": false, "confidence": 0.88 },
    "utility_or_electrical_hazard_visible": { "value": false, "confidence": 0.86 }
  },
  "uncertainties": ["pipe schedule cannot be visually confirmed"],
  "image_retake_suggestions": []
}
```

Schema rules:

- Use closed enums and booleans; do not accept free-form repair advice, parts, nominal pipe size, cost, or safety authorization from the model.
- Each safety-critical observation includes a confidence in `[0, 1]`.
- The model may state uncertainty but must not resolve it by guessing.
- Pydantic rejects malformed, missing, extra, or out-of-range fields before rule evaluation.

## 15. Responsibilities of the vision model

The vision model may:

- Extract bounded visual observations from submitted images.
- Assess image adequacy and describe why another image is needed.
- Detect visual indicators of a straight exposed segment, clean cut, fittings, branches, valves, additional damage, and visible hazards.
- Report confidence and uncertainty per observation.

The vision model must not:

- Determine final eligibility, nominal size, schedule, pressure rating, or repair authorization.
- Estimate exact physical dimensions from an ordinary uncalibrated image.
- Create repair steps, select parts, calculate costs, claim code compliance, or override a stop condition.
- Assert live retailer price, inventory, availability, or cheapest supplier.

## 16. Responsibilities of deterministic Python repair rules

Deterministic Python rules shall:

- Validate the calibrated measurement and its uncertainty.
- Apply configured confidence and cross-image consistency thresholds.
- Map measurements to supported Schedule-40 nominal-size ranges only when unambiguous.
- Evaluate all supported/unsupported safety gates and select a stable reason code.
- Select a versioned curated repair template only for a supported outcome.
- Generate the final typed response, including a refusal with `repair_guidance: null` when required.
- Record rule-set, calibration configuration, and parts-knowledge versions in non-image audit metadata.

## 17. OpenCV calibration-card measurement approach

The primary reference is a printable ArUco marker with configurable dictionary, ID, and physical side length in millimetres. Documentation shall specify its source file, paper size, required 100% printing, a ruler-based print-size check, placement beside the pipe in approximately the same plane, and minimum image quality.

Planned process:

1. Detect the expected marker via OpenCV's ArUco module and reject unknown or multiple ambiguous markers.
2. Verify all four corners, minimum pixel size, decodability, and acceptable perspective/reprojection error.
3. Derive image scale and, where appropriate, pose from configured marker side length.
4. Measure visible pipe geometry using a documented segmentation/edge-fitting method; estimate outer diameter and uncertainty.
5. Use multiple images or views when required; compare estimates and reject disagreement beyond the configured threshold.
6. Match only against curated Schedule-40 outer-diameter reference values/ranges for 1/2 in, 3/4 in, and 1 in nominal pipe.
7. Store only non-image measurement metadata for the response/audit record, unless future explicit consent is obtained.

A ruler may help a user manually verify a result, but ruler-only images must not produce an automated exact-size claim in the MVP.

## 18. Parts and repair-knowledge structure

The knowledge base is curated, versioned application data, not a retailer feed. Each repair template shall include:

- `supported_nominal_size_in` and Schedule-40 applicability.
- Required pressure-rated telescoping/slide repair coupling specification.
- Generic parts list: coupling, Schedule-40 PVC primer/cement compatible with local instructions, and any required pipe preparation items.
- Required tools: pipe cutter or suitable cutting tool, deburring/chamfering tool, marker, cloth, and safety equipment.
- Preconditions, safety checks, ordered method steps, cure-time disclaimer directing users to product labeling, and pressure-restoration check.
- Explicit exclusions, including flexible rubber drain couplings for pressurized irrigation.
- Approximate material-cost range, currency/region basis, source date, and statement that it is not live price or availability data.

Knowledge versions must be stored with every supported response so later changes can be traced.

## 19. Planned database entities

SQLite is planned for later backend-only use. Raw image storage is not an entity in the MVP.

| Entity | Purpose | Example fields |
| --- | --- | --- |
| `analysis_record` | Minimal anonymous decision audit. | ID, timestamps, outcome, reason code, rule-set version, request ID. |
| `measurement_record` | Non-image calibrated measurement summary. | Analysis ID, marker configuration version, dimensions, uncertainty, classification. |
| `repair_template` | Versioned curated method. | ID, supported size, preconditions, steps, safety checks, version. |
| `part_catalog_entry` | Curated generic item. | ID, name, specification, supported sizes, cost range, source date. |
| `cost_range` | Non-live approximate pricing. | Part/template ID, currency, low/high estimate, region basis, checked date. |
| `calibration_profile` | Printable marker configuration. | Dictionary, marker ID, side length, print instructions, version. |
| `evaluation_annotation` | Future consented research dataset metadata only. | Consent record ID, labels, reviewer, dataset version; no default production linkage. |

## 20. Privacy and security requirements

- Mobile code and all `EXPO_PUBLIC_*` variables shall contain no OpenAI API key or other secret. OpenAI calls, if introduced, occur only on the backend.
- Backend credentials shall be loaded from uncommitted server-side configuration and rotated through the deployment environment; they must never appear in source, logs, client responses, or screenshots.
- Use HTTPS/TLS for client-backend and backend-provider traffic outside local development.
- Anonymous sessions are sufficient for the MVP. Accounts, synchronization, and cloud repair history are out of scope.
- Collect only data necessary to process the current request. Local in-progress state may be stored only when needed for usability and must be clearable by the user.
- Apply request limits, file-size/type validation, rate limiting when deployed, dependency updates, and server-side access controls appropriate to the hosting environment.
- Do not log image contents, secrets, or personally identifying information. Redact error telemetry and retain it only as long as operationally required.
- Final hosting region and jurisdiction-specific obligations remain open decisions. The system shall preserve data minimization regardless of jurisdiction.

## 21. Image-handling and retention policy

1. Images are uploaded only to process the user-requested analysis.
2. Raw submitted images are held ephemerally in memory or temporary protected storage for the minimum analysis duration and deleted immediately after completion, failure, or timeout.
3. Images are not retained by default, included in ordinary logs, or used for model training, evaluation, or product improvement by default.
4. Dataset contribution is a future capability only. It requires explicit, informed, separate consent; a clear purpose; retention period; withdrawal process; de-identification review; and separation from the operational path.
5. The app must not imply that images are private if a configured third-party model provider processes them; any future provider disclosure must be clear before submission.

## 22. Testing strategy

| Test level | Scope |
| --- | --- |
| Unit | Pydantic schema validation, confidence boundaries, calibration math, size classification, every safety gate, refusal-code precedence, parts-template selection. |
| Contract | FastAPI request/response schemas, invalid media/metadata handling, versioned outcome envelopes, and guarantee of null repair guidance for refusals. |
| Image/calibration | Curated fixtures covering marker position, blur, glare, printing-scale error, perspective, occlusion, supported pipe sizes, and near-boundary dimensions. |
| Integration | Mocked vision provider plus real rule engine and knowledge base; verify model output cannot bypass authorization. |
| Mobile | Screen navigation, capture validation, accessible labels, supported/refusal rendering, retry/cancel, and no repair steps in refusal states. |
| Security/privacy | Secret scanning, dependency checks, log-redaction tests, image-deletion tests, and mobile bundle inspection for credential absence. |
| Manual/usability | Representative users follow print/capture instructions; record comprehension, capture success, and safe interpretation of refusal messages. |
| Regression | Versioned goldens for supported cases, all refusal codes, calibration profiles, and knowledge-base revisions. |

No test suite should use production user images without explicit consent and documented approval.

## 23. AI evaluation metrics

The evaluation dataset shall contain consented or safely constructed examples of supported and unsupported conditions, annotated by qualified reviewers where possible. Report metrics separately by nominal size, lighting, marker quality, and damage category.

- **Safety false-accept rate:** proportion of unsupported/hazardous cases that receive supported repair guidance. This is the primary risk metric and target is as close to zero as practical; any non-zero result blocks release pending review.
- **Supported-case precision:** proportion of supported outcomes that truly meet all scope criteria.
- **Supported-case recall:** proportion of truly supported cases accepted. Lower recall is acceptable when necessary to preserve safety.
- **Refusal precision/recall:** correctness of recapture and unsupported outcomes.
- **Nominal-size accuracy:** correct classification among accepted calibrated 1/2 in, 3/4 in, and 1 in cases; report confusion matrix and measurement error.
- **Calibration validity rate:** valid marker detection/scale estimation across print, distance, lighting, and angle conditions.
- **Critical-observation accuracy:** fittings/valves/branches, clean-cut geometry, exposed straight segment, and visible hazards.
- **Confidence calibration:** reliability diagrams or expected calibration error for safety-critical observations.
- **Human-factors measures:** capture success, time to outcome, comprehension of safety messages, and rate of users correctly acting on a refusal.

Acceptance thresholds for these metrics are unresolved until the dataset is defined. They must be set conservatively before any field use and re-evaluated after model, prompt, marker, or rule changes.

## 24. Failure and uncertainty states

| Code | Outcome | Required behaviour |
| --- | --- | --- |
| `marker_not_detected` | Recapture required | Explain placement/visibility; provide no size or repair. |
| `marker_invalid_or_print_scale_unverified` | Recapture required | Require configured marker and print validation. |
| `image_quality_insufficient` | Recapture required | Identify blur, glare, framing, or distance issue without guessing. |
| `measurement_uncertain` | Recapture required | Request better calibrated views; no nominal size claim. |
| `measurement_conflict` | Recapture required | State that views disagree; no repair guidance. |
| `visual_observation_low_confidence` | Recapture required | Ask for clearer evidence; no guidance. |
| `unsupported_pipe_or_size` | Unsupported | Stop; do not propose alternative fittings. |
| `adjacent_fitting_or_complex_damage` | Unsupported | Stop; recommend qualified assistance. |
| `safety_precondition_not_met` | Unsupported | Stop until water isolation/access hazards are resolved. |
| `repair_feasibility_unconfirmed` | Unsupported | Stop; do not infer clearance or coupling compatibility. |
| `vision_provider_unavailable` | Service failure | State no conclusion was made; retry later. |
| `analysis_timeout` | Service failure | State no conclusion was made; offer retry. |
| `invalid_request` | Input error | Explain required supported input; do not analyze partial data. |

## 25. MVP acceptance criteria

The MVP is ready for demonstration only when all of the following are demonstrably true:

1. The Expo TypeScript app communicates only with the FastAPI backend; no mobile artifact contains an OpenAI API key.
2. The backend successfully validates a configured ArUco marker and produces measurement uncertainty for controlled test images.
3. The backend refuses ordinary, ruler-only, missing-marker, and ambiguous images without claiming exact automated pipe size.
4. Controlled clean-cut, exposed, straight Schedule-40 PVC fixtures of 1/2 in, 3/4 in, and 1 in can reach a supported result only when all configured gates pass.
5. Every unsupported/hazardous fixture produces a typed refusal/recapture result with `repair_guidance: null`.
6. A supported response contains only the approved pressure-rated telescoping/slide repair-coupling method, curated parts/tools/safety checks, and a clearly non-live approximate cost range.
7. No supported response recommends flexible rubber drain couplings for pressurized irrigation.
8. Automated tests cover the health endpoint, schemas, rule engine, calibration fixtures, refusal precedence, API contracts, and mobile outcome rendering.
9. Submitted images are deleted by default after processing and are absent from operational logs; an inspection test demonstrates this policy.
10. The evaluation report documents false accepts, refusals, sizing performance, confidence calibration, limitations, and all threshold values used for the demonstration.

## 26. Future enhancements

- User accounts, opt-in cloud history, device synchronization, and exportable repair records.
- Explicitly consented, governed dataset contribution and evaluation tooling.
- Additional pipe sizes, materials, fittings, and repair types only after separate validation and safety review.
- Region-aware code/manufacturer references, live retailer integrations, inventory, pricing, and availability, subject to data-provider agreements and clear freshness labels.
- On-device preflight image-quality checks and offline guidance limited to non-diagnostic capture instructions.
- More robust calibration cards, multiple-marker workflows, and automated print verification.
- Human professional escalation, appointment referral, or local contractor integration.

## 27. Assumptions and unresolved decisions

| Item | Current decision / assumption | Status |
| --- | --- | --- |
| Primary marker | Printable configurable ArUco marker; dictionary, ID, side length, and printing instructions are versioned. | Decided |
| Ruler role | Manual user verification only; no exact automated ruler-only measurement. | Decided |
| Initial thresholds | Conservative provisional values in this specification; calibrate against evaluation data. | Open calibration task |
| Repair method | Pressure-rated telescoping/slide repair coupling for clean cuts in straight exposed pipe. | Decided |
| Cost information | Curated approximate ranges only; no live retail claims. | Decided |
| Image retention | Ephemeral deletion by default; future dataset use requires explicit informed consent. | Decided |
| Authentication | Anonymous MVP; no cloud history or synchronization. | Decided |
| Deployment | Local development currently. | Decided for current phase |
| Hosting region/jurisdiction | To be selected before deployment; assess applicable privacy, consumer, and data-processing requirements. | Open |
| Reference dimensions and tolerances | Curated Schedule-40 outer-diameter source, measurement algorithm, and final class bands must be documented and validated. | Open technical task |
| Dataset governance | Define source, consent, annotation protocol, reviewer qualifications, split strategy, and release criteria. | Open research task |
| Liability and user messaging | Obtain supervisor/institutional review of disclaimers and escalation wording before public release. | Open governance task |

This specification intentionally prioritizes refusing uncertain cases over maximizing coverage. Any expansion of material, size, damage type, fitting type, or repair method requires an explicit scope revision, new evidence, updated safety rules, and regression evaluation.
