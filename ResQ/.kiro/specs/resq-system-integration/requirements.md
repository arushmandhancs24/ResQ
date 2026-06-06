# Requirements Document

## Introduction

The ResQ system consists of four applications that must work together as a cohesive emergency dispatch platform:

- **Operator Panel** (`remix_-resq-operator-panel`) — React + Vite web SPA used by 108 operators to monitor fleet, dispatch incidents, and view logs. Currently operates entirely on hardcoded local state with no backend connectivity.
- **Staff App** (`resq-staff-expo`) — Expo React Native app used by ambulance crews. Has multiple broken API contracts with the backend: wrong HTTP methods, mismatched response shapes, wrong WebSocket endpoint, and wrong hospital recommendation parameters.
- **User App** (`ResQ_User_Frontend`) — Expo Router React Native citizen app for reporting emergencies. Has response field mismatches on incident report and dispatch request, the wrong WebSocket endpoint, and a hardcoded mock mode bug that prevents real backend use.
- **Backend** (`ResQ_backend-main`) — FastAPI + PostgreSQL + Redis service. Missing the `/ws/dispatch` WebSocket endpoint both mobile apps expect, does not assign a hospital during dispatch, cannot filter dispatch history by ambulance, and does not support hospital recommendation by lat/lon.

This feature spec defines the requirements to correct all broken contracts and missing functionality so the full system operates correctly when deployed.

---

## Glossary

- **Backend**: The FastAPI application (`ResQ_backend-main`) that owns all persistent data and business logic.
- **Operator_Panel**: The React + Vite web SPA used by 108 emergency operators.
- **Staff_App**: The Expo React Native application used by ambulance crew members.
- **User_App**: The Expo Router React Native application used by citizens reporting emergencies.
- **DispatchLog**: The PostgreSQL record linking an `Incident`, an `Ambulance`, a `Hospital`, ETA, and dispatch timestamp.
- **FleetStateManager**: The Redis-backed in-memory cache inside the Backend that tracks live ambulance positions and statuses.
- **WebSocket_Manager**: The Backend component (`ConnectionManager`) that manages all active WebSocket connections and broadcasts messages to them.
- **Dispatch_Engine**: The Backend component (`find_best_ambulance`) that selects the optimal ambulance for an incident using OSRM ETAs.
- **Hospital_Router**: The Backend component (`rank_hospitals`) that ranks hospitals by drive time, specialty match, and ER capacity.
- **AmbulanceStatus**: The set of valid ambulance states: `available`, `dispatched`, `en_route_hospital`, `at_hospital`, `returning`, `offline` (all lowercase as defined in the `AmbulanceStatus` enum in `models.py`).
- **Mock_Mode**: A flag in the User_App that bypasses real API calls and uses local simulation data instead.
- **CORS**: Cross-Origin Resource Sharing headers that must be configured on the Backend to allow browser and mobile clients to connect.
- **env_var**: An environment variable injected at build or runtime to configure a service's external connection endpoints.

---

## Requirements

### Requirement 1: WebSocket Endpoint Unification

**User Story:** As an ambulance crew member and as a citizen user, I want to receive real-time dispatch notifications and status updates over WebSocket, so that I am instantly informed when an ambulance is assigned or when its status changes.

#### Acceptance Criteria

1. THE Backend SHALL expose a WebSocket endpoint at the path `/ws/dispatch` in addition to the existing `/fleet/ws` endpoint.
2. WHEN a client connects to `/ws/dispatch`, THE WebSocket_Manager SHALL register that connection in the active connections pool.
3. WHEN the Dispatch_Engine successfully assigns an ambulance to an incident, THE Backend SHALL broadcast a message of type `"dispatch"` to all clients connected on `/ws/dispatch` containing `ambulance_id`, `incident_id`, `incident` object, `hospital` object, and `eta_seconds`.
4. WHEN an ambulance's status changes via `PUT /fleet/{unit_id}/status`, THE Backend SHALL broadcast a message of type `"STATUS_UPDATE"` to all clients connected on `/ws/dispatch` containing `unit_id` and `status`.
5. WHEN an ambulance's location changes via `PUT /fleet/{unit_id}/location`, THE Backend SHALL broadcast a message of type `"LOCATION_UPDATE"` to all clients connected on `/ws/dispatch` containing `unit_id`, `latitude`, and `longitude`.
6. THE Staff_App SHALL connect its WebSocket client to the path `{backendUrl}/ws/dispatch` instead of `{backendUrl}/ws/dispatch` (confirming the path is `/ws/dispatch`, not `/ws/dispatch` with a different prefix).
7. THE User_App SHALL connect its WebSocket client to the URL configured in `EXPO_PUBLIC_WS_URL`, which SHALL default to `ws://localhost:8000/ws/dispatch`.
8. IF a WebSocket client disconnects from `/ws/dispatch`, THEN THE WebSocket_Manager SHALL remove that connection from the active connections pool.

---

### Requirement 2: HTTP Method Correction for Fleet Updates (Staff App)

**User Story:** As an ambulance crew member, I want my GPS location and status updates to reach the backend correctly, so that the dispatch center always has an accurate picture of my position and availability.

#### Acceptance Criteria

1. WHEN the Staff_App sends a GPS location update, THE Staff_App SHALL use the HTTP `PUT` method to call `{backendUrl}/fleet/{unitId}/location`.
2. WHEN the Staff_App sends a status update, THE Staff_App SHALL use the HTTP `PUT` method to call `{backendUrl}/fleet/{unitId}/status`.
3. THE Backend SHALL accept `PUT /fleet/{unit_id}/location` with a JSON body containing `latitude` and `longitude` as floating-point numbers and return HTTP 200 with `{"message": "Location updated successfully"}`.
4. THE Backend SHALL accept `PUT /fleet/{unit_id}/status` with a JSON body containing `status` as a string and return HTTP 200.

---

### Requirement 3: Status Enum Casing Normalisation

**User Story:** As a system integrator, I want all applications to agree on the casing of ambulance status strings, so that status comparisons and database writes never fail due to case mismatches.

#### Acceptance Criteria

1. THE Backend SHALL accept status values in any casing (e.g., `"AVAILABLE"`, `"available"`, `"Available"`) by normalising the received value to lowercase before processing or persisting it.
2. WHEN the Backend persists or compares an ambulance status, THE Backend SHALL use the lowercase `AmbulanceStatus` enum values (`"available"`, `"dispatched"`, `"en_route_hospital"`, `"at_hospital"`, `"returning"`, `"offline"`).
3. THE Backend SHALL return all ambulance status values in lowercase in every API response.
4. IF the Staff_App sends an unrecognised status string after normalisation, THEN THE Backend SHALL return HTTP 422 with a descriptive error message.

---

### Requirement 4: Fleet Status Response Shape Correction (Staff App)

**User Story:** As an ambulance crew member, I want the fleet refresh screen to correctly display all nearby units, so that I have situational awareness of available resources.

#### Acceptance Criteria

1. WHEN the Staff_App calls `GET /fleet/status`, THE Staff_App SHALL read the `available_units` array from the response object `{ "available_units": [...] }` rather than treating the top-level response as an array.
2. THE Backend SHALL return `GET /fleet/status` as `{"available_units": [list of unit objects]}` (this is the existing correct shape; the Staff_App must conform to it).
3. WHEN `GET /fleet/status` returns an empty `available_units` array, THE Staff_App SHALL display an appropriate empty-state message rather than falling back to mock data.

---

### Requirement 5: Dispatch Request Response Shape Alignment

**User Story:** As a citizen user, I want to see my assigned ambulance details and destination hospital immediately after reporting an emergency, so that I know help is on the way and where I will be taken.

#### Acceptance Criteria

1. WHEN `POST /dispatch/request` succeeds, THE Backend SHALL return a JSON response containing: `message`, `incident_id`, `assigned_unit` (integer ambulance ID), `eta_seconds`, `ambulance` (object with `id`, `vehicle_number`, `latitude`, `longitude`, `status`), and `hospital` (object with `id`, `name`, `latitude`, `longitude`, `specialties`, `er_capacity`, `is_24x7`).
2. THE Backend SHALL populate the `ambulance` field by querying the Ambulance record matching `assigned_unit` from the database before returning the response.
3. THE Backend SHALL populate the `hospital` field by invoking the Hospital_Router with the incident's coordinates and selected `required_specialty` before returning the response.
4. WHEN no hospital is found by the Hospital_Router, THE Backend SHALL still return a successful response with `hospital` set to `null`.
5. THE User_App SHALL read `dispatchData.ambulance.id`, `dispatchData.ambulance.vehicle_number`, `dispatchData.ambulance.latitude`, `dispatchData.ambulance.longitude`, `dispatchData.ambulance.status`, and `dispatchData.eta_seconds` from the `/dispatch/request` response to populate the assigned ambulance state.
6. THE User_App SHALL read `dispatchData.hospital` from the `/dispatch/request` response to populate the destination hospital state.
7. THE User_App `useIncident` hook SHALL use `reportRes.data.incident_id` (not `reportRes.data.id`) to read the incident ID returned by `POST /incidents/report`.

---

### Requirement 6: Hospital Recommendation API Contract Alignment

**User Story:** As an ambulance crew member and as a citizen user, I want the system to recommend the most appropriate hospital for an active incident, so that the patient is transported to the optimal facility.

#### Acceptance Criteria

1. THE Backend SHALL support `GET /hospital/recommend` with query parameter `incident_id` (required, integer) as it currently does.
2. THE Backend SHALL additionally support `GET /hospital/recommend` with query parameters `lat` (float), `lon` (float), and `incident_type` (string) as an alternative lookup path when no `incident_id` is available.
3. WHEN `lat`, `lon`, and `incident_type` are provided without `incident_id`, THE Hospital_Router SHALL rank hospitals using the provided coordinates and incident type as the required specialty.
4. WHEN both `incident_id` and `lat`/`lon` are provided, THE Backend SHALL prefer `incident_id` for the coordinate lookup.
5. IF neither `incident_id` nor `lat`/`lon` are provided, THEN THE Backend SHALL return HTTP 422 with a descriptive validation error.
6. THE Staff_App SHALL call `GET /hospital/recommend?lat={lat}&lon={lon}&incident_type={type}` when the active incident's stage reaches 3 (patient loaded), using the incident's latitude, longitude, and incident_type.
7. THE Staff_App SHALL read the `recommendations` array from the response object `{"incident_id": ..., "recommendations": [...]}` when `incident_id` is provided, and from `{"recommendations": [...]}` when lat/lon are used.
8. THE User_App hospital recommendation calls SHALL also conform to the updated contract using `lat`, `lon`, and `incident_type` parameters.

---

### Requirement 7: Dispatch History Filtering by Ambulance (Staff App)

**User Story:** As an ambulance crew member, I want to view only my own dispatch history, so that I can review the incidents I have responded to during my shift and for shift reporting.

#### Acceptance Criteria

1. THE Backend SHALL accept an optional `ambulance_id` query parameter on `GET /dispatch/history`.
2. WHEN `ambulance_id` is provided, THE Backend SHALL return only the `DispatchLog` records where `ambulance_id` matches the given value, ordered by `dispatched_at` descending, limited to 50 records.
3. WHEN `ambulance_id` is not provided, THE Backend SHALL return the 50 most recent `DispatchLog` records across all ambulances (existing behaviour).
4. THE Staff_App HistoryScreen SHALL pass the crew's `unitId` as the `ambulance_id` query parameter when `filterMode` is `"mine"` (e.g., `GET /dispatch/history?ambulance_id={unitId}`).
5. WHEN `filterMode` is `"all"`, THE Staff_App HistoryScreen SHALL call `GET /dispatch/history` without the `ambulance_id` parameter.
6. THE Backend dispatch history response SHALL be a JSON array of `DispatchLog` objects (the Staff_App currently expects a plain array, not a wrapped object).

---

### Requirement 8: DispatchLog Hospital Assignment

**User Story:** As a system operator, I want every dispatch log to record which hospital was assigned so that audit trails are complete and the dispatch history screen can display the destination facility.

#### Acceptance Criteria

1. WHEN `POST /dispatch/request` creates a `DispatchLog`, THE Backend SHALL set `hospital_id` on the `DispatchLog` to the ID of the hospital selected by the Hospital_Router.
2. WHEN no hospital is returned by the Hospital_Router, THE Backend SHALL set `hospital_id` to `null` on the `DispatchLog`.
3. THE Backend `GET /dispatch/history` response SHALL include the `hospital_id` field on each `DispatchLog` record.
4. THE Backend `GET /dispatch/history` response SHOULD include a `hospital_name` field populated by joining the `Hospital` table, so clients can display the facility name without a separate lookup.

---

### Requirement 9: Incident Report Response Field Alignment (User App)

**User Story:** As a citizen user, I want the app to correctly track my reported incident so that I can monitor its progress and the app does not silently store the wrong incident ID.

#### Acceptance Criteria

1. WHEN `POST /incidents/report` succeeds, THE Backend SHALL return `{"status": "success", "message": "...", "incident_id": <int>}` (this is the existing correct shape).
2. THE User_App `useIncident` hook SHALL read `reportRes.data.incident_id` to obtain the newly created incident ID, not `reportRes.data.id`.
3. THE User_App SHALL store the correct `incident_id` in the `activeIncident` state immediately after `POST /incidents/report` returns, before calling `POST /dispatch/request`.

---

### Requirement 10: Mock Mode Bug Fix (User App)

**User Story:** As a developer or tester deploying the User App against a real backend, I want mock mode to be controlled by the environment variable `EXPO_PUBLIC_MOCK_MODE`, so that the app connects to real backend services when the variable is set to `"false"`.

#### Acceptance Criteria

1. THE User_App `config.ts` `mockModeDefault` value SHALL be `process.env.EXPO_PUBLIC_MOCK_MODE === 'true'` without the `|| true` fallback, so the default is `false` when the env var is absent or set to any value other than `"true"`.
2. WHEN `EXPO_PUBLIC_MOCK_MODE` is set to `"true"`, THE User_App SHALL operate in mock mode, using the local simulation engine instead of real API calls.
3. WHEN `EXPO_PUBLIC_MOCK_MODE` is set to `"false"` or is not set, THE User_App SHALL operate in live mode and call the real backend endpoints.
4. THE User_App `appStore.ts` initial `mockMode` value SHALL be derived from `config.mockModeDefault` rather than being hardcoded to `false`, so the persisted store respects the environment variable on first launch.

---

### Requirement 11: Operator Panel Backend Integration

**User Story:** As a 108 operator, I want the Operator Panel to display live fleet positions, active dispatch logs, and dispatch center data from the backend, so that I am making decisions based on real data rather than static mock data.

#### Acceptance Criteria

1. THE Operator_Panel SHALL read `VITE_API_URL` and `VITE_WS_URL` environment variables to determine the backend base URL and WebSocket URL at startup.
2. WHEN the Operator_Panel loads, THE Operator_Panel SHALL fetch `GET /fleet/status` and populate the fleet units state from `response.available_units`.
3. WHEN the Operator_Panel loads, THE Operator_Panel SHALL fetch `GET /dispatch/history` and populate the incidents/logs state from the response array.
4. WHEN the Operator_Panel loads, THE Operator_Panel SHALL fetch `GET /api/dispatch-centers` and populate the dispatch centers state.
5. WHEN the Operator_Panel loads, THE Operator_Panel SHALL fetch `GET /api/mesh` and populate the mesh links state for the map overlay.
6. WHEN the operator submits the `NewDispatchForm`, THE Operator_Panel SHALL call `POST /dispatch/request` with `latitude`, `longitude`, and `incident_type` and update the incidents state with the returned `incident_id` and `assigned_unit`.
7. WHEN the operator changes a fleet unit's status via the Fleet View, THE Operator_Panel SHALL call `PUT /fleet/{id}/status` with the new status value.
8. THE Operator_Panel SHALL connect to the WebSocket at `VITE_WS_URL` on load and update fleet unit positions and statuses in real time from `LOCATION_UPDATE` and `STATUS_UPDATE` messages.
9. WHEN the WebSocket connection drops, THE Operator_Panel SHALL attempt reconnection with exponential backoff up to a maximum wait of 16 seconds between attempts.
10. IF a backend API call fails during initial load, THEN THE Operator_Panel SHALL retain the existing local state as a fallback and display a non-blocking warning indicator in the UI.

---

### Requirement 12: CORS and Environment Variable Configuration for Deployment

**User Story:** As a DevOps engineer deploying the ResQ system, I want the backend CORS policy to restrict allowed origins to configured values and all four applications to have documented environment variable files, so that the system can be deployed securely and consistently across environments.

#### Acceptance Criteria

1. THE Backend `allow_origins` CORS configuration SHALL read a comma-separated list of allowed origins from an environment variable `ALLOWED_ORIGINS`, defaulting to `["*"]` only in development mode.
2. WHEN `ALLOWED_ORIGINS` is set, THE Backend SHALL pass the parsed list to `CORSMiddleware` instead of `["*"]`.
3. THE Backend `.env.example` SHALL document `ALLOWED_ORIGINS` with a comment explaining its format and purpose.
4. THE Operator_Panel `.env.example` SHALL document `VITE_API_URL` and `VITE_WS_URL` with example values pointing to the backend.
5. THE Staff_App SHALL provide a `.env.example` documenting the expected `backendUrl` format (used at runtime via the onboarding screen, not as an env var) and any build-time variables.
6. THE User_App `.env.example` (or `app.json` `extra` section) SHALL document `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL`, and `EXPO_PUBLIC_MOCK_MODE` with example values and descriptions.
7. WHERE `ALLOWED_ORIGINS` contains multiple values, THE Backend SHALL correctly split on commas and trim whitespace before passing the list to `CORSMiddleware`.
