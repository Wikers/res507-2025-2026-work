# Lab 30 – CI pipeline notes

Workflow: `.github/workflows/ci.yml` (job `build`, triggers `push` and `pull_request`).
It extends the lesson 16 "CI Preview" workflow (same file, merged from `feature/ci-preview`).

## Evidence

| What | Link / value |
|------|--------------|
| Green baseline run | https://github.com/Wikers/res507-2025-2026-work/actions/runs/44041539317 |
| Pull request | https://github.com/Wikers/res507-2025-2026-work/pull/1 |
| Pull request run | https://github.com/Wikers/res507-2025-2026-work/actions/runs/44042157802 |
| Deliberate failed run | https://github.com/Wikers/res507-2025-2026-work/actions/runs/44042406361 |
| Recovery run | https://github.com/Wikers/res507-2025-2026-work/actions/runs/44042859223 |
| Fixing commit SHA | `b1a9b8b693cbb85cc888ff4a95088b9bcd0aa5c5` |
| Lane B – green run with tests | https://github.com/Wikers/res507-2025-2026-work/actions/runs/44044008386 |
| Lane B – failed test run | https://github.com/Wikers/res507-2025-2026-work/actions/runs/44044363782 |
| Lane B – recovered run | https://github.com/Wikers/res507-2025-2026-work/actions/runs/44044627551 |

## Diagnosis of the deliberate failure

**What I broke:** in `docker/Dockerfile` I changed the start command to
`CMD ["npm", "strat"]` (typo, instead of `start`).

**Failed step:** `Run container smoke test`. curl failed 30 times with
`Failed to connect to localhost port 3000`, then `Health check failed`.

**Log that explains the cause** (`Show container diagnostics`):
- `docker ps -a`: the container is `Exited (1)`, it stopped less than 1 second after start.
- `docker inspect`: `"Cmd": ["npm", "strat"]`.
- `docker logs`: `Unknown command: "strat"`.

So npm did not know the command, the container crashed, and nothing listened on port 3000.

**Why earlier steps did not catch it:** `node --check` only checks the syntax of
`app.js` and `server.js`, it does not read the Dockerfile. `docker build` does not
run `CMD`, it only saves it in the image. The error appears only when the
container really starts, and this is what the smoke test checks.

**Fix:** I restored `CMD ["npm", "start"]` (commit `b1a9b8b`). The container starts,
`/health` returns `{"ok": true}` and the run is green. I did not remove or skip any check.

## Extension – Lane B: automated route tests

- File: `app/tests/app.test.js` (Node test runner + Fastify `inject`).
  - `GET /health` → status 200 and body `{ ok: true }`.
  - `GET /does-not-exist` → status 404 and `error: "Not Found"`.
- Each test awaits `buildApp()` and closes the app in `finally`.
- `package.json`: `"test": "node --test"`. Local run: `npm test` → 2 pass, 0 fail.
- CI: step `Run route tests` (`npm test`) right after `npm ci`, same directory.
- `.dockerignore`: `app/node_modules`, so the local / runner `node_modules` is not
  copied into the image over the one installed by `npm ci` in the Dockerfile.
- Failure demo: I changed the expected status of `/health` to `201`.
  `Run route tests` failed with
  `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: 200 !== 201`.
  Docker build and smoke test did not run. I put back `200` and the run was green.

**What in-memory tests miss:** `inject` does not open a real port and does
not use the Docker image. They do not test the Dockerfile, the `CMD`,
the `npm start` script, `HOST`/`PORT` binding or files missing from the image.
For example, the `npm strat` bug above passes these tests. They also do not use
PostgreSQL. That is why the container smoke test is still needed.

## What green CI proves (and what it does not)

For **this commit on this GitHub runner**, green means: dependencies installed
from `package-lock.json`, route tests passed, `app.js` and `server.js` have no
syntax errors, the Docker image built, the container started and `/health`
returned `{"ok": true}`.

It does **not** prove: database connection, reading or inserting quotes,
data persistence, security, performance, or a working production deployment.

**Example of a failure with green CI:** a typo in the SQL query of `/`
(e.g. `SELECT * FROM quote`). The SQL is just a string for `node --check`,
`/health` does not run SQL and the CI starts no database. So CI is green, but
the home page returns a 500 error (`relation "quote" does not exist`).

Another example: `npm ci` reports 9 known vulnerabilities (1 critical) in the
dependencies, and CI is still green, because nothing checks security.

CI is not a merge gate here: without branch protection rules, a red PR can still be merged.
