# 🦞 FoodMarket MVP

FoodMarket is a crowd-powered local food price + recipe app. This MVP focuses on crawfish pricing in Hammond, LA, but the data model and UI are ingredient-agnostic.
This repository now only contains the FoodMarket web app and backend service.

## ✅ MVP Features

- **Best price near you** based on distance weighting and confirmations
- **Submit price reports** with vendor + ingredient + price
- **Confirm reports** to boost trusted prices
- **Live feed** of reports (WebSocket updates)
- **Recipe browser** with ratings and live price callouts
- **Cook planner** (playlist) with total cost using live prices
- **Anonymous auth** via device IDs stored in localStorage

## 🧱 Tech Stack

- **Frontend**: Next.js (React) + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Realtime**: WebSockets (ws)

## 📦 Database Schema

The SQLite database lives at `server/data/foodmarket.db` and is initialized on server start.

```
Ingredient
  id, name, emoji, unit

Region
  id, name, lat, lng, radius_km

FoodSource
  id, name, region_id, lat, lng

PriceReport
  id
  ingredient_id
  food_source_id
  region_id
  price
  unit
  reported_by
  created_at
  confirmations
  status

PriceReportConfirmation
  id
  report_id
  device_id
  created_at

Recipe
  id
  name
  ingredient_id
  instructions
  spice_level
  servings
  rating

Playlist (Cook Plan)
  id
  name
  recipe_ids
  ingredient_quantities
  region_id
  created_by
  created_at
```

## 🔌 Backend API

Base URL: `http://localhost:4000`

- `GET /api/ingredients`
- `GET /api/regions`
- `GET /api/food-sources?regionId=1`
- `GET /api/recipes?ingredientId=1`
- `GET /api/price-reports?regionId=1&ingredientId=1`
- `GET /api/best-price?regionId=1&ingredientId=1`
- `POST /api/price-reports`
- `POST /api/price-reports/:id/confirm`
- `POST /api/playlists`

## 🗺️ Seed Data

On first start, the database seeds:
- Region: **Hammond, LA**
- Ingredient: **Crawfish 🦞**
- 3 local food sources
- 3 crawfish recipes
- 3 active price reports

## 🚀 Run Instructions

Install dependencies and start both the API and frontend:

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- API + WebSocket: `http://localhost:4000`

To run them separately:

```bash
npm run dev:server
npm run dev:client
```

## ✅ Core Rules Implemented

- Prices expire after 48 hours
- Most-confirmed wins (score weight)
- New reports push old ones down (feed sorted by newest)
- Distance weighting applied in best-price scoring
- “Best price near you” shown on the home screen

---

Built for real-time, community-powered food pricing.
