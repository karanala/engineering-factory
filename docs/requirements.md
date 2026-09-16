# Product Requirements Document — Policy-Governed Engineering Factory

## Purpose

Build a platform that transforms an approved business request into a tested, secure, observable deployment while preserving traceability from production back to the requirement, decision, code, test evidence, model/tool action, approval, and artifact.

## Product principle

The platform is autonomous in execution and constrained in authority. Automation may propose, implement, test, and prepare releases. Policies and accountable humans retain authority over high-risk actions.

## Personas

| Persona | Need |
| --- | --- |
| Product owner | Convert requests into testable, delivery-ready changes with transparent status. |
| Engineer | Ship standard changes quickly without ticket-driven platform work. |
| Security owner | Enforce controls and inspect immutable evidence without becoming a bottleneck. |
| Service owner | Control service risk, rollout, and reliability outcomes. |
| SRE | Operate safe progressive delivery and incident response. |
| Auditor | Trace any release to verified inputs, approvals, and evidence. |

## Functional requirements

### FR-01: Structured intake

The platform shall create a versioned `ChangeRequest` for every request using the schema in `contracts/change-request.schema.json`. It shall capture business goal, scope, service ownership, data classification, risk, acceptance criteria, definition of done, and required approvals.

### FR-02: Planning and architecture

The platform shall produce user stories, API/data contracts, impact analysis, work plan, architecture decision record (ADR), threat model, and risk classification before implementation begins.

### FR-03: Durable orchestration

The platform shall execute delivery as a durable workflow with idempotent tasks, retries, budgets, explicit state transitions, policy checks, and human escalation. Free-running agent loops are prohibited.

### FR-04: Bounded specialist workers

The platform shall use distinct workers for product analysis, architecture, development, testing, security, review, SRE, compliance, and incident triage. A worker shall receive only task-scoped inputs, tools, identity, time, and token budget.

### FR-05: Immutable traceability

Every material action shall produce an `ActionEvent` conforming to `contracts/action-event.schema.json`, with a trace ID, input digest, actor identity, policy result, and immutable evidence URI.

### FR-06: Risk-based quality

The platform shall select gates based on risk and data class. High-risk changes require design review, threat model, complete test suite, staging soak, two-person approval, and progressive rollout. Critical changes require a human release authority.

### FR-07: Secure supply chain

Every releasable artifact shall have an immutable digest, SBOM, provenance, signature, and retention record. Unsigned or unverifiable artifacts shall not enter production.

### FR-08: GitOps delivery

The platform shall promote desired state through reviewed Git changes, preview and staging environments, then progressive production rollout. Runtime deployment shall reconcile only approved desired state.

### FR-09: Production safety

The platform shall automatically halt or roll back only within preapproved policy boundaries when defined reliability, security, or business thresholds breach. It shall otherwise create an escalation with evidence.

### FR-10: Governed learning

The platform shall retain raw observations separately from validated facts, patterns, and reusable skills. Only validated outcomes may be promoted to reusable knowledge.

## Success measures

- A standard service can reach production from an approved template in under one hour, with complete evidence and no infrastructure ticket.
- 100% of production workloads have signed artifact, SBOM, provenance, and linked change request.
- 100% of privileged agent calls receive a policy decision and trace ID.
- Change failure rate, MTTR, approval latency, automated-review catch rate, and policy-denial rate are visible by service and risk tier.

## Out of scope for the first release

- Fully autonomous critical production releases.
- Automated security-finding waivers.
- Agent access to unrestricted production data.
- Learning directly from unreviewed model output.
