import fs from 'fs';
const file = 'c:/Users/User/CascadeProjects/windsurf-project-6/gamepilot/src/components/HomeDashboardSections.js';
let content = fs.readFileSync(file, 'utf8');
const startMarker = 'export function WishlistSection({ library = [], platformIcons, onLaunchGame }) {';
const idx = content.indexOf(startMarker);
if (idx !== -1) {
  content = content.slice(0, idx) + "export { default as WishlistSection } from './WishlistSection';\n";
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched successfully');
} else {
  console.log('Marker not found');
}
