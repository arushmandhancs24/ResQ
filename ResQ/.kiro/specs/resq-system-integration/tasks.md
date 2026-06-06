# Implementation Plan: ResQ System Integration

## Overview

This plan wires all four ResQ applications together by correcting broken API contracts, adding missing backend endpoints, and replacing the Operator Panel's hardcoded state with live backend calls. Tasks follow the dependency order: backend first, then client fixes, then the Operator Panel integration. Property-based tests are placed immediately after the logic they validate.

## Tasks

- [x] 1. Create `/ws/dispatch` WebSocket router on the backend
  - Create `ResQ_backend-main/ResQ_backend-main/app/api/ws.py` with a `ws_router` using the existing `ConnectionManager` (`manager`) from `app/core/websocket_manager.py`
  - Implement the `@ws_router.websocket("/ws/dispatch")` endpoint: call `manager.connect(websocket)`, loop on `websocket.receive_text()` to keep alive, and call `manager.disconnect(websocket)` on `WebSocketDisconnect`
  - Register `ws_router` in `ResQ_backend-main/ResQ_backend-main/app/main.py` by importing and calling `app.include_router(ws_router)`
  - _Requirements: 1.1, 1.2, 1.8_

- [x] 2. Normalise ambulance status casing in `fleet.py`
  - [x] 2.1 Add casing normalisation to `PUT /fleet/{unit_id}/status` in `app/api/fleet.py`
    - Strip and lowercase the incoming `status_update.status` value before any processing
    - Import `AmbulanceStatus` from `app.db.models` and validate the normalised value against `{s.value for s in AmbulanceStatus}`; raise HTTP 422 with a descriptive message if invalid
    - Pass the normalised value to `FleetStateManager.update_status()` and include it in the `STATUS_UPDATE` broadcast
    - Ensure `GET /fleet/status` returns lowercase status values (verify `FleetStateManager.get_all_available()` returns what Redis stored — the normalised value)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.2 Write property test for status casing normalisation (Property 3)
    - **Property 3: Status casing normalisation** — for any valid `AmbulanceStatus` value in any mix of upper/lower case, the normalisation function SHALL produce the corresponding lowercase enum value
    - Use `hypothesis` with `st.sampled_from` over the valid enum values mapped through a random-casing transform (see design Testing Strategy section for the exact pattern)
    - Run with `@settings(max_examples=200)`
    - Place the test in `ResQ_backend-main/ResQ_backend-main/tests/test_status_normalisation_pbt.py`
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 3. Expand `POST /dispatch/request` response and write `hospital_id` to `DispatchLog`
  - [x] 3.1 Update `app/api/dispatch.py` to populate `ambulance` and `hospital` in the dispatch response
    - After selecting `best_unit_id`, query the `Ambulance` DB row for that ID
    - Invoke `rank_hospitals()` from `app.core.hospital_router` with the incident's `latitude`, `longitude`, and `incident_type` as `required_specialty`; take the first result as the assigned hospital (or `None` if the list is empty)
    - Set `dispatch_log.hospital_id` to the selected hospital's `id` (or `None`)
    - Before returning the HTTP response, broadcast a `"dispatch"` type message (not just `"STATUS_UPDATE"`) to `manager` containing `ambulance_id`, `incident_id`, `incident` object fields, `hospital` object, and `eta_seconds` (per the WebSocket message schema in the design)
    - Return the expanded response shape: `message`, `incident_id`, `assigned_unit`, `eta_seconds`, `ambulance` (dict with `id`, `vehicle_number`, `latitude`, `longitude`, `status` as lowercase string), `hospital` (dict or `None`)
    - Import `Hospital` from `app.db.models` and `rank_hospitals` from `app.core.hospital_router`
    - _Requirements: 1.3, 5.1, 5.2, 5.3, 5.4, 8.1, 8.2_

  - [ ] 3.2 Write unit test asserting dispatch response shape completeness
    - Mock the DB session, `find_best_ambulance`, `rank_hospitals`, and `FleetStateManager.update_status`
    - Call `POST /dispatch/request` and assert all required top-level keys are present and `ambulance.status` is lowercase
    - Place in `ResQ_backend-main/ResQ_backend-main/tests/test_dispatch.py`
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4. Update `GET /dispatch/history` — ambulance_id filter and hospital_name join
  - Update the `get_dispatch_history` function in `app/api/dispatch.py`
  - Add `ambulance_id: Optional[int] = Query(None)` parameter; when set, filter `DispatchLog` records by `DispatchLog.ambulance_id == ambulance_id`
  - Build the result list manually: for each log, include `id`, `incident_id`, `ambulance_id`, `hospital_id`, `eta_seconds`, `alternatives_considered`, `dispatched_at` (ISO format string), and `hospital_name` (resolved by querying the `Hospital` table when `hospital_id` is set, otherwise `None`)
  - Import `Hospital` from `app.db.models` and `Optional` from `typing`
  - _Requirements: 7.1, 7.2, 7.3, 8.3, 8.4_

  - [ ] 4.1 Write property test for dispatch history filter correctness (Property 7)
    - **Property 7: Dispatch history filter correctness** — for any `ambulance_id` integer, every record in the response array SHALL have `ambulance_id` equal to the filter value, and `len(logs) <= 50`
    - Use `hypothesis` with `st.integers(min_value=1, max_value=100)` against a test DB seeded with mixed-ambulance-id logs
    - Place in `ResQ_backend-main/ResQ_backend-main/tests/test_dispatch_history_pbt.py`
    - **Validates: Requirements 7.1, 7.2**

- [ ] 5. Update `GET /hospital/recommend` to support lat/lon/incident_type overload
  - Update `app/api/hospital.py`: make `incident_id` an `Optional[int]` parameter; add `lat: Optional[float]`, `lon: Optional[float]`, `incident_type: Optional[str]` query parameters
  - Add mutual-exclusion validation: if `incident_id` is set, use the existing path; if `lat` and `lon` are set (without `incident_id`), use them directly with `incident_type` as `required_specialty`; if neither is provided, raise HTTP 422
  - When using lat/lon path, omit `incident_id` from the response; when using `incident_id` path, keep `incident_id` in the response (per the design response shapes)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Configure CORS from `ALLOWED_ORIGINS` environment variable in `main.py`
  - Update `ResQ_backend-main/ResQ_backend-main/app/main.py`: read `os.getenv("ALLOWED_ORIGINS", "")` and parse it by splitting on commas and stripping whitespace from each token, filtering out empty strings
  - If the parsed list is non-empty, pass it to `CORSMiddleware` as `allow_origins`; if empty (env var not set or blank), fall back to `["*"]`
  - Add `import os` at the top of `main.py`
  - _Requirements: 12.1, 12.2, 12.7_

  - [ ] 6.1 Write property test for CORS origin list parsing (Property 8)
    - **Property 8: CORS origin list parsing** — for any non-empty comma-separated string of origin values with arbitrary surrounding whitespace, the parser SHALL produce a list whose elements are exactly the trimmed origin strings in order with no empty entries
    - Extract the parsing logic into a standalone helper function `parse_allowed_origins(raw: str) -> list[str]` in `main.py` so it can be tested in isolation
    - Use `hypothesis` with `st.lists(st.from_regex(r'https?://[a-z0-9.-]+', fullmatch=True), min_size=1, max_size=10)` combined with random whitespace injection
    - Place in `ResQ_backend-main/ResQ_backend-main/tests/test_cors_parsing_pbt.py`
    - **Validates: Requirements 12.1, 12.2, 12.7**

- [ ] 7. Update backend `.env.example` with `ALLOWED_ORIGINS` documentation
  - Add `ALLOWED_ORIGINS` to `ResQ_backend-main/ResQ_backend-main/.env.example` with a comment explaining the comma-separated format and that it defaults to `["*"]` when not set
  - Example value: `ALLOWED_ORIGINS=http://localhost:5173,https://resq.example.com`
  - _Requirements: 12.3_

- [ ] 8. Checkpoint — backend changes complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Fix HTTP methods in Staff App `App.tsx` (POST → PUT)
  - In `resq-staff-expo/App.tsx`, change all `method: "POST"` calls that target `/fleet/{unitId}/location` and `/fleet/{unitId}/status` to `method: "PUT"`
  - Affected locations: `handleStartShift` (status call), `handleStatusChange` (status call), the telemetry `fetch` in the GPS interval effect, and the route simulation `fetch` inside the simulation interval effect
  - _Requirements: 2.1, 2.2_

- [ ] 10. Fix fleet status response parsing in Staff App `handleRefreshFleet`
  - In `resq-staff-expo/App.tsx` `handleRefreshFleet`, replace the `Array.isArray(data)` check with reading `data.available_units`
  - When `response.ok` and `data.available_units` is a non-empty array, call `setNearbyFleet(data.available_units)`
  - When `data.available_units` is an empty array, call `setNearbyFleet([])` (display empty state, do not fall back to mock randomisation)
  - _Requirements: 4.1, 4.3_

- [ ] 11. Fix dispatch history URL construction in Staff App `HistoryScreen.tsx`
  - In `resq-staff-expo/src/components/HistoryScreen.tsx`, update `fetchHistory` to build the URL conditionally: when `filterMode === "mine"` use `${backendUrl}/dispatch/history?ambulance_id=${unitId}`, when `filterMode === "all"` use `${backendUrl}/dispatch/history`
  - The filter toggle currently changes the client-side `filteredHistory` array; change it to re-trigger `fetchHistory` so the backend does the filtering — add `filterMode` and `unitId` to the `useEffect` dependency array
  - Remove the client-side `.filter((log) => filterMode === "all" || log.ambulance_id === unitId)` once the backend filters correctly
  - _Requirements: 7.4, 7.5, 7.6_

- [ ] 12. Fix hospital recommendation response parsing in Staff App `ActiveIncidentScreen.tsx`
  - In `resq-staff-expo/src/components/ActiveIncidentScreen.tsx`, inside `fetchHospitals`, the fetch URL already uses `lat/lon/incident_type` params — verify the URL matches `${backendUrl}/hospital/recommend?lat=${lat}&lon=${lon}&incident_type=${type}`
  - Change the response parsing from `if (Array.isArray(data) && data.length > 0)` to `if (data.recommendations && data.recommendations.length > 0)`, then set `setHospitalsList(data.recommendations)` and seed `selectedHospital` with `data.recommendations[0]`
  - _Requirements: 6.6, 6.7_

- [ ] 13. Create Staff App `.env.example`
  - Create `resq-staff-expo/.env.example` documenting the `backendUrl` runtime value used in the onboarding screen (note it is entered by the user at runtime, not a build-time env var) and any build-time variables
  - Document the expected URL format: `http://<host>:<port>` (e.g., `http://10.0.2.2:8000` for Android emulator, `http://localhost:8000` for iOS simulator)
  - _Requirements: 12.5_

- [ ] 14. Fix mock mode bug in User App `config.ts`
  - In `ResQ_User_Frontend/constants/config.ts`, change `mockModeDefault` from `process.env.EXPO_PUBLIC_MOCK_MODE === 'true' || true` to `process.env.EXPO_PUBLIC_MOCK_MODE === 'true'`
  - This makes `mockModeDefault` evaluate to `false` when `EXPO_PUBLIC_MOCK_MODE` is unset or set to any value other than `"true"`
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 15. Derive initial `mockMode` from `config.mockModeDefault` in User App `appStore.ts`
  - In `ResQ_User_Frontend/store/appStore.ts`, import `config` from `'../constants/config'`
  - Change the initial value of `mockMode` from the hardcoded `false` to `config.mockModeDefault`
  - _Requirements: 10.4_

- [ ] 16. Fix incident ID field name in User App `useIncident.ts`
  - In `ResQ_User_Frontend/hooks/useIncident.ts`, change `const incidentId = reportRes.data.id` to `const incidentId = reportRes.data.incident_id`
  - Ensure the `setActiveIncident` call immediately after uses the now-correct `incidentId`
  - Add a guard: if `reportRes.data.incident_id` is `undefined`, set `submitError` and return early before calling `POST /dispatch/request`
  - _Requirements: 9.2, 9.3_

- [ ] 17. Fix mock incident report shape in User App `services/mock.ts`
  - In `ResQ_User_Frontend/services/mock.ts`, add `incident_id: 42` to `mockIncidentReport` so its shape matches the real backend response `{status, message, incident_id}`
  - Remove (or keep alongside) the existing `id: 42` field — the field the `useIncident` hook now reads is `incident_id`
  - _Requirements: 9.1_

- [ ] 18. Create User App `.env.example`
  - Create `ResQ_User_Frontend/.env.example` documenting `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL`, and `EXPO_PUBLIC_MOCK_MODE`
  - Include example values pointing to localhost and explanatory comments describing each variable's effect
  - _Requirements: 12.6_

- [ ] 19. Checkpoint — mobile app fixes complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Wire Operator Panel to backend environment variables and add state
  - In `remix_-resq-operator-panel/src/App.tsx`, add two derived constants at the top of the component (or module-level): `const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'` and `const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/dispatch'`
  - Add two new state variables: `const [wsConnected, setWsConnected] = useState(false)` and `const [backendWarning, setBackendWarning] = useState<string | null>(null)`
  - _Requirements: 11.1_

- [ ] 21. Fetch fleet status and dispatch history on Operator Panel mount
  - In `remix_-resq-operator-panel/src/App.tsx`, add a `useEffect` (runs once on mount) that:
    - Fetches `GET ${apiBaseUrl}/fleet/status` and calls `setFleetUnits(data.available_units)` on success; on failure, sets `backendWarning` with a descriptive message and retains existing `INITIAL_FLEET_UNITS`
    - Fetches `GET ${apiBaseUrl}/dispatch/history` and calls `setIncidents(data)` (data is an array) on success; on failure, sets `backendWarning` and retains `INITIAL_INCIDENTS`
  - Both fetches run concurrently (`Promise.allSettled` or separate try/catch blocks)
  - Map the `DispatchLog` array from `/dispatch/history` to the existing `Incident` shape used by `LogsView` — use `log.id`, `log.ambulance_id`, `log.dispatched_at`, `log.hospital_name`, `log.eta_seconds`; derive missing fields with sensible defaults
  - _Requirements: 11.2, 11.3, 11.10_

- [ ] 22. Connect Operator Panel WebSocket with exponential-backoff reconnect
  - In `remix_-resq-operator-panel/src/App.tsx`, add a `useRef` for the WebSocket instance and a `useState` reconnect counter
  - Add a `useEffect` (depends on reconnect counter) that creates a `new WebSocket(wsUrl)`, sets `wsConnected` on open/close, and handles three message types on `onmessage`:
    - `LOCATION_UPDATE`: update the matching fleet unit's `latitude`/`longitude` (or `coordinates`) in `fleetUnits` state
    - `STATUS_UPDATE`: update the matching fleet unit's `status` in `fleetUnits` state (map `unit_id` → fleet unit `id`)
    - `dispatch`: prepend a new entry to `incidents` state using the message's `incident_id`, `ambulance_id`, `eta_seconds`, and nested objects
  - On `onclose`, compute the next wait as `Math.min(1000 * Math.pow(2, reconnectAttempt), 16000)` ms, then increment the reconnect counter after that delay using `setTimeout`
  - Clean up the WebSocket and any pending timeout on effect teardown
  - _Requirements: 11.8, 11.9_

  - [ ] 22.1 Write property test for WebSocket reconnect backoff bound (Property 9)
    - **Property 9: Operator Panel WebSocket reconnect backoff bound** — for any attempt number N ≥ 0, `computeBackoff(N)` SHALL equal `Math.min(1000 * Math.pow(2, N), 16000)`
    - Extract the backoff formula into a pure exported function `computeBackoff(attempt: number): number` in `remix_-resq-operator-panel/src/App.tsx` or a new `src/utils/backoff.ts`
    - Use `fast-check` with `fc.nat({ max: 20 })` to generate N values and assert the formula
    - Place in `remix_-resq-operator-panel/src/utils/backoff.test.ts`
    - **Validates: Requirements 11.9**

- [ ] 23. Wire `handleDispatchSubmit` to `POST /dispatch/request`
  - In `remix_-resq-operator-panel/src/App.tsx`, update `handleDispatchSubmit` to call `POST ${apiBaseUrl}/dispatch/request` with a JSON body containing `latitude`, `longitude` (parsed from `dispatchData.coordinates`), and `incident_type` (from `dispatchData.type`)
  - On success, use the returned `incident_id` and `assigned_unit` to populate the new `Incident` entry (replace the current `nextId` derivation with the backend-assigned ID)
  - On failure, keep the current local-state fallback and log to console; do not crash the UI
  - _Requirements: 11.6_

- [ ] 24. Wire `handleModifyStatus` to `PUT /fleet/{id}/status`
  - In `remix_-resq-operator-panel/src/App.tsx`, update `handleModifyStatus` to call `PUT ${apiBaseUrl}/fleet/${unitId}/status` with body `{ status: newStatus.toLowerCase() }` after updating local state
  - Fire-and-forget: log failures to console; do not revert local state on error (the WebSocket `STATUS_UPDATE` will self-correct if the backend actually processed it)
  - _Requirements: 11.7_

- [ ] 25. Display non-blocking backend warning indicator in Operator Panel
  - In `remix_-resq-operator-panel/src/App.tsx`, render a dismissible amber warning banner when `backendWarning` is non-null
  - Place the banner in the header area (below the existing header row) so it is visible without blocking the main workspace
  - Include a close button that calls `setBackendWarning(null)`
  - _Requirements: 11.10_

- [ ] 26. Update Operator Panel `.env.example` with `VITE_API_URL` and `VITE_WS_URL`
  - Update `remix_-resq-operator-panel/.env.example` to add `VITE_API_URL` and `VITE_WS_URL` with example values pointing to the backend (`http://localhost:8000` and `ws://localhost:8000/ws/dispatch`) and explanatory comments
  - Keep existing entries in the file
  - _Requirements: 12.4_

- [ ] 27. Checkpoint — Operator Panel integration complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- The backend tasks (1–8) must be completed before the client fixes (9–18) and Operator Panel integration (19–27), because the client tasks rely on the corrected backend contracts
- Property tests (2.2, 4.1, 6.1, 22.1) validate universal correctness properties and require `hypothesis` (Python) or `fast-check` (TypeScript/Node) to be installed in their respective projects
- No database migrations are needed — `hospital_id` already exists as a nullable FK on `dispatch_log`
