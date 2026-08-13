# Practice Lab

Practice Lab is a web application for coding practice. It presents a guided lab to the student. The student writes code in the editor and runs it to see the output.

The application supports three languages currently:

- Python
- PHP
- TypeScript

## How it works

The application loads labs from a backend. Each lab contains a series of steps. The student marks a step complete and moves to the next step. The student can reveal a hint for a step.

The student writes code in a browser-based editor. The student can run the code to check the output. The application saves the code automatically.

The application sends progress information to the backend. This keeps the lab session active while the student works.

## Prerequisites

The application needs:

- Node.js 20 or newer
- npm
- A Django backend that serves the lab API
- The Piston code execution service

The backend connects at:

```
http://localhost:8000
```

The application reads the backend address from `lib/actions/lab-sessions.ts`. Change the `DJANGO_BASE` value if the backend runs on another address.

The Piston service handles code execution. The Piston container must include the language runtimes. The Python version is 3.12.0. The PHP version is 8.2.3. The TypeScript version is 5.0.3. The versions in `lib/languages.ts` must match the installed runtimes.

## Authentication

The SSO portal protects the lab routes. The portal signs in the user. The `proxy.ts` middleware checks for the access token cookie. If the token is absent, the middleware redirects the user to the portal.

The SSO portal runs at:

```
http://localhost:3000
```

You can override the address with the `SSO_BASE_URL` environment variable.

The backend uses JWT tokens. The application stores the access token and the refresh token in cookies. When the access token expires, the application exchanges the refresh token for a new access token.

## Setup

Install the dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The server runs on port 3001. Wait for the backend and the SSO portal before you open the application. Confirm that the following services run:

- Practice Lab on port 3001
- SSO portal on port 3000
- Django backend on port 8000
- Piston execution service

## Scripts

| Script | Command | Description |
| ------ | ------- | ----------- |
| Development | `npm run dev` | Start the development server on port 3001 |
| Build | `npm run build` | Create a production build |
| Start | `npm start` | Start the production server |
| Lint | `npm run lint` | Run the ESLint checks |

## Project structure

| Path | Purpose |
| ---- | ------- |
| `app/page.tsx` | The landing page |
| `app/labs/page.tsx` | The list of labs |
| `app/labs/[labId]/page.tsx` | A single lab workspace |
| `components/lab/` | The lab editor, steps, and output panels |
| `components/ui/` | The reusable UI components |
| `lib/actions/lab-sessions.ts` | The backend API calls |
| `lib/languages.ts` | The language configuration |
| `lib/mock-data.ts` | The mock lab shape for the UI |
| `proxy.ts` | The SSO middleware |

## Development notes

The backend defines the lab data. The UI shape stays stable. This lets the frontend change without a change to the API payload.

The API calls read the access token from the cookies. They send the token as a Bearer header to the backend. On a 401 response, the application refreshes the token and retries once.

The editor autosaves the code one second after the last keystroke. The application sends a heartbeat every 30 seconds to keep the session active.