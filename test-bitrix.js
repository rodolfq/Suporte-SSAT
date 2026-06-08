
const BITRIX_WEBHOOK = "https://systemsat.bitrix24.com.br/rest/54/y9yqvxtdwvccpsr1/";

async function checkMethods() {
  try {
    const response = await fetch(`${BITRIX_WEBHOOK}methods`);
    const data = await response.json();
    console.log("Available methods:", JSON.stringify(data.result).substring(0, 500) + "...");
    
    // Check specific methods
    const methodsToCheck = ["crm.item.list", "crm.activity.list", "crm.deal.list", "tasks.task.list", "crm.smart_process.item.list"];
    for (const m of methodsToCheck) {
      const res = await fetch(`${BITRIX_WEBHOOK}${m}`);
      const d = await res.json();
      console.log(`Method ${m}:`, d.error || "OK");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

checkMethods();