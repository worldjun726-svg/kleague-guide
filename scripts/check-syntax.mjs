import ts from 'typescript';
import {readdirSync,readFileSync} from 'node:fs';
const files=readdirSync('src').filter(f=>/\.tsx?$/.test(f));let errors=0;
for(const name of files){const result=ts.transpileModule(readFileSync('src/'+name,'utf8'),{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,isolatedModules:true},reportDiagnostics:true});for(const d of result.diagnostics||[]){if(d.category===ts.DiagnosticCategory.Error){errors++;console.error(name,ts.flattenDiagnosticMessageText(d.messageText,'\n'))}}}
console.log('TS/TSX syntax checked:',files.length,'files;',errors,'errors (not a full type check)');process.exitCode=errors?1:0;
