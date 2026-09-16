/**
 * Temporal-style workflow outline. Activities must be idempotent and emit an
 * ActionEvent before returning. Privileged transitions always call OPA first.
 */
export async function changeDelivery(changeId: string): Promise<void> {
  await intakeAndValidate(changeId);
  const plan = await createGroundedPlan(changeId);
  await policyCheck("start_build", changeId, plan);

  if (plan.risk === "high" || plan.risk === "critical") {
    await waitForSignedApprovals(changeId, ["service_owner", "security"]);
  }

  const implementation = await runWorker("developer", changeId, plan);
  const evidence = await runIndependentVerification(changeId, implementation);
  await policyCheck("create_release_candidate", changeId, evidence);

  const artifact = await attestAndSign(changeId, evidence);
  await deployTo("staging", changeId, artifact);
  await verifyStaging(changeId, artifact);

  await policyCheck("deploy_production", changeId, artifact);
  await promoteProgressively(changeId, artifact, ["internal", "1%", "10%", "50%", "100%"]);
  await validateOutcomeForKnowledgePromotion(changeId);
}

// Activity declarations intentionally mark control boundaries, not model prompts.
declare function intakeAndValidate(id: string): Promise<void>;
declare function createGroundedPlan(id: string): Promise<{ risk: string }>;
declare function policyCheck(action: string, id: string, evidence: unknown): Promise<void>;
declare function waitForSignedApprovals(id: string, roles: string[]): Promise<void>;
declare function runWorker(role: string, id: string, input: unknown): Promise<unknown>;
declare function runIndependentVerification(id: string, implementation: unknown): Promise<unknown>;
declare function attestAndSign(id: string, evidence: unknown): Promise<unknown>;
declare function deployTo(environment: string, id: string, artifact: unknown): Promise<void>;
declare function verifyStaging(id: string, artifact: unknown): Promise<void>;
declare function promoteProgressively(id: string, artifact: unknown, stages: string[]): Promise<void>;
declare function validateOutcomeForKnowledgePromotion(id: string): Promise<void>;
