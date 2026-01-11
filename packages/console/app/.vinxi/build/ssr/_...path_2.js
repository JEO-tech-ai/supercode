async function n(o){const s=o.params.path,t=await o.request.json();return Response.json({path:s,method:"POST",body:t})}export{n as POST};
