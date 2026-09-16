/**
 * Minimal code-generation worker. Deploy independently from the control plane.
 * It receives a validated ChangeRequest, asks an OpenAI-compatible model gateway
 * for a tightly structured patch, then returns it for policy-controlled GitLab commit.
 */
import http from 'node:http';

const port = Number(process.env.PORT || 3100);
const modelUrl = process.env.MODEL_GATEWAY_URL;
const modelToken = process.env.MODEL_GATEWAY_TOKEN;
const model = process.env.MODEL_NAME || 'gpt-5';
const system = `You generate narrow, reviewable engineering changes. Use only the supplied requirement. Return JSON exactly: {"files":[{"path":"relative/path","content":"..."}],"explanation":"...","test_plan":["..."]}. Do not write secrets, workflow files, dependency locks, hidden files, or paths outside the repository.`;

async function readJson(req) { let body=''; for await (const part of req) body+=part; return JSON.parse(body); }
function respond(res,status,body){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));}
http.createServer(async (req,res)=>{
  if(req.method !== 'POST' || req.url !== '/generate') return respond(res,404,{error:'not found'});
  try {
    if(!modelUrl || !modelToken) throw new Error('MODEL_GATEWAY_URL and MODEL_GATEWAY_TOKEN are required');
    const request=await readJson(req);
    const result=await fetch(`${modelUrl.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${modelToken}`},body:JSON.stringify({model,temperature:0.1,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(request)}]})});
    const payload=await result.json(); if(!result.ok) throw new Error(payload.error?.message || 'model gateway request failed');
    respond(res,200,JSON.parse(payload.choices[0].message.content));
  } catch(error) { respond(res,400,{error:error.message}); }
}).listen(port,()=>console.log(`Codegen worker on :${port}`));
