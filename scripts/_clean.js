const fs=require('fs');
let f=fs.readFileSync('components/gold-pro-page.tsx','utf8');
const lines=f.split('
');
const keep=lines.filter((_,i)=>!(i>=98&&i<=109));
f=keep.join('
');
f=f.replace('import { useState, useEffect, useMemo } from "react"','import { useState, useEffect } from "react"');
fs.writeFileSync('components/gold-pro-page.tsx',f,'utf8');
console.log('Done len:',f.length);