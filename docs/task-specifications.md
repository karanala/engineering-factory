# Implementation Task Specifications

## T-001 — Change registry and evidence ledger

**Objective:** Create the control-plane APIs and database records for change requests, approvals, action events, artifacts, and deployment links.

**Acceptance criteria:**

- Change requests reject payloads that do not satisfy the published schema.
- Every action is append-only and has `change_id`, `trace_id`, input digest, actor, result, and immutable evidence URI.
- An evidence query returns the complete release lineage for a change ID.
- Deletion and mutation of released evidence are denied and audited.

## T-002 — Policy decision service

**Objective:** Evaluate versioned OPA policy for every privileged worker and release action.

**Acceptance criteria:**

- Denied and allowed decisions include policy bundle version and decision ID.
- A worker cannot approve its own change or modify IAM/access policy.
- Production promotion of an unsigned artifact is denied.
- Critical releases are denied to the automated release worker.

## T-003 — Ephemeral worker sandbox

**Objective:** Run each authorized worker task in a disposable, resource-bounded environment.

**Acceptance criteria:**

- Task credentials expire in one hour or less and are invalid outside task scope.
- Source checkout is read-only by default; writes require a branch/worktree grant.
- Egress is allow-listed, and command/artifact output is captured as evidence.
- Sandbox destruction is verified at task completion or timeout.

## T-004 — Trusted build and admission path

**Objective:** Produce and enforce signed, attested artifacts.

**Acceptance criteria:**

- CI emits SBOM, provenance, signature, test report, and immutable image digest.
- Kubernetes admission rejects missing/invalid signature and provenance.
- Artifact metadata links to the change ID and commit digest.
- A retention policy preserves release evidence for the required compliance period.

## T-005 — Progressive delivery controller

**Objective:** Promote release candidates through preview, staging, and controlled production rollout.

**Acceptance criteria:**

- Each rollout stage evaluates error rate, latency, saturation, security events, and designated business metric.
- Threshold breach halts promotion and executes only the policy-approved rollback.
- Rollout actions emit traceable evidence events.
- Manual approval is enforced for high and critical risk boundaries.

## T-006 — Knowledge graph and validated learning

**Objective:** Connect delivery evidence and promote only validated reusable knowledge.

**Acceptance criteria:**

- Graph traverses requirement → ADR → PR → test → artifact → deployment → incident.
- Retrieval results include source URI, revision, and confidence classification.
- Raw observations cannot be selected as reusable skills.
- Promotion requires a policy/human validation event.
