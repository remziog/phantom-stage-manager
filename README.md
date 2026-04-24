# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## E2E preflight script

`scripts/e2e-preflight.ts` probes the live Supabase backend before E2E tests run, ensuring the schema (tables, columns, enums) matches what the seed script and tests expect. It writes a sanitized JSON snapshot, optionally diffs it against a baseline, and can fail CI based on a configurable policy.

Run it locally with:

```sh
npm run test:e2e:preflight           # normal run
npm run test:e2e:preflight -- --help # print usage and exit
```

### CLI flags

| Flag | Description |
| ---- | ----------- |
| `--help`, `-h` | Print full usage (flags + every supported env var with example values) and exit `0`. Equivalent to running the script's built-in `printHelp()`. |

All other behavior is configured through environment variables (below). The script is intentionally flag-light so the same invocation works locally and in CI.

### Environment variables

#### Required (Supabase access)

| Variable | Example | Purpose |
| -------- | ------- | ------- |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | Project URL probed by the preflight. |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Service-role key used to introspect schema. Never commit. |

If either is missing, the script prints a hint to run with `--help` and exits non-zero.

#### Snapshot output

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PREFLIGHT_SNAPSHOT_PATH` | `preflight-report/schema-snapshot.json` | Where the sanitized snapshot is written. Uploaded as the `preflight-report` artifact in CI. |
| `GITHUB_STEP_SUMMARY` | _(set by GitHub Actions)_ | If set, the script appends a markdown summary (probed schema + diff + failure reasons) to the GitHub step summary. |

#### Baseline resolution (for diffing)

The script tries these sources in order; the first one that resolves wins:

| Variable | Example | Purpose |
| -------- | ------- | ------- |
| `PREFLIGHT_BASELINE_PATH` | `preflight-baseline/schema-snapshot.json` | Local file path to a previous snapshot. Highest priority. |
| `PREFLIGHT_BASELINE_ARTIFACT_URL` | `https://api.github.com/repos/OWNER/REPO/actions/artifacts/123/zip` | REST or browser URL to a specific artifact zip. Browser URLs are normalized to the REST endpoint. |
| `PREFLIGHT_BASELINE_RUN_ID` | `9876543210` | Workflow run ID; combined with `PREFLIGHT_BASELINE_REPO` to look up artifacts via the GitHub API. |
| `PREFLIGHT_BASELINE_REPO` | `owner/repo` | Repo (`OWNER/REPO`) used with `PREFLIGHT_BASELINE_RUN_ID`. Defaults to `GITHUB_REPOSITORY` when running in Actions. |
| `PREFLIGHT_BASELINE_ARTIFACT_NAME` | `preflight-report` | Artifact name to download from a run. Defaults to `preflight-report`. |
| `GITHUB_TOKEN` | `ghp_...` | Required for both artifact fallbacks (`actions:read` scope). |

If no baseline is found, the diff section is skipped — schema probing still runs and the snapshot is still written.

#### Failure policy

| Variable | Default | Accepted values | Behavior |
| -------- | ------- | --------------- | -------- |
| `PREFLIGHT_FAIL_ON` | `regressions` | Comma-separated list of: `regressions`, `removed`, `any`, `none` | Controls when a diff causes the script to exit non-zero. The core "required schema present" check always blocks regardless of this setting. |

Modes:

- `regressions` — fail when items previously `ok` are now missing or erroring (recommended default).
- `removed` — fail when tables, columns, or enum values present in the baseline are gone.
- `any` — fail on any detected change, including additions.
- `none` — never fail from diffs (snapshot + summary still produced).

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | Required schema present and no failure-policy violations. |
| `1` | Required schema check failed, or `PREFLIGHT_FAIL_ON` matched a detected diff, or required env vars missing. |

### CI usage

The GitHub Actions workflow (`.github/workflows/e2e.yml`) wires this up by:

1. Downloading the previous run's `preflight-report` artifact into `preflight-baseline/`.
2. Setting `PREFLIGHT_BASELINE_PATH=preflight-baseline/schema-snapshot.json` and `PREFLIGHT_FAIL_ON=regressions`.
3. Running `npm run test:e2e:preflight` and uploading the new `preflight-report/` directory as an artifact for the next run to diff against.

#### Example GitHub Actions step

A complete preflight step showing every supported variable. Required vars are marked; optional ones can be omitted to fall back to defaults.

```yaml
- name: Preflight — verify Supabase schema matches seed script
  env:
    # ── Required: Supabase access ─────────────────────────────────────────
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

    # ── Optional: snapshot output ─────────────────────────────────────────
    # Default: preflight-report/schema-snapshot.json
    PREFLIGHT_SNAPSHOT_PATH: preflight-report/schema-snapshot.json

    # ── Optional: baseline resolution (first match wins) ──────────────────
    # 1) Local file (downloaded from a previous run's artifact).
    PREFLIGHT_BASELINE_PATH: preflight-baseline/schema-snapshot.json
    # 2) Direct artifact URL (REST or browser link — both accepted).
    # PREFLIGHT_BASELINE_ARTIFACT_URL: https://api.github.com/repos/${{ github.repository }}/actions/artifacts/123456789/zip
    # 3) Look up by run ID + repo + artifact name.
    # PREFLIGHT_BASELINE_RUN_ID: "9876543210"
    PREFLIGHT_BASELINE_REPO: ${{ github.repository }}
    # PREFLIGHT_BASELINE_ARTIFACT_NAME: preflight-report

    # ── Optional: failure policy ──────────────────────────────────────────
    # regressions (default) | removed | any | none — comma-separated to combine.
    PREFLIGHT_FAIL_ON: regressions

    # ── Required for artifact fallbacks (URL or RUN_ID resolution) ────────
    # Needs `actions: read` permission (see `permissions:` block below).
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npm run test:e2e:preflight

- name: Upload preflight schema snapshot
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: preflight-report
    path: preflight-report/
    retention-days: 14
```

To download the previous run's snapshot for diffing, add this step **before** the preflight step:

```yaml
- name: Download previous preflight snapshot (for diff)
  uses: dawidd6/action-download-artifact@v6
  continue-on-error: true
  with:
    name: preflight-report
    workflow: e2e.yml
    branch: ${{ github.event.repository.default_branch }}
    path: preflight-baseline
    if_no_artifact_found: warn
```

#### When `actions: read` is required

The preflight only needs `actions: read` when it has to call the GitHub API to fetch a baseline artifact. Use this quick reference to decide:

| Baseline source | Needs `actions: read`? |
| --------------- | ---------------------- |
| No baseline (first run, or diff disabled) | ❌ No |
| `PREFLIGHT_BASELINE_PATH` (local file, e.g. downloaded by `dawidd6/action-download-artifact`) | ❌ No — the download action uses its own token. |
| `PREFLIGHT_BASELINE_ARTIFACT_URL` (REST or browser artifact URL) | ✅ Yes |
| `PREFLIGHT_BASELINE_RUN_ID` + `PREFLIGHT_BASELINE_REPO` | ✅ Yes |

Minimal `permissions:` block for the artifact-URL or run-ID fallbacks (set at workflow or job level):

```yaml
permissions:
  contents: read
  actions: read   # required ONLY for PREFLIGHT_BASELINE_ARTIFACT_URL / PREFLIGHT_BASELINE_RUN_ID
```

If you only ever use `PREFLIGHT_BASELINE_PATH` (the recommended default), you can omit `actions: read` entirely:

```yaml
permissions:
  contents: read
```

> Note: cross-repo artifact fetches (when `PREFLIGHT_BASELINE_REPO` points at a different repository) require a PAT with `actions:read` on that repo passed as `GITHUB_TOKEN` — the default `GITHUB_TOKEN` is scoped to the current repo only.
