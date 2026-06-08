const df = require('date-fns');
const keys = ['parse', 'isValid', 'format', 'isWithinInterval', 'startOfDay', 'endOfDay', 'parseISO'];
keys.forEach(k => {
  if (!df[k]) console.log('Missing:', k);
});
console.log('Done');