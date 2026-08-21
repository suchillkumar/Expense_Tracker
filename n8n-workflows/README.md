# ⚡ n8n Workflow Automation Engine for Expense Tracker

This directory contains production-ready **n8n workflow JSON definitions** and Docker setup to orchestrate financial automations for the Expense Tracker application.

---

## 📁 Included Workflows

| # | Workflow Name | Filename | Description |
|---|---|---|---|
| 01 | **New Transaction Automation** | `01-new-transaction-automation.json` | Auto-categorizes transactions, checks for spending anomalies, dispatches alerts. |
| 02 | **Budget Threshold Alert** | `02-budget-threshold-alert.json` | Monitors budget utilization (80% warning / 100% critical) and dispatches notifications. |
| 03 | **Bill Payment Reminder** | `03-bill-payment-reminder.json` | Scheduled daily scanner for upcoming bills due in 7, 3, 1, or 0 days. |
| 04 | **Smart Budget Rebalancing** | `04-smart-budget-rebalancing.json` | Detects category surpluses/deficits and formulates AI recommendations. |
| 05 | **Bank Statement Import** | `05-bank-statement-import.json` | Normalizes, deduplicates, and ingests batch transactions from uploaded statements. |
| 06 | **Debt Payment Reminder** | `06-debt-payment-reminder.json` | Tracks debt deadlines, overdue balances, and minimum payment alerts. |
| 07 | **Anomaly Response Workflow** | `07-anomaly-response.json` | Analyzes anomaly severity with ratio comparisons and creates actionable confirm/ignore cards. |
| 08 | **AI Financial Insight** | `08-ai-financial-insight.json` | Synthesizes 30-day velocity, top categories, and financial momentum tips. |
| 09 | **Notification Dispatcher** | `09-notification-dispatcher.json` | Multi-channel delivery engine (In-App, Email, Voice) with anti-spam deduplication. |

---

## 🚀 Quick Start with Docker

To start n8n locally:

```bash
cd n8n-workflows
docker-compose -f docker-compose.n8n.yml up -d
```

1. Open your browser and navigate to **[http://localhost:5678](http://localhost:5678)**.
2. Complete the one-time initial n8n owner setup.
3. In n8n, click **Workflows > Import from File** and import each of the `.json` files in this folder.
4. Click **Activate Workflow** (toggle at the top-right of each workflow).

---

## 🔐 Webhook Authentication & Security

All webhook interactions between the Expense Tracker Backend (`http://localhost:3001`) and n8n are secured using:
- **`X-Webhook-Secret`**: Matching shared secret key (`N8N_WEBHOOK_SECRET` in `.env`).
- **`X-N8N-Signature`**: HMAC SHA-256 digital signature of the payload.

### Inbound Callback URL
When n8n completes a workflow or creates a notification, it calls:
```text
POST http://localhost:3001/api/automations/webhooks/inbound
Headers:
  X-Webhook-Secret: n8n_expense_tracker_secret_key_2026
  Content-Type: application/json
```

---

## 🛡️ Built-in Offline Fallback

If n8n is offline or unreachable, the Expense Tracker backend **automatically falls back to its local rule & AI engines**. Operations like adding transactions or viewing budgets will **never fail or hang**.
