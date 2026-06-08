const { createAvatar } = require('@dicebear/core');
const avataaars = require('@dicebear/avataaars');
const fs = require('fs');

const svg1 = createAvatar(avataaars, { size: 264, accessories: ['eyepatch'], accessoriesProbability: 100 }).toString();
const svg2 = createAvatar(avataaars, { size: 264, accessoriesProbability: 0 }).toString();

let diff = '';
for(let i=0; i<svg1.length; i++) {
  if (svg1[i] !== svg2[i]) {
    diff = svg1.substring(i, i + 749);
    break;
  }
}
console.log(diff);