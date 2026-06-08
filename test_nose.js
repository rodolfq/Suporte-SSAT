const { createAvatar } = require('@dicebear/core');
const avataaars = require('@dicebear/avataaars');
const fs = require('fs');

const avatar = createAvatar(avataaars, { size: 280 });
let svg = avatar.toString();

let accessoriesSvg = '';
// Nose Hoop
accessoriesSvg += `<circle cx="144" cy="132" r="5" fill="none" stroke="#94A3B8" stroke-width="2" />`;

// Nose Stud
accessoriesSvg += `<circle cx="120" cy="130" r="2" fill="#E2E8F0" />`;

svg = svg.replace('</svg>', `${accessoriesSvg}</svg>`);
fs.writeFileSync('test_nose.svg', svg);