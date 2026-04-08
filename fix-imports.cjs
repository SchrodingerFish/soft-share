const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/ui');
const files = fs.readdirSync(dir);

for (const file of files) {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/@\/components\/ui/g, '@/src/components/ui');
    if (file === 'sonner.tsx') {
      content = "import React from 'react';\n" + content;
    }
    fs.writeFileSync(filePath, content);
  }
}
console.log('Done');
