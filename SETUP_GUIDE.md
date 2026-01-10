# 🚀 FoodMarket Setup Guide

This guide walks you through running the FoodMarket MVP locally.

## ✅ Prerequisites

- Node.js 18+
- npm

## 🛠️ Install Dependencies

```bash
npm install
```

## ▶️ Run the App (Frontend + Backend)

```bash
npm run dev
```

- Frontend: http://localhost:3000
- API + WebSocket: http://localhost:4000

## 🔁 Run Services Separately

```bash
npm run dev:server
npm run dev:client
```

## 🗃️ Database

The SQLite database is auto-created at:

```
server/data/foodmarket.db
```

It is seeded with Hammond, LA + Crawfish data on first start.

## 🧪 Quick Test

1. Open the app at http://localhost:3000
2. Submit a new price report
3. Confirm a report and watch confirmations update live
4. Add a recipe to the cook planner and save the plan

You're ready to build on FoodMarket.
