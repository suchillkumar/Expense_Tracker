# Expense Tracker — AI-Powered Smart Personal Finance

A production-ready **AI-Powered Personal Expense Tracker & Budget Management Web Application** designed with clean SaaS aesthetics, real-time financial analytics, 50/30/20 budget automation, and Google Gemini AI financial intelligence.

---

## 🌟 Key Features

- **📊 Modern FinTech Dashboard**: Real-time KPI summaries (Total Income, Total Expenses, Net Balance, Savings Rate), Month-over-Month comparison, interactive Weekly/Monthly/Yearly cashflow bar charts, and category donut breakdowns.
- **💸 Full Transaction Management**: Complete CRUD operations for Income and Expenses with auto-categorization, search, date-range filters, and multi-field sorting.
- **🎯 Intelligent Budget Planner**: Monthly and yearly category spending caps with live percentage progress tracking and 50/30/20 rule generator.
- **🤖 AI Financial Assistant**: Contextual financial chat assistant powered by Google Gemini AI, spending anomaly detection, linear expense forecasting, and personalized savings recommendations.
- **📑 Financial Reports & Statements**: Monthly and yearly statement summaries with instant CSV export and print-ready format.
- **🌓 Dual Theme Architecture**: 1-click switcher between **Light Mode (Pure White)** and **Dark Mode (FinTech Navy)**.
- **🔒 Authentication & Security**: JWT-based session security, profile management with multi-currency selection, and password reset flows.

---

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons, Vite
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT, Zod Validation
- **AI Engine**: Google Gemini API (`gemini-3.6-flash`) with local fallback intelligence
- **Automation**: n8n Workflow integration

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (running locally on port `27017` or MongoDB Atlas URI)

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Open in Browser
Visit [http://localhost:5173](http://localhost:5173) to start managing your expenses!
