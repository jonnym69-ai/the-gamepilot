const fs = require('fs');
const path = 'src/components/HomeDashboardSections.js';
let content = fs.readFileSync(path, 'utf8');

// Add import after the existing imports
const importLine = "import WishlistSection from './WishlistSection';\n";
if (!content.includes(importLine.trim())) {
  const lastImport = content.lastIndexOf('import ');
  const endOfImportLine = content.indexOf('\n', lastImport) + 1;
  content = content.slice(0, endOfImportLine) + importLine + content.slice(endOfImportLine);
}

// Find and remove the inline WishlistSection function
const startMarker = 'export function WishlistSection(';
const startIdx = content.indexOf(startMarker);
if (startIdx !== -1) {
  content = content.slice(0, startIdx) + "export { default as WishlistSection } from './WishlistSection';\n";
}

fs.writeFileSync(path, content, 'utf8');
console.log('Patched HomeDashboardSections.js');
