/* Local-only regression runner. Requires the existing static servers on 4181/5501.
 * Legacy tests hardcode 4173; only their local URL is adapted in memory.
 * Assertions and application source are not rewritten. Each test gets a process.
 */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),Module=require('node:module');
const root=path.resolve(__dirname,'..');
const base=process.env.KICKS_TEST_URL||'http://127.0.0.1:4181';
const target=new URL(base);
if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname))throw Error('Run audit fixtures on loopback only.');
process.chdir(root);
process.env.KICKS_TEST_URL=target.origin;
process.env.KICKS_VISUAL_BASE=target.origin+'/';
if(!process.env.KICKS_PLAYWRIGHT_PATH){
 try{process.env.KICKS_PLAYWRIGHT_PATH=require.resolve('playwright');}
 catch{const runtime=path.join(process.env.USERPROFILE||'', '.cache','codex-runtimes','codex-primary-runtime','dependencies','node','node_modules','playwright');if(fs.existsSync(runtime))process.env.KICKS_PLAYWRIGHT_PATH=runtime;}
}
if(process.argv[2]==='--test'){
 const file=path.resolve(root,process.argv[3]||'');
 if(!file.startsWith(path.join(root,'tests')+path.sep)||!file.endsWith('.cjs'))throw Error('Choose a test under tests/.');
 const source=fs.readFileSync(file,'utf8').replaceAll('http://127.0.0.1:4173',target.origin).replaceAll('http://127.0.0.1:4181',target.origin);
 process.argv=[process.execPath,file,...process.argv.slice(4)];
 const test=new Module(file,module);test.filename=file;test.paths=Module._nodeModulePaths(path.dirname(file));test._compile(source,file);
}else{
 const out=process.env.KICKS_SUITE_OUTPUT||path.join('.local','technical-audit','runs',new Date().toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(out,{recursive:true});
 const files=fs.readdirSync('tests').filter(file=>file.endsWith('.cjs')).sort(),report={started:new Date().toISOString(),base:target.origin,results:[]};let cursor=0;
 async function worker(){while(cursor<files.length){const file=files[cursor++],start=Date.now();
  const result=await new Promise(resolve=>cp.execFile(process.execPath,[__filename,'--test','tests/'+file],{cwd:root,encoding:'utf8',timeout:/visual|secondary-reconstruction/.test(file)?900000:180000,maxBuffer:2e6},(error,stdout,stderr)=>resolve({exit:error?error.code:0,timedOut:!!error?.killed,log:stdout+stderr})));
  fs.writeFileSync(path.join(out,file+'.log'),result.log);
  report.results.push({file,exit:result.exit,timedOut:result.timedOut,seconds:Math.round((Date.now()-start)/1000)});
  fs.writeFileSync(path.join(out,'complete-suite.json'),JSON.stringify(report,null,2));
  console.log((result.exit===0?'PASS ':'FAIL ')+file);
 }}
 Promise.all([worker(),worker()]).then(()=>{report.finished=new Date().toISOString();report.passed=report.results.filter(r=>r.exit===0).length;report.failed=report.results.length-report.passed;fs.writeFileSync(path.join(out,'complete-suite.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,evidence:out}));if(report.failed)process.exitCode=1;}).catch(error=>{console.error(error);process.exitCode=1});
}
