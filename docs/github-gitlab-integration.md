# GitHub Pipeline + GitLab Commit Integration

## Why a mirror is required

GitHub Actions runs from a GitHub repository; it cannot run directly from a GitLab-only project. Keep GitLab as the source-of-truth repository and configure a protected GitHub mirror for CI. GitLab’s repository mirroring pushes the `main` and `factory/*` branches to the GitHub mirror. GitHub Actions validates the mirror, while the control plane writes candidate branches only to GitLab.

## Required identities

1. **GitLab project access token** — scope `api`, bot identity, expires quickly, restricted to the target project. It may create `factory/*` branches and commits; it may not merge to `main`.
2. **GitHub Actions secrets** — `CONTROL_PLANE_URL` and `CONTROL_PLANE_TOKEN`, limited to posting CI evidence.
3. **Codegen worker identity** — workload identity permitted to call the model gateway and no source-control write credentials.
4. **Control-plane identity** — retrieves the GitLab token only from the secrets manager at commit time.

## Configure

1. Configure the GitLab project as a push mirror to the GitHub repository `karanala/engineering-factory`. Protect `main` in both systems. The project configuration baseline is in `config/project.example.json`.
2. Add `.github/workflows/validate-generated-change.yml` to the GitLab project; it appears in the GitHub mirror and executes there.
3. Deploy `integrations/codegen-worker.mjs` behind internal authentication and set its runtime variables from your secrets manager. Do not use `.env.example` as a real credentials file.
4. Configure the control plane with `GITLAB_TOKEN` and `CODEGEN_WEBHOOK_URL` as runtime secrets.
5. Include repository metadata in a change request:

```json
"repository": {
  "gitlab_project_id": "platform%2Fcheckout-api",
  "default_branch": "main",
  "github_mirror": "your-org/checkout-api"
}
```

6. After design/build approval, call `POST /api/changes/{changeId}/generate`. The control plane invokes the approved generator, validates returned paths, creates a `factory/{changeId}-…` branch in GitLab, and records the commit as immutable evidence.

## Safety properties

- Generated code lands in a branch, never directly on `main`.
- The code-generation worker cannot call GitLab; only the control plane can commit after policy check.
- The GitLab token is never sent to a model or browser client.
- GitHub Actions produces independent evidence; a passing workflow does not merge or deploy.
- Production promotion still requires artifact provenance, signature, and approvals.
