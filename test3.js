const { createAvatar } = require('@dicebear/core');
const avataaars = require('@dicebear/avataaars');
const fs = require('fs');

const avatar = createAvatar(avataaars, { size: 280 });
let svg = avatar.toString();

let accessoriesSvg = '';
// Earring Hoop
accessoriesSvg += `<circle cx="79" cy="130" r="8" fill="none" stroke="#FBBF24" stroke-width="3" />`;
accessoriesSvg += `<circle cx="201" cy="130" r="8" fill="none" stroke="#FBBF24" stroke-width="3" />`;

// Necklace
accessoriesSvg += `<path d="M 110 200 Q 140 230 170 200" fill="none" stroke="#FBBF24" stroke-width="4" />`;
accessoriesSvg += `<circle cx="140" cy="215" r="6" fill="#FBBF24" />`;

svg = svg.replace('</svg>', `${accessoriesSvg}</svg>`);
fs.writeFileSync('test3.svg', svg);