const { createAvatar } = require('@dicebear/core');
const avataaars = require('@dicebear/avataaars');
const fs = require('fs');

const avatar = createAvatar(avataaars, { size: 264, accessories: ['eyepatch'] });
const svg = avatar.toString();
fs.writeFileSync('test_eyepatch.svg', svg);