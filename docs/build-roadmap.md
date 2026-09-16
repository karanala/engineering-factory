# Delivery Roadmap and Task Backlog

## Phase 0 — Foundations (weeks 1–2)

- [ ] Define organization, service, environment, data-classification, and risk taxonomy.
- [ ] Adopt change and action-event schemas; publish compatibility/versioning rules.
- [ ] Create repository templates with CI, preview environments, baseline telemetry, ownership metadata, and runbooks.
- [ ] Stand up separate cloud accounts/trust domains for dev, test, staging, and production.

## Phase 1 — Trusted delivery path (weeks 3–6)

- [ ] Implement GitOps promotion repositories, artifact registry, immutable retention, and environment reconciliation.
- [ ] Add SBOM, build provenance, image signing, dependency locking, and admission control.
- [ ] Establish the service catalog and code/documentation indexing pipeline.
- [ ] Instrument a template service end-to-end with OpenTelemetry.

## Phase 2 — Governed orchestration (weeks 7–10)

- [ ] Deploy workflow engine, transactional state, event bus, object evidence store, and approval service.
- [ ] Implement OPA policy bundles, policy-decision logging, and separation-of-duties controls.
- [ ] Implement sandbox lifecycle with scoped workload identity, egress policy, logs, and budget enforcement.
- [ ] Build traceability views from change → commit → evidence → artifact → deployment → telemetry.

## Phase 3 — Assistive workers (weeks 11–14)

- [ ] Introduce product-analysis and architecture workers that only propose schema-valid plans and ADRs.
- [ ] Introduce developer workers that create isolated branches and pull requests only.
- [ ] Add independent review, test, and security workers with no release permissions.
- [ ] Build evaluations for grounding, prompt injection, tool-use safety, review quality, and cost.

## Phase 4 — Controlled autonomy (weeks 15–20)

- [ ] Automate risk-based test selection and quality evidence collection.
- [ ] Add staging promotion, canary analysis, feature flags, and policy-bounded rollback.
- [ ] Add SRE incident triage that proposes, but does not execute, remediation above policy limits.
- [ ] Promote validated outcomes into decision memory through an approval workflow.

## Acceptance milestones

| Milestone | Exit evidence |
| --- | --- |
| Golden path | Template service ships to production in <1 hour with no infrastructure ticket. |
| Supply-chain baseline | Admission blocks a deliberately unsigned image; SBOM/provenance are queryable. |
| Governed worker | Developer worker opens a PR with full action trace and no production credentials. |
| Progressive release | A canary breach halts promotion and rolls back under approved policy. |
| Audit readiness | An auditor traces a production line to requirement, ADR, code, tests, approvals, artifact, and deployment. |
