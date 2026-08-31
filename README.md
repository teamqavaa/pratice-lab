# Practice Lab

Practice Lab is a web application for coding practice.
It presents a guided lab to the student.
The student writes code in the editor and runs it to see the output.

The application supports three languages currently.

- Python
- PHP
- TypeScript

## Role in the platform

Four repos form the Qavaa learning platform.

| Repo | Role | Dev port |
| ---- | ---- | ---- |
| qi-sso-front | Identity portal | 3001 |
| contents-lab | Course catalog, cart, staff admin | 3000 |
| courses-api | Catalog, user accounts, labs, code execution API | 8000 |
| pratice-lab | Coding practice workspace (this repo) | 3002 |

Notes:

- The dev script in `package.json` starts the server on port 3002.

## How it works

The application loads labs from a backend.
Each lab contains a series of steps.
The student marks a step complete and moves to the next step.
The student can reveal a hint for a step.

Each step has its own starter code.
The editor loads the starter code of the step in progress.
The student's edits for each step stay separate.
They survive a switch between steps.

The student writes code in a browser-based editor.
The student can run the code to check the output.
The application saves the code automatically.

The application sends progress information to the backend.
This keeps the lab session active while the student works.

## Requirements

The application needs:

- Node.js 20 or newer.
- npm.
- A Django backend that serves the lab API.
- The Piston code execution service.

The backend connects at `http://localhost:8000`.
This is the `courses-api` backend (the `lab` app).

The application reads the backend address from the `DJANGO_BASE_URL` environment variable.
The variable defaults to `http://localhost:8000`.
Copy `.env.example` to `.env` and change the value if the backend runs on another address.

The Piston service handles code execution.
The Piston container must include the language runtimes.
The Python version is 3.12.0.
The PHP version is 8.2.3.
The TypeScript version is 5.0.3.
The versions in `lib/languages.ts` must match the installed runtimes.

## Authentication

The SSO portal protects the lab routes.
The portal signs in the user.
The `proxy.ts` middleware checks for the access token cookie.
If the token is absent, the middleware redirects the user to the portal.

The portal is the `qi-sso-front` repo.
It runs on port 3001 in development.
The `.env.example` file sets `SSO_BASE_URL=http://localhost:3000`.
Set `SSO_BASE_URL=http://localhost:3001` when the portal runs on port 3001.

The backend uses JWT tokens.
The application stores the access token and the refresh token in cookies.
When the access token expires, the application exchanges the refresh token for a new access token.

## Setup

Install the dependencies.

```bash
npm install
```

Run the development server.

```bash
npm run dev
```

The server runs on port 3001.
Run it alongside the SSO portal with a different port.

```bash
npx next dev -p 3002
```

Wait for the backend and the SSO portal before the user opens the application.
Confirm that these services run:

- Practice Lab on port 3002.
- SSO portal on port 3001.
- courses-api backend on port 8000.
- Piston execution service.

## Scripts

| Script | Command | Description |
| ------ | ------- | ----------- |
| Development | `npm run dev` | Start the development server on port 3001 |
| Development (SSO) | `npx next dev -p 3002` | Start with the SSO portal on port 3001 |
| Build | `npm run build` | Create a production build |
| Start | `npm start` | Start the production server |
| Lint | `npm run lint` | Run the ESLint checks |
| Test | `npm test` | Run the Vitest test suite |

## Backend API

The frontend calls these endpoints on the Django backend:

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/labs/` | List the published labs |
| GET | `/api/labs/{id}/` | Load a single lab with its objectives |
| GET | `/api/sessions/{lab_id}/` | Load the saved session (code, status, last active) |
| POST | `/api/sessions/{lab_id}/` | Save the current code |
| POST | `/api/sessions/{lab_id}/heartbeat/` | Keep the session alive |
| POST | `/api/sessions/{lab_id}/complete/` | Mark the session complete |
| POST | `/api/sessions/{lab_id}/reset/` | Reset the session |
| POST | `/api/execute/` | Run code and return the output |

The execute request carries the language, the version, the filename, and the code.
The response carries stdout, stderr, and the exit code.
The versions in `lib/languages.ts` must match the runtimes installed in the Piston container.

The application sends the access token as a Bearer header on every call.
A 401 response triggers a refresh-token exchange and one retry.

## Project structure

| Path | Purpose |
| ---- | ------- |
| `app/page.tsx` | The landing page |
| `app/labs/page.tsx` | The list of labs |
| `app/labs/[labId]/page.tsx` | A single lab workspace |
| `components/lab/` | The lab top bar, editor, steps, and output panels |
| `components/ui/` | The reusable UI components |
| `lib/lab-utils.ts` | Pure helpers for run errors and progress |
| `lib/actions/lab-sessions.ts` | The backend API calls |
| `lib/languages.ts` | The language configuration |
| `lib/mock-data.ts` | The mock lab shape for the UI |
| `app/labs/[labId]/` | The lab page with its loading and error boundaries |
| `vitest.config.ts` | The Vitest setup |
| `proxy.ts` | The SSO middleware |

## Development notes

The backend defines the lab data.
The UI shape stays stable.
This lets the frontend change without a change to the API payload.

The API calls read the access token from the cookies.
They send the token as a Bearer header to the backend.
On a 401 response, the application refreshes the token and retries once.

The editor autosaves the code one second after the last keystroke.
The application sends a heartbeat every 30 seconds to keep the session active.

The editor flushes pending edits when the tab hides or the workspace unmounts.
Step progress, open steps, and revealed hints persist in the browser's local storage.
They survive a refresh but not a device change.

Run `npm test` to execute the Vitest suite.
The tests cover the run-error messages, the progress helpers, the output panel, the step list, and the autosave behavior.

## Related repos

- [qi-sso-front](https://github.com/teamqavaa/qi-sso-front.git)
- [contents-lab](https://github.com/teamqavaa/contents-lab.git)
- [courses-api](https://github.com/teamqavaa/courses-api.git)