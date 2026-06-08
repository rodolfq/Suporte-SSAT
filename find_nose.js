const { createAvatar } = require('@dicebear/core');
const avataaars = require('@dicebear/avataaars');
const fs = require('fs');

const avatar = createAvatar(avataaars, { size: 280 });
const svg = avatar.toString();

// find the nose path
const match = svg.match(/<path[^>]*fill="#000"[^>]*fill-opacity="\.[0-9]+"[^>]*>/g);
console.log(match);