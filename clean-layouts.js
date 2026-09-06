const fs = require('fs');

function cleanLayout(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/const \[loading, setLoading\] = useState\(true\)/g, '');
  content = content.replace(/if \(loading\) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...<\/div>/g, '');
  
  // We keep the useEffect to listen to session changes or as a fallback if they log out in another tab
  // But without loading=true blocking the render!
  // Actually, wait, if we keep useEffect but remove setLoading, it will error out saying setLoading is not defined.
  content = content.replace(/setLoading\(false\)/g, '');

  fs.writeFileSync(path, content);
  console.log('Cleaned ' + path);
}

cleanLayout('c:/Users/marti/Desktop/BerinIA/Dashboard/src/app/admin/layout.tsx');
cleanLayout('c:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/layout.tsx');
