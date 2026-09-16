package engineering_factory.release

default allow := false

# No actor can approve a release they authored.
separation_of_duties if {
  input.change.author != input.approval.approver
}

verified_artifact if {
  input.artifact.signed == true
  input.artifact.provenance_verified == true
  input.artifact.sbom_uri != ""
  input.artifact.digest != ""
}

approval_present(role) if {
  some approval in input.approvals
  approval.role == role
  approval.valid == true
  approval.change_id == input.change.id
  approval.evidence_digest == input.evidence.digest
}

allow if {
  input.request.action == "deploy"
  input.request.environment == "production"
  input.actor.type == "agent"
  input.actor.role == "release-agent"
  verified_artifact
  separation_of_duties
  approval_present("service_owner")
  approval_present("security")
  input.change.risk != "critical"
}

# Critical releases remain human-operated even when every automated gate passes.
deny_reason contains "critical changes require a human release manager" if {
  input.change.risk == "critical"
  input.request.action == "deploy"
}

deny_reason contains "an unsigned or unverifiable artifact cannot be deployed" if {
  input.request.action == "deploy"
  not verified_artifact
}
