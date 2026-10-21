import { writeFile } from 'node:fs/promises';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_ANON_KEY ?? '';
await writeFile('supabase-config.js', `export const SUPABASE_URL = ${JSON.stringify(url)};\nexport const SUPABASE_ANON_KEY = ${JSON.stringify(key)};\n`);
console.log(url && key ? 'Configuration Supabase injectée.' : 'Supabase non configuré : mode local conservé.');
