# Policy-Governed Engineering Factory

This repository is a secure-by-default foundation for an autonomous engineering platform. It treats AI workers as bounded actors in a durable, evidence-driven delivery workflow—not as a single agent with broad production access.

## What is included

- A runnable control-plane dashboard and JSON API for governed change intake
- A canonical, machine-validatable change contract
- An append-only action/evidence event contract
- OPA policies that enforce release authority and agent boundaries
- A Temporal workflow outline with explicit policy and approval checkpoints
- GitOps deployment and Kubernetes admission-control examples
- A traceability model linking a production rollout to its source evidence

## Golden path

1. Product intake creates `ChangeRequest` from `contracts/change-request.schema.json`.
2. The control plane decomposes approved work into narrow worker tasks.
3. Every tool invocation emits an `ActionEvent` and immutable evidence reference.
4. The policy decision point evaluates each privileged action.
5. CI creates a signed artifact, SBOM, and provenance attestation.
6. GitOps promotes only a policy-approved immutable artifact through environments.

## Repository map

| Path | Purpose |
| --- | --- |
| `contracts/` | Versioned interfaces between product, workers, policy, and delivery |
| `policies/` | Rego rules for authorization and release gates |
| `workflows/` | Durable workflow orchestration outline |
| `gitops/` | A progressive-delivery application example |
| `docs/` | Architecture, operating model, and implementation roadmap |

## Non-negotiable control boundaries

- Workers have short-lived, task-scoped identities and tool allow-lists.
- Workers cannot approve their own changes or waive a gate.
- Production deployment requires immutable evidence, verified provenance, and policy-specified approvals.
- Facts enter reusable memory only after validation.
- Human approval is a signed event bound to a change ID, evidence digest, policy version, and expiry.

See [docs/architecture.md](docs/architecture.md) for the end-to-end design and [docs/build-roadmap.md](docs/build-roadmap.md) for the implementation sequence.

## Run the control-plane prototype

Requires Node.js 20 or later.

```bash
npm start
```

Open `http://localhost:3000`. The initial prototype persists its ledger locally under `.data/` (excluded from source control in a production deployment). It supports:

- creating a governed change request;
- viewing an append-only action and approval trail;
- recording signed/provenanced artifact metadata via the API;
- evaluating release policy; and
- initiating a policy-gated production promotion.

This is a vertical-slice foundation. The next build increments replace local persistence and in-process policy evaluation with PostgreSQL, OPA, Temporal, a secure artifact store, and isolated worker runners.

For the GitLab code-generation path and GitHub Actions mirror setup, see [docs/github-gitlab-integration.md](docs/github-gitlab-integration.md).
