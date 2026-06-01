/* ═══════════════════════════════════════════════════════════════
   Talk2Sql — Data Sentinels Diagnostic
   Paste this ENTIRE block into Talk2Sql DevTools console (Alt+Cmd+I → Console)
   while connected to Oracle Fusion.
   ═══════════════════════════════════════════════════════════════ */
(async function diagSentinels(){
  console.clear();
  console.log('%c Talk2Sql — Sentinel Endpoint Diagnostic', 'color:#4dabf7;font-size:14px;font-weight:700');
  console.log('%c Running as: '+(ST.user||'NOT CONNECTED')+' @ '+(ST.url||'no URL'), 'color:#aaa');
  console.log('%c─────────────────────────────────────────────', 'color:#333');

  if(!ST.conn||!ST.url){
    console.error('❌ NOT CONNECTED — click the connection pill and connect first, then re-run this diagnostic.');
    return;
  }

  var base=ST.url.replace(/\/$/,'');
  var creds=btoa(ST.user+':'+ST.pass);

  function testEP(name,path,params){
    return new Promise(function(resolve){
      var t0=Date.now();
      var xhr=new XMLHttpRequest();
      var url=base+path+'?'+(params||'limit=5')+'&onlyData=true';
      xhr.open('GET',url,true);
      xhr.setRequestHeader('Authorization','Basic '+creds);
      xhr.setRequestHeader('Accept','application/json');
      xhr.timeout=15000;
      xhr.onload=function(){
        var ms=Date.now()-t0;
        var result={name,path,status:xhr.status,ms};
        try{
          var d=JSON.parse(xhr.responseText);
          var items=d.items||d.value||d||[];
          result.count=Array.isArray(items)?items.length:'n/a';
          result.fields=Array.isArray(items)&&items.length?Object.keys(items[0]).slice(0,8):[]; 
          result.raw=d;
        }catch(e){result.parseErr=e.message;result.rawText=xhr.responseText.substring(0,300);}
        resolve(result);
      };
      xhr.onerror=function(){resolve({name,path,status:'NETWORK_ERR',ms:Date.now()-t0});};
      xhr.ontimeout=function(){resolve({name,path,status:'TIMEOUT',ms:15000});};
      xhr.send();
    });
  }

  var endpoints=[
    // ── Overview / Shared ──────────────────────────────────────────────
    {group:'FSCM — Finance',   name:'AP Invoices',       path:'/fscmRestApi/resources/latest/invoices',                      params:'limit=5&fields=InvoiceId,InvoiceNumber,InvoiceAmount,PaymentStatusFlag'},
    {group:'FSCM — Finance',   name:'GL Journals',        path:'/fscmRestApi/resources/latest/generalLedgerJournals',         params:'limit=5'},
    {group:'FSCM — Finance',   name:'AR Credit Memos',    path:'/fscmRestApi/resources/latest/receivablesCreditMemos',        params:'limit=5'},
    {group:'FSCM — Finance',   name:'Business Units',     path:'/fscmRestApi/resources/latest/businessUnits',                 params:'limit=10'},
    {group:'FSCM — Finance',   name:'Approval Tasks',     path:'/fscmRestApi/resources/latest/approvalTasks',                 params:'limit=5'},
    // ── SCM ─────────────────────────────────────────────────────────────
    {group:'FSCM — SCM',       name:'Purchase Orders',    path:'/fscmRestApi/resources/latest/purchaseOrders',                params:'limit=5'},
    {group:'FSCM — SCM',       name:'Suppliers',          path:'/fscmRestApi/resources/latest/suppliers',                     params:'limit=5'},
    // ── HCM ─────────────────────────────────────────────────────────────
    {group:'HCM',              name:'Workers',             path:'/hcmRestApi/resources/latest/workers',                       params:'limit=5'},
    {group:'HCM',              name:'Payroll Periods',     path:'/hcmRestApi/resources/latest/payrollTimeDefinitions',         params:'limit=5'},
    // ── ICM / CX ────────────────────────────────────────────────────────
    {group:'CX — ICM',         name:'Comp Plans',          path:'/cxRestApi/resources/latest/incentiveCompensationPlans',     params:'limit=5'},
    {group:'CX — ICM',         name:'Participants',        path:'/cxRestApi/resources/latest/incentiveCompensationParticipants',params:'limit=5'},
    {group:'CX — ICM',         name:'Earnings',            path:'/cxRestApi/resources/latest/incentiveCompensationEarnings',  params:'limit=5'},
    {group:'CX — ICM',         name:'ICM Roles (FSCM)',    path:'/fscmRestApi/resources/latest/incentiveCompensationRoles',   params:'limit=5'},
    // ── CRM ─────────────────────────────────────────────────────────────
    {group:'CRM',              name:'Accounts',            path:'/crmRestApi/resources/latest/accounts',                      params:'limit=5'},
    // ── Alt field names to try ───────────────────────────────────────────
    {group:'ALT — Workers',    name:'Workers (no fields)', path:'/hcmRestApi/resources/latest/workers',                       params:'limit=2'},
    {group:'ALT — Invoices',   name:'Invoices (no fields)',path:'/fscmRestApi/resources/latest/invoices',                     params:'limit=2'},
  ];

  var results=[];
  var groups={};

  for(var i=0;i<endpoints.length;i++){
    var ep=endpoints[i];
    process.stdout&&process.stdout.write&&process.stdout.write('Testing '+ep.name+'...');
    var r=await testEP(ep.name,ep.path,ep.params);
    r.group=ep.group;
    results.push(r);
    if(!groups[ep.group])groups[ep.group]=[];
    groups[ep.group].push(r);
  }

  // ── Print report ──────────────────────────────────────────────────────
  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#333');
  console.log('%c RESULTS SUMMARY', 'color:#4dabf7;font-weight:700;font-size:13px');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'color:#333');

  Object.keys(groups).forEach(function(g){
    console.log('%c '+g, 'color:#fcc419;font-weight:700;font-size:11px');
    groups[g].forEach(function(r){
      var ok=r.status===200||r.status===206;
      var statusColor=ok?'#51cf66':r.status===401||r.status===403?'#ff6b6b':'#fcc419';
      var icon=ok?'✅':r.status===401?'🔐':r.status===403?'🚫':r.status===404?'🔍':'❌';
      console.log(
        '%c  '+icon+' %-30s HTTP %-4s %sms %s',
        'color:'+statusColor,
        r.name, r.status, r.ms,
        ok?('→ '+r.count+' records, fields: ['+r.fields.join(',')+']')
          :r.parseErr?'(parse error: '+r.parseErr+')':'(no data)'
      );
      if(r.status===401||r.status===403){
        console.warn('     ⚠ '+r.name+': John.Dunbar needs additional Oracle Fusion role for this endpoint');
        if(r.raw&&r.raw.o_errorCode){console.warn('     Error Code: '+r.raw.o_errorCode+' — '+r.raw.o_errorDetail);}
      }
      if(r.rawText){console.warn('     Raw:', r.rawText);}
    });
    console.log('');
  });

  // ── Permissions report ─────────────────────────────────────────────────
  var failed=results.filter(function(r){return r.status===401||r.status===403;});
  var missing=results.filter(function(r){return r.status===404;});
  var errored=results.filter(function(r){return typeof r.status==='string'||r.status>=500;});
  var passed=results.filter(function(r){return r.status===200||r.status===206;});

  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#333');
  console.log('%c ROLES NEEDED FOR JOHN.DUNBAR', 'color:#ff6b6b;font-weight:700;font-size:13px');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#333');

  var roleMap={
    'AP Invoices':         'Accounts Payable Manager / AP Invoice Inquiry',
    'GL Journals':         'General Ledger Manager / GL Journal Entry Inquiry',
    'AR Credit Memos':     'Accounts Receivable Manager / AR Transaction Inquiry',
    'Business Units':      'Financial Application Administrator (or any FSCM role)',
    'Approval Tasks':      'Procurement Requester or Workflow Participant',
    'Purchase Orders':     'Procurement Manager / Buyer',
    'Suppliers':           'Supplier Manager / Procurement Manager',
    'Workers':             'Human Resource Specialist / HR Manager',
    'Payroll Periods':     'Payroll Administrator',
    'Comp Plans':          'Incentive Compensation Analyst',
    'Participants':        'Incentive Compensation Analyst',
    'Earnings':            'Incentive Compensation Analyst',
    'ICM Roles (FSCM)':   'Incentive Compensation Administrator',
    'Accounts':            'Sales Administrator / CRM Application Administrator'
  };

  if(failed.length){
    console.log('\n%c🚫 Permission Denied (401/403):', 'color:#ff6b6b;font-weight:700');
    failed.forEach(function(r){
      console.log('%c  • '+r.name+'\n    → Role needed: '+(roleMap[r.name]||'Check Oracle Fusion Security Console'),
        'color:#ff6b6b');
    });
  }
  if(missing.length){
    console.log('\n%c🔍 Endpoint Not Found (404) — may need version update:', 'color:#fcc419;font-weight:700');
    missing.forEach(function(r){console.log('%c  • '+r.name+' → '+r.path,'color:#fcc419');});
  }
  if(errored.length){
    console.log('\n%c❌ Network/Server Errors:', 'color:#aaa;font-weight:700');
    errored.forEach(function(r){console.log('%c  • '+r.name+': '+r.status,'color:#aaa');});
  }

  console.log('\n%c✅ Working ('+passed.length+'/'+results.length+'):', 'color:#51cf66;font-weight:700');
  passed.forEach(function(r){console.log('%c  • '+r.name+' → '+r.count+' records','color:#51cf66');});

  // ── Field name discovery (from working endpoints) ─────────────────────
  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#333');
  console.log('%c ACTUAL FIELD NAMES (for fixing Sentinels code)', 'color:#da77f2;font-weight:700;font-size:13px');
  passed.forEach(function(r){
    if(r.fields&&r.fields.length){
      console.log('%c '+r.name+':', 'color:#da77f2;font-weight:700');
      console.log('  ', r.fields.join(' | '));
      if(r.raw&&r.raw.items&&r.raw.items[0]){
        console.log('  Sample:', JSON.stringify(r.raw.items[0]).substring(0,200));
      }
    }
  });

  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#333');
  console.log('%c Copy this output and share with Chandra / give to Admin', 'color:#aaa;font-style:italic');

  return results;
})();
