import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

const port = Number(process.env.PORT || 3000);
const root = process.cwd();
const dataDir = join(root, '.data');
const dbFile = join(dataDir, 'control-plane.json');
const publicDir = join(root, 'public');

const seed = {
  changes: [{
    id: 'CHG-2026-000184', business_goal: 'Reduce checkout abandonment without weakening payment security.',
    services: ['checkout-api', 'payments-ui'], risk: 'high', data_classification: 'pci',
    acceptance_tests: ['Card payment succeeds under two seconds at p95.', 'No PCI data is present in application logs.'],
    required_approvals: ['product_owner', 'security', 'service_owner'],
    definition_of_done: ['Contract, integration, accessibility, and security tests pass.', 'SBOM and provenance are attached to the release candidate.'],
    status: 'VERIFYING', author: 'product-intake', created_at: '2026-09-16T12:00:00.000Z'
  }],
  events: [], approvals: [], artifacts: [], deployments: []
};

async function load() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dbFile)) { await writeFile(dbFile, JSON.stringify(seed, null, 2)); return structuredClone(seed); }
  return JSON.parse(await readFile(dbFile, 'utf8'));
}
async function save(data) { await writeFile(dbFile, JSON.stringify(data, null, 2)); }
function json(res, status, body) { res.writeHead(status, {'content-type': 'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); }
function digest(input) { return `sha256:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`; }
function event(data, {change_id, actor = {id: 'control-plane', type: 'service', role: 'orchestrator'}, action, result, evidence_uri, detail = {}}) {
  const entry = { event_id: randomUUID(), change_id, trace_id: randomUUID().replaceAll('-', ''), actor, action, input_digest: digest(detail), result, evidence_uri, timestamp: new Date().toISOString(), detail };
  data.events.push(entry); return entry;
}
function validateChange(value) {
  const errors = [];
  if (!/^CHG-\d{4}-\d{6}$/.test(value.id || '')) errors.push('id must match CHG-YYYY-NNNNNN');
  if (!value.business_goal || value.business_goal.length < 10) errors.push('business_goal must contain at least 10 characters');
  if (!Array.isArray(value.services) || !value.services.length) errors.push('at least one service is required');
  if (!['low','medium','high','critical'].includes(value.risk)) errors.push('risk is invalid');
  if (!['public','internal','confidential','pii','pci','phi'].includes(value.data_classification)) errors.push('data_classification is invalid');
  for (const key of ['acceptance_tests', 'required_approvals', 'definition_of_done']) if (!Array.isArray(value[key]) || !value[key].length) errors.push(`${key} must be a non-empty list`);
  return errors;
}
async function gitlabCommit({projectId, branch, startBranch, message, actions}) {
  const baseUrl = (process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/$/, '');
  if (!process.env.GITLAB_TOKEN) throw new Error('GitLab integration is not configured. Set GITLAB_TOKEN at runtime.');
  const response = await fetch(`${baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/commits`, {method:'POST',headers:{'content-type':'application/json','private-token':process.env.GITLAB_TOKEN},body:JSON.stringify({branch,start_branch:startBranch,commit_message:message,actions})});
  const payload = await response.json(); if (!response.ok) throw new Error(`GitLab commit rejected: ${payload.message || response.statusText}`);
  return {id:payload.id,web_url:payload.web_url,title:payload.title};
}
async function generatePatch(change) {
  if (!process.env.CODEGEN_WEBHOOK_URL) throw new Error('Code generation is not configured. Set CODEGEN_WEBHOOK_URL to the approved generator endpoint.');
  const response = await fetch(process.env.CODEGEN_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json',...(process.env.CODEGEN_WEBHOOK_TOKEN?{authorization:`Bearer ${process.env.CODEGEN_WEBHOOK_TOKEN}`}:{})},body:JSON.stringify({change,output_contract:{files:[{path:'relative non-hidden path',content:'complete UTF-8 file'}],explanation:'string',test_plan:['string']}})});
  const output=await response.json(); if (!response.ok) throw new Error(`Generator failed: ${output.error || response.statusText}`);
  if (!Array.isArray(output.files)||!output.files.length) throw new Error('Generator response must contain at least one file.');
  if (output.files.some(f=>typeof f.path!=='string'||!f.path||f.path.startsWith('/')||f.path.includes('..')||f.path.startsWith('.git/')||typeof f.content!=='string')) throw new Error('Generator returned an unsafe or invalid file path.');
  return output;
}
function policyDecision({change, actor, action, artifact, approvals}) {
  const reasons = [];
  if (action === 'deploy_production') {
    if (actor.type !== 'agent' || actor.role !== 'release-agent') reasons.push('only the release agent can initiate automated production promotion');
    if (change.risk === 'critical') reasons.push('critical changes require a human release manager');
    if (!artifact?.signed || !artifact?.provenance_verified || !artifact?.sbom_uri) reasons.push('artifact must be signed, provenanced, and have an SBOM');
    for (const role of ['service_owner','security']) if (!approvals.some(a => a.role === role && a.valid && a.change_id === change.id)) reasons.push(`missing valid ${role} approval`);
  }
  if (action === 'approve_change' && actor.type === 'agent') reasons.push('agents cannot approve changes');
  if (action === 'change_access_policy' && actor.type === 'agent') reasons.push('agents cannot modify access policy');
  return { decision_id: randomUUID(), allowed: reasons.length === 0, policy_version: 'release/v1', reasons };
}
async function body(req) { let text = ''; for await (const chunk of req) text += chunk; try { return JSON.parse(text || '{}'); } catch { throw new Error('Invalid JSON body'); } }
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`); const path = url.pathname; const data = await load();
    if (req.method === 'GET' && path === '/api/health') return json(res, 200, {status: 'ok', service: 'control-plane'});
    if (req.method === 'POST' && path === '/api/integrations/github/events') {
      if (!process.env.CONTROL_PLANE_TOKEN || req.headers.authorization !== `Bearer ${process.env.CONTROL_PLANE_TOKEN}`) return json(res,401,{error:'invalid integration credential'});
      const input=await body(req); if (!input.sha || !input.evidence_uri || !input.conclusion) return json(res,422,{error:'sha, evidence_uri, and conclusion are required'});
      const generation=data.events.find(e=>e.action==='generate_and_commit_candidate' && e.detail?.commit?.id===input.sha);
      if (!generation) return json(res,202,{status:'ignored',reason:'no matching factory-generated GitLab commit'});
      event(data,{change_id:generation.change_id,actor:{id:'github-actions',type:'service',role:'ci'},action:'github_pipeline_completed',result:input.conclusion==='success'?'passed':'failed',evidence_uri:input.evidence_uri,detail:input}); await save(data); return json(res,201,{status:'recorded'});
    }
    if (req.method === 'GET' && path === '/api/dashboard') {
      const statuses = Object.groupBy(data.changes, c => c.status);
      return json(res, 200, { changes: data.changes, summary: { total_changes: data.changes.length, active: data.changes.filter(c => !['DEPLOYED','ROLLED_BACK'].includes(c.status)).length, policy_denials: data.events.filter(e => e.result === 'denied').length, deployments: data.deployments.length, by_status: Object.fromEntries(Object.entries(statuses).map(([k,v]) => [k,v.length])) } });
    }
    if (req.method === 'GET' && path === '/api/changes') return json(res, 200, data.changes);
    if (req.method === 'POST' && path === '/api/changes') {
      const input = await body(req); const errors = validateChange(input); if (errors.length) return json(res, 422, {errors});
      if (data.changes.some(c => c.id === input.id)) return json(res, 409, {error: 'Change ID already exists'});
      const change = {...input, status: 'INTAKE', author: input.author || 'product-intake', created_at: new Date().toISOString()}; data.changes.push(change);
      event(data, {change_id: change.id, action: 'change_created', result: 'passed', evidence_uri: `artifact://changes/${change.id}/intake.json`, detail: change}); await save(data); return json(res, 201, change);
    }
    const match = path.match(/^\/api\/changes\/(CHG-\d{4}-\d{6})(?:\/(events|approvals|artifacts|policy-check|promote|generate))?$/);
    if (match) {
      const [, id, resource] = match; const change = data.changes.find(c => c.id === id); if (!change) return json(res, 404, {error: 'Change not found'});
      if (req.method === 'GET' && !resource) return json(res, 200, change);
      if (req.method === 'GET' && resource === 'events') return json(res, 200, data.events.filter(e => e.change_id === id));
      if (req.method === 'GET' && resource === 'approvals') return json(res, 200, data.approvals.filter(a => a.change_id === id));
      if (req.method === 'POST' && resource === 'approvals') {
        const input = await body(req); if (!['product_owner','service_owner','security','compliance','release_manager'].includes(input.role) || !input.approver) return json(res, 422, {error:'role and approver are required'});
        if (input.approver === change.author) return json(res, 403, {error:'author cannot approve their own change'});
        const approval = {approval_id:randomUUID(), change_id:id, role:input.role, approver:input.approver, valid:true, evidence_digest:digest(change), policy_version:'release/v1', expires_at:input.expires_at || new Date(Date.now()+86400000).toISOString(), created_at:new Date().toISOString()}; data.approvals.push(approval);
        event(data, {change_id:id, actor:{id:input.approver,type:'human',role:input.role}, action:'approve_change',result:'approved',evidence_uri:`artifact://approvals/${approval.approval_id}`,detail:approval}); await save(data); return json(res, 201, approval);
      }
      if (req.method === 'POST' && resource === 'artifacts') {
        const input = await body(req); if (!input.digest?.startsWith('sha256:')) return json(res,422,{error:'a sha256 digest is required'});
        const artifact = {artifact_id:randomUUID(),change_id:id,digest:input.digest,signed:Boolean(input.signed),provenance_verified:Boolean(input.provenance_verified),sbom_uri:input.sbom_uri || '',created_at:new Date().toISOString()}; data.artifacts.push(artifact);
        event(data,{change_id:id,action:'artifact_attested',result:artifact.signed && artifact.provenance_verified ? 'passed':'failed',evidence_uri:input.provenance_uri || `artifact://artifacts/${artifact.artifact_id}`,detail:artifact}); await save(data); return json(res,201,artifact);
      }
      if (req.method === 'POST' && resource === 'generate') {
        if (!change.repository?.gitlab_project_id) return json(res,422,{error:'change.repository.gitlab_project_id is required for GitLab delivery'});
        const decision=policyDecision({change,actor:{id:'developer-agent',type:'agent',role:'developer'},action:'start_build',approvals:data.approvals}); if (!decision.allowed) return json(res,403,decision);
        const generated=await generatePatch(change); const branch=`factory/${id.toLowerCase()}-${Date.now()}`;
        const commit=await gitlabCommit({projectId:change.repository.gitlab_project_id,branch,startBranch:change.repository.default_branch,message:`feat(${id}): generated implementation`,actions:generated.files.map(f=>({action:'create',file_path:f.path,content:f.content}))});
        change.status='IMPLEMENTING'; const evidence={branch,commit,generator_explanation:generated.explanation||'',test_plan:generated.test_plan||[]}; event(data,{change_id:id,actor:{id:'developer-agent',type:'agent',role:'developer'},action:'generate_and_commit_candidate',result:'passed',evidence_uri:`artifact://generated/${id}/${commit.id}`,detail:evidence}); await save(data); return json(res,201,evidence);
      }
      if (req.method === 'POST' && resource === 'policy-check') {
        const input = await body(req); const decision = policyDecision({change, actor:input.actor || {type:'agent',role:'release-agent'}, action:input.action, artifact:data.artifacts.find(a=>a.change_id===id && a.digest===input.artifact_digest), approvals:data.approvals});
        event(data,{change_id:id,actor:input.actor || {id:'release-agent',type:'agent',role:'release-agent'},action:input.action,result:decision.allowed?'passed':'denied',evidence_uri:`artifact://policy/${decision.decision_id}`,detail:decision}); await save(data); return json(res,200,decision);
      }
      if (req.method === 'POST' && resource === 'promote') {
        const input = await body(req); const actor={id:'release-agent',type:'agent',role:'release-agent'}; const artifact=data.artifacts.find(a=>a.change_id===id && a.digest===input.artifact_digest);
        const decision=policyDecision({change,actor,action:'deploy_production',artifact,approvals:data.approvals});
        if (!decision.allowed) { event(data,{change_id:id,actor,action:'deploy_production',result:'denied',evidence_uri:`artifact://policy/${decision.decision_id}`,detail:decision}); await save(data); return json(res,403,decision); }
        const deployment={deployment_id:randomUUID(),change_id:id,artifact_digest:artifact.digest,environment:'production',stage:'internal',status:'PROMOTING',created_at:new Date().toISOString()}; data.deployments.push(deployment); change.status='PROMOTING'; event(data,{change_id:id,actor,action:'deploy_production',result:'passed',evidence_uri:`artifact://deployments/${deployment.deployment_id}`,detail:deployment}); await save(data); return json(res,201,deployment);
      }
    }
    if (req.method === 'GET') {
      const file = path === '/' ? '/index.html' : path; const safe = join(publicDir, file); if (!safe.startsWith(publicDir) || !existsSync(safe)) return json(res, 404, {error:'Not found'});
      res.writeHead(200, {'content-type':mime[extname(safe)] || 'application/octet-stream'}); res.end(await readFile(safe)); return;
    }
    json(res, 404, {error:'Not found'});
  } catch (error) { json(res, 400, {error:error.message}); }
});
server.listen(port, () => console.log(`Engineering Factory control plane: http://localhost:${port}`));
