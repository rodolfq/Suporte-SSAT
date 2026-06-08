const recharts = require('recharts');
const keys = ['BarChart', 'Bar', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer', 'LineChart', 'Line', 'ScatterChart', 'Scatter', 'ZAxis', 'RadarChart', 'PolarGrid', 'PolarAngleAxis', 'PolarRadiusAxis', 'Radar', 'Legend'];
keys.forEach(k => {
  if (!recharts[k]) console.log('Missing:', k);
});
console.log('Done');