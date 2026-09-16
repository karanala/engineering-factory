const $ = s => document.querySelector(s);
let selectedId;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function api(path, options) { const res = await fetch(`/api${path}`, options); const data = await res.json(); if (!res.ok) throw new Error(data.error || data.errors?.join(', ') || 'Request failed'); return data; }
function metric(label, value) { return `<div class="metric"><b>${value}</b><span>${label}</span></div>`; }
async function load() {
  const {changes,summary}=await api('/dashboard');
  $('#metrics').innerHTML=[metric('Changes',summary.total_changes),metric('Active workflows',summary.active),metric('Policy denials',summary.policy_denials),metric('Production promotions',summary.deployments)].join('');
  $('#changes').innerHTML=changes.map(c=>`<article class="change ${c.id===selectedId?'selected':''}" data-id="${c.id}"><div class="change-id">${c.id}</div><div><div class="change-title">${esc(c.business_goal)}</div><div class="change-meta">${c.services.map(esc).join(' · ')} &nbsp; / &nbsp; ${c.data_classification}</div></div><span class="pill ${c.risk}">${c.status}</span></article>`).join('') || '<div class="empty">No governed changes yet.</div>';
  document.querySelectorAll('.change').forEach(el=>el.onclick=()=>showChange(el.dataset.id));
}
async function showChange(id) { selectedId=id; const [change,events,approvals]=await Promise.all([api(`/changes/${id}`),api(`/changes/${id}/events`),api(`/changes/${id}/approvals`)]); $('#lineage-title').textContent=id; $('#status-pill').textContent=change.status; $('#status-pill').className=`pill ${change.risk}`;
  const approvalEvents=approvals.map(a=>({action:`${a.role} approval recorded`,result:'approved',timestamp:a.created_at,actor:{id:a.approver},evidence_uri:`approval ${a.approval_id}`}));
  const all=[...events,...approvalEvents].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  $('#lineage').innerHTML=all.length?`<div class="events">${all.map(e=>`<div class="event ${e.result}"><div class="event-head">${esc(e.action)} <span class="pill">${e.result}</span></div><div class="event-detail">${esc(e.actor?.id||'system')} · ${new Date(e.timestamp).toLocaleString()} · ${esc(e.evidence_uri)}</div></div>`).join('')}</div>`:'<div class="empty">The ledger will populate as work begins.</div>'; load(); }
$('#new-change').onclick=()=>$('#change-dialog').showModal(); $('#refresh').onclick=load;
$('#change-form').addEventListener('submit',async e=>{e.preventDefault(); const f=new FormData(e.currentTarget); const lines=n=>f.get(n).split('\n').map(x=>x.trim()).filter(Boolean); const input={id:f.get('id'),business_goal:f.get('business_goal'),risk:f.get('risk'),data_classification:f.get('data_classification'),services:f.get('services').split(',').map(x=>x.trim()).filter(Boolean),acceptance_tests:lines('acceptance_tests'),definition_of_done:lines('definition_of_done'),required_approvals:['product_owner','service_owner',...(f.get('risk')==='high'||f.get('risk')==='critical'?['security']:[])]}; try {const c=await api('/changes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}); $('#change-dialog').close(); e.currentTarget.reset(); selectedId=c.id; await load(); showChange(c.id);} catch(err){$('#form-error').textContent=err.message;}});
load();
