const {execFileSync}=require('node:child_process');
const path=require('node:path');
if(process.platform!=='darwin')process.exit(0);
const headers=require('node-api-headers').include_dir;
execFileSync('clang++',['-arch','arm64','-arch','x86_64','-std=c++17','-fobjc-arc','-mmacosx-version-min=11.0','-bundle','-undefined','dynamic_lookup','-framework','Cocoa','-DNAPI_VERSION=8','-I',headers,'native/macos/popover.mm','-o','native/macos/popover.node'],{stdio:'inherit',cwd:path.join(__dirname,'..')});
