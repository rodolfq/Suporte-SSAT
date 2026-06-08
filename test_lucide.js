const lucide = require('lucide-react');
const keys = ['TrendingUp', 'TrendingDown', 'ThumbsUp', 'ThumbsDown', 'Users', 'MessageSquare', 'Clock', 'Timer', 'Search', 'X', 'GripVertical', 'Info'];
keys.forEach(k => {
  if (!lucide[k]) console.log('Missing:', k);
});
console.log('Done');