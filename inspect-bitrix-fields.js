
const BITRIX_WEBHOOK = "https://systemsat.bitrix24.com.br/rest/54/y9yqvxtdwvccpsr1/";
const ENTITY_TYPE_ID = 1086;

async function inspectFields() {
  try {
    const url = `${BITRIX_WEBHOOK}crm.item.fields?entityTypeId=${ENTITY_TYPE_ID}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log("Fields for Entity Type 1086:", JSON.stringify(data.result, null, 2));
    
    // Also fetch one item to see real data
    const listUrl = `${BITRIX_WEBHOOK}crm.item.list`;
    const listResponse = await fetch(listUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityTypeId: ENTITY_TYPE_ID,
        select: ["*"],
        limit: 1
      })
    });
    const listData = await listResponse.json();
    console.log("Sample Item Data:", JSON.stringify(listData.result?.items?.[0], null, 2));

  } catch (e) {
    console.error("Error:", e);
  }
}

inspectFields();