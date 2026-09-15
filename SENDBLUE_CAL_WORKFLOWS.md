# Cal.com + Sendblue (iMessage) Internal Workflow System

> **Zero Third-Party Dependencies:** 100% internal workflows running on Next.js API routes with Cal.com and Sendblue (`api.sendblue.co`). No Zapier, no external middleman.

---

## 1. The Short & Punchy Messages

All messages are strictly 1–2 short lines, human-sounding, direct, and free of marketing fluff.

| Timing | Step Key | Exact Message Text |
| :--- | :--- | :--- |
| **At Booking (T0)** | `direct` | `Hey {{name}}, your Strategy Call is booked for {{time}}. Reply YES to confirm your spot on desktop.` |
| **On "YES" Reply** | `yes_ack` | `Locked in! See you on desktop at {{time}}.` |
| **24h Before** | `h24` | `Hey {{name}}, quick reminder our call is tomorrow at {{time}}. Please make sure you join from a computer.` |
| **6h Before** | `h6` | `Hey {{name}}, our call is in 6 hours ({{time}}). If you can't make it, please let me know here.` |
| **1h Before** | `h1` | `Hey {{name}}, we're on in 1 hour ({{time}}). Here's your link: {{meeting_link}}` |
| **5m Before** | `m5` | `Hey {{name}}, hopping on in 5 mins! Link: {{meeting_link}}` |
| **1m Before** | `m1` | `I'm in the room! Join here: {{meeting_link}}` |

---

## 2. Internal Architecture

```
[Cal.com Booking Created]
         │
         ├──> POST /api/webhooks/cal
         │         ├── 1. Saves/Updates Lead in Airtable
         │         └── 2. Dispatches "direct" iMessage via Sendblue asking for "YES"
         │
[Prospect Replies "YES"]
         │
         └──> POST /api/webhooks/sendblue
                   ├── 1. Updates Airtable: Show-up Status = 'Confirmed'
                   └── 2. Dispatches "yes_ack" iMessage: "Locked in! See you on desktop."

[Cal.com Workflows Reminders: H-24, H-6, H-1, M-5, M-1]
         │
         └──> POST /api/webhooks/cal/reminder?step={h24|h6|h1|m5|m1}
                   └── Dispatches short iMessage via Sendblue
```

---

## 3. Cal.com Workflows Setup (`cal.com/workflows`)

To trigger the scheduled reminders directly from Cal.com without any third-party app:

1. Go to **Cal.com** > **Workflows**.
2. Click **Create Workflow** for each reminder step:

### Reminder 1: H-24
- **Trigger:** *24 hours before event starts*
- **Action:** *Send webhook*
- **Subscriber URL:** `https://your-domain.com/api/webhooks/cal/reminder?step=h24`

### Reminder 2: H-6
- **Trigger:** *6 hours before event starts*
- **Action:** *Send webhook*
- **Subscriber URL:** `https://your-domain.com/api/webhooks/cal/reminder?step=h6`

### Reminder 3: H-1
- **Trigger:** *1 hour before event starts*
- **Action:** *Send webhook*
- **Subscriber URL:** `https://your-domain.com/api/webhooks/cal/reminder?step=h1`

### Reminder 4: M-5
- **Trigger:** *5 minutes before event starts*
- **Action:** *Send webhook*
- **Subscriber URL:** `https://your-domain.com/api/webhooks/cal/reminder?step=m5`

### Reminder 5: M-1
- **Trigger:** *1 minute before event starts* (or closest available custom interval)
- **Action:** *Send webhook*
- **Subscriber URL:** `https://your-domain.com/api/webhooks/cal/reminder?step=m1`

> **Note:** If a booking is cancelled or rejected, the endpoint automatically checks `status` and aborts sending so no message is dispatched.

---

## 4. Inbound "YES" Webhook Configuration

To receive replies when prospects text back "YES":

Register your webhook in Sendblue pointing to your server:
```bash
sendblue webhooks add https://your-domain.com/api/webhooks/sendblue --type receive
```

When Sendblue receives an incoming message:
1. It validates whether the response contains "YES".
2. It sets `Show-up Status: Confirmed` in Airtable on the prospect's record.
3. It replies automatically with `Locked in! See you on desktop at {{time}}.`.

---

## 5. Sendblue CLI Quick Reference (`@sendblue/cli`)

Reference: [https://www.sendblue.com/cli](https://www.sendblue.com/cli)

```bash
# 1. Install CLI
npm install -g @sendblue/cli

# 2. Setup or login
sendblue setup
# or: sendblue login

# 3. View API keys (SENDBLUE_API_KEY, SENDBLUE_API_SECRET)
sendblue show-keys

# 4. Test sending a blue message from your terminal
sendblue send +14155552671 "Hey John, testing internal Sendblue dispatch"

# 5. List configured webhooks
sendblue webhooks list
```

---

## 6. Required Environment Variables

Ensure these exist in `.env.local` / Vercel:

```env
SENDBLUE_API_KEY=your_sendblue_api_key_id
SENDBLUE_API_SECRET=your_sendblue_api_secret_key
```
