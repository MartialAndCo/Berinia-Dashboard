const fs = require('fs');

function secureFile(path, authFunc) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  if (content.includes('import { checkAdminAuth }') || content.includes('import { checkUserAuth }')) return;

  const importStatement = authFunc === 'checkAdminAuth' 
    ? "import { checkAdminAuth } from '@/utils/supabase/server'"
    : "import { checkUserAuth } from '@/utils/supabase/server'";

  content = content.replace(/'use server'/, `'use server'\n\n${importStatement}`);

  content = content.replace(/export async function (\w+)\((.*?)\) \{/g, (match, p1, p2) => {
    return `export async function ${p1}(${p2}) {\n  try { await ${authFunc}(); } catch { return { success: false, error: 'Unauthorized' }; }\n`;
  });

  fs.writeFileSync(path, content);
  console.log('Secured ' + path);
}

secureFile('c:/Users/marti/Desktop/BerinIA/Dashboard/src/app/admin/actions.ts', 'checkAdminAuth');
secureFile('c:/Users/marti/Desktop/BerinIA/Dashboard/src/app/admin/billing/actions.ts', 'checkAdminAuth');
secureFile('c:/Users/marti/Desktop/BerinIA/Dashboard/src/app/admin/client/[id]/actions.ts', 'checkAdminAuth');
secureFile('c:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/actions.ts', 'checkUserAuth');
secureFile('c:/Users/marti/Desktop/BerinIA/Dashboard/src/app/update-password/actions.ts', 'checkUserAuth');
