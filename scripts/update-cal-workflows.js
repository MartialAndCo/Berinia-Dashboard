const CAL_API_KEY = 'cal_live_80fa86a5d22da79196f19d220a7ebd1e';

const SHORT_SMS = {
  449911: 'Hey {ATTENDEE}, quick reminder our call is tomorrow at {EVENT_TIME}. Please make sure you join from a computer.',
  449912: "Hey {ATTENDEE}, our call is in 6 hours ({EVENT_TIME}). If you can't make it, please let me know here.",
  449913: "Hey {ATTENDEE}, we're on in 1 hour ({EVENT_TIME}). Here's your link: {MEETING_URL}",
  449914: "Hey {ATTENDEE}, hopping on in 5 mins! Link: {MEETING_URL}",
  449915: "I'm in the room! Join here: {MEETING_URL}",
};

async function main() {
  console.log('Fetching Cal.com workflows...');
  const res = await fetch('https://api.cal.com/v2/workflows', {
    headers: {
      Authorization: `Bearer ${CAL_API_KEY}`,
      'cal-api-version': '2024-08-13',
    },
  });

  const json = await res.json();
  const workflows = json.data || [];

  for (const wf of workflows) {
    console.log(`\nWorkflow ID: ${wf.id} - ${wf.name}`);
    const newText = SHORT_SMS[wf.id];
    if (!newText) {
      console.log('  No custom SMS mapping for this workflow, skipping.');
      continue;
    }

    const updatedSteps = wf.steps.map((s) => {
      if (s.action === 'sms_attendee') {
        console.log(`  Updating SMS text to: "${newText}"`);
        return {
          ...s,
          message: {
            ...(s.message || {}),
            text: newText,
          },
        };
      }
      return s;
    });

    const patchRes = await fetch(`https://api.cal.com/v2/workflows/${wf.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${CAL_API_KEY}`,
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        steps: updatedSteps,
      }),
    });

    const patchJson = await patchRes.json();
    if (patchRes.ok && patchJson.status === 'success') {
      console.log(`  ✅ Successfully updated workflow ${wf.id} (${wf.name})`);
    } else {
      console.error(`  ❌ Failed to update ${wf.id}:`, JSON.stringify(patchJson));
    }
  }

  console.log('\nDone updating workflows!');
}

main().catch(console.error);
