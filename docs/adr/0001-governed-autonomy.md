# ADR 0001: Use durable workflows and policy-gated specialist workers

**Status:** Accepted  
**Date:** 2026-09-16

## Context

A monolithic coding agent has excessive authority, weak failure recovery, and poor auditability. The platform needs reliable handoffs, evidence, separation of duties, and human escalation for risk-sensitive work.

## Decision

Use a durable workflow engine as the control plane. Model each worker as a least-privileged, schema-bound task with explicit tool permissions and budgets. Require policy decisions for privileged actions, and record all decisions and evidence against a change ID.

## Consequences

- More integration work is required than deploying a single agent.
- Execution becomes replayable, observable, and resilient to individual model/tool failures.
- Release authority can remain separate from code-generation capability.
