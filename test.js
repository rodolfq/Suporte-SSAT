const { createAvatar } = require('@dicebear/core');
const avataaars = require('@dicebear/avataaars');
const fs = require('fs');

const svg = createAvatar(avataaars, { size: 264 }).toString();
fs.writeFileSync('test.svg', svg);