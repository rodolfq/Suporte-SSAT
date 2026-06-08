const { createAvatar } = require('@dicebear/core');
const avataaars = require('@dicebear/avataaars');
const fs = require('fs');

const avatar = createAvatar(avataaars, { size: 264 });
let svg = avatar.toString();

let accessoriesSvg = '';
// Earring Hoop
accessoriesSvg += `<circle cx="79" cy="130" r="8" fill="none" stroke="#FBBF24" stroke-width="3" />`;
accessoriesSvg += `<circle cx="201" cy="130" r="8" fill="none" stroke="#FBBF24" stroke-width="3" />`;

// Necklace
accessoriesSvg += `<path d="M 110 210 Q 140 240 170 210" fill="none" stroke="#FBBF24" stroke-width="4" />`;
accessoriesSvg += `<circle cx="140" cy="225" r="6" fill="#FBBF24" />`;

// Nose Hoop
accessoriesSvg += `<circle cx="140" cy="155" r="5" fill="none" stroke="#94A3B8" stroke-width="2" />`;

// Nose Stud
accessoriesSvg += `<circle cx="135" cy="152" r="2" fill="#E2E8F0" />`;

// Eyebrow Piercing
accessoriesSvg += `<circle cx="100" cy="100" r="2" fill="#E2E8F0" />`;
accessoriesSvg += `<circle cx="105" cy="105" r="2" fill="#E2E8F0" />`;

// Mouth Piercing
accessoriesSvg += `<circle cx="140" cy="180" r="2" fill="#E2E8F0" />`;

svg = svg.replace('</svg>', `${accessoriesSvg}</svg>`);
fs.writeFileSync('test2.svg', svg);