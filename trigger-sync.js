
const fetch = require('node-fetch');

async function triggerSync() {
  console.log('Triggering sync...');
  try {
    const response = await fetch('http://localhost:3000/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('Sync result:', data);
    
    if (data.success) {
      console.log(`Synced ${data.count} tickets.`);
      
      // Now fetch them to see if any are "Atrasada"
      const getResponse = await fetch('http://localhost:3000/api/tickets');
      const tickets = await getResponse.json();
      const overdue = tickets.filter(t => t.displayStatus === 'Atrasada');
      console.log(`Found ${overdue.length} overdue tickets in the database.`);
      if (overdue.length > 0) {
        console.log('Sample overdue ticket:', overdue[0]);
      }
    }
  } catch (error) {
    console.error('Error triggering sync:', error);
  }
}

triggerSync();