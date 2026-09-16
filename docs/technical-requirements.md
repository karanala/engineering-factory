# Technical Requirements

## Control plane

- Durable workflows: Temporal (or an equivalent durable workflow engine).
- Transactional state: PostgreSQL; workflow/artifact payloads: object storage.
- Event transport: Kafka, Redpanda, or cloud equivalent; events use an outbox pattern.
- Policy decision point: OPA, with versioned policy bundles and recorded decisions.
- Approvals: signed, expiring approval records bound to change ID, evidence digest, policy version, role, and separation-of-duties check.

## Identity and security

- Enterprise SSO and MFA for people; short-lived workload identity for services and workers.
- Separate trust domains/accounts for dev, test, staging, and production.
- Task-scoped credentials with a maximum one-hour TTL and tool/data/environment allow-lists.
- Secrets retrieved only at execution time from a secrets manager; never included in prompts, source, or logs.
- Sandboxes are ephemeral, network-egress restricted, resource limited, and fully logged.

## Delivery and runtime

- Git is the source of desired application and infrastructure state.
- CI generates SBOM, provenance, signature, test evidence, and immutable image digest.
- Kubernetes admission control rejects unsigned, unprovenanced, or policy-violating workloads.
- Argo CD (or equivalent) reconciles GitOps state; progressive rollout uses feature flags and canary analysis.
- Production runs in multi-region cells, not a shared mega-cluster.

## Knowledge and observability

- Source repositories, docs, service catalog, code graph, and decision records remain their own systems of record.
- Knowledge graph links requirements, ADRs, commits, pull requests, tests, artifacts, deployments, incidents, and postmortems.
- Semantic retrieval is grounded in versioned source references; it must return provenance and confidence.
- OpenTelemetry trace context flows through workflow, agent actions, CI, deployment, and runtime.
- Telemetry includes reliability, delivery, security, AI-operation, and business metrics.

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Availability | Control plane supports regional failover; execution cells limit blast radius. |
| Auditability | Evidence is append-only, content-addressed, access controlled, and retained per compliance policy. |
| Privacy | Retrieval and model tools enforce task data classification and tenant boundaries. |
| Resilience | Workflows resume after failures; operations are idempotent; rollback is tested. |
| Cost | Every workflow and worker enforces runtime, token, concurrency, and cloud-spend budgets. |
| Interoperability | Interfaces are versioned JSON Schema/CloudEvents-style contracts, not provider-specific prompts. |
