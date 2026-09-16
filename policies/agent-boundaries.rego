package engineering_factory.agent_boundaries

default allow := false

allow if {
  input.actor.type == "agent"
  input.request.action in input.actor.tool_allowlist
  input.request.change_id == input.actor.change_id
  input.request.environment in input.actor.environment_allowlist
  input.request.data_classification in input.actor.data_allowlist
  input.credentials.ttl_seconds <= 3600
}

deny_reason contains "agents may not modify access policy" if {
  input.actor.type == "agent"
  input.request.action == "change_access_policy"
}

deny_reason contains "workers cannot approve their own change" if {
  input.actor.type == "agent"
  input.request.action == "approve_change"
  input.actor.change_id == input.request.change_id
}
