const lucide = require('lucide-react');
const icons = [
  'TrendingUp', 'TrendingDown', 'ThumbsUp', 'ThumbsDown', 'Users', 'MessageSquare', 'Clock', 'Timer', 'Search', 'X', 'GripVertical', 'Info',
  'CheckCircle', 'Lightbulb', 'Award', 'GraduationCap', 'Zap',
  'ArrowUpDown', 'ChevronLeft', 'ChevronRight', 'FileDown', 'Trophy',
  'Ticket', 'Filter', 'CheckCircle2', 'AlertCircle', 'MoreHorizontal', 'RefreshCw',
  'Database', 'Trash2', 'User', 'Check', 'Calendar', 'FileText', 'Image', 'ShieldCheck', 'ShieldAlert', 'Terminal', 'Sparkles',
  'Table', 'ArrowLeft', 'XCircle',
  'UserSearch', 'BarChart2', 'Plus',
  'CloudUpload', 'FileCheck', 'Loader2', 'Eye',
  'Palette', 'Shirt'
];
const missing = [];
icons.forEach(k => {
  if (!lucide[k]) missing.push(k);
});
console.log('Missing:', missing);