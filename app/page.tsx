'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  FoodSource,
  Ingredient,
  PriceReport,
  Recipe,
  Region,
} from '@/types/foodmarket';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

const fetchJson = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    value
  );

const formatRelativeTime = (isoDate: string) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export default function Home() {
  const [deviceId, setDeviceId] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [foodSources, setFoodSources] = useState<FoodSource[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [priceReports, setPriceReports] = useState<PriceReport[]>([]);
  const [bestPrice, setBestPrice] = useState<PriceReport | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [selectedFoodSourceId, setSelectedFoodSourceId] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [plannerItems, setPlannerItems] = useState<
    { recipe: Recipe; quantity: number }[]
  >([]);
  const [plannerName, setPlannerName] = useState('Weekend Boil Plan');
  const [plannerStatus, setPlannerStatus] = useState<string | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const selectedIngredient = useMemo(
    () => ingredients.find(ingredient => ingredient.id === selectedIngredientId) || null,
    [ingredients, selectedIngredientId]
  );

  const selectedRegion = useMemo(
    () => regions.find(region => region.id === selectedRegionId) || null,
    [regions, selectedRegionId]
  );

  useEffect(() => {
    const stored = localStorage.getItem('foodmarket_device_id');
    if (stored) {
      setDeviceId(stored);
      return;
    }
    const generated = crypto.randomUUID();
    localStorage.setItem('foodmarket_device_id', generated);
    setDeviceId(generated);
  }, []);

  useEffect(() => {
    const loadBase = async () => {
      const [regionData, ingredientData] = await Promise.all([
        fetchJson<Region[]>('/api/regions'),
        fetchJson<Ingredient[]>('/api/ingredients'),
      ]);
      setRegions(regionData);
      setIngredients(ingredientData);
      if (regionData.length > 0) {
        setSelectedRegionId(regionData[0].id);
      }
      if (ingredientData.length > 0) {
        setSelectedIngredientId(ingredientData[0].id);
      }
    };

    loadBase().catch(error => {
      console.error('Failed to load base data', error);
    });
  }, []);

  const refreshFoodSources = async (regionId: number) => {
    const data = await fetchJson<FoodSource[]>(`/api/food-sources?regionId=${regionId}`);
    setFoodSources(data);
    if (data.length > 0) {
      setSelectedFoodSourceId(data[0].id);
    }
  };

  const refreshRecipes = async (ingredientId: number) => {
    const data = await fetchJson<Recipe[]>(`/api/recipes?ingredientId=${ingredientId}`);
    setRecipes(data);
    setPlannerItems(prev => prev.filter(item => item.recipe.ingredient_id === ingredientId));
  };

  const refreshPriceReports = async (regionId: number, ingredientId: number) => {
    const data = await fetchJson<PriceReport[]>(
      `/api/price-reports?regionId=${regionId}&ingredientId=${ingredientId}`
    );
    setPriceReports(data);
  };

  const refreshBestPrice = async (regionId: number, ingredientId: number) => {
    const data = await fetchJson<PriceReport | null>(
      `/api/best-price?regionId=${regionId}&ingredientId=${ingredientId}`
    );
    setBestPrice(data);
  };

  useEffect(() => {
    if (!selectedRegionId || !selectedIngredientId) return;
    refreshFoodSources(selectedRegionId).catch(error => console.error(error));
    refreshRecipes(selectedIngredientId).catch(error => console.error(error));
    refreshPriceReports(selectedRegionId, selectedIngredientId).catch(error =>
      console.error(error)
    );
    refreshBestPrice(selectedRegionId, selectedIngredientId).catch(error =>
      console.error(error)
    );
  }, [selectedRegionId, selectedIngredientId]);

  useEffect(() => {
    if (!selectedRegionId || !selectedIngredientId) return;
    const socket = new WebSocket(WS_BASE);
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (
        message.type === 'price_report_created' ||
        message.type === 'price_report_confirmed'
      ) {
        refreshPriceReports(selectedRegionId, selectedIngredientId).catch(error =>
          console.error(error)
        );
        refreshBestPrice(selectedRegionId, selectedIngredientId).catch(error =>
          console.error(error)
        );
      }
    };

    return () => socket.close();
  }, [selectedRegionId, selectedIngredientId]);

  const handleReportSubmit = async () => {
    if (!selectedRegionId || !selectedIngredientId || !selectedFoodSourceId || !deviceId) {
      return;
    }
    const priceValue = parseFloat(priceInput);
    if (isNaN(priceValue) || priceValue <= 0) {
      addToast('Please enter a valid price greater than 0.', 'error');
      return;
    }

    setIsSubmittingReport(true);
    try {
      await fetchJson('/api/price-reports', {
        method: 'POST',
        body: JSON.stringify({
          ingredient_id: selectedIngredientId,
          food_source_id: selectedFoodSourceId,
          region_id: selectedRegionId,
          price: priceValue,
          unit: selectedIngredient?.unit || 'lb',
          reported_by: deviceId,
        }),
      });

      setPriceInput('');
      setPlannerStatus(null);
      addToast('Price reported successfully!');
    } catch (error) {
      console.error(error);
      addToast('Failed to report price.', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleConfirm = async (reportId: number) => {
    if (!deviceId) return;
    try {
      await fetchJson(`/api/price-reports/${reportId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId }),
      });
      addToast('Price confirmed!');
    } catch (error) {
      console.error(error);
      addToast('Failed to confirm price.', 'error');
    }
  };

  const addRecipeToPlan = (recipe: Recipe) => {
    setPlannerItems(prev => {
      if (prev.find(item => item.recipe.id === recipe.id)) {
        return prev;
      }
      return [...prev, { recipe, quantity: recipe.servings }];
    });
    setPlannerStatus(null);
  };

  const updatePlannerQuantity = (recipeId: number, quantity: number) => {
    setPlannerItems(prev =>
      prev.map(item =>
        item.recipe.id === recipeId ? { ...item, quantity } : item
      )
    );
  };

  const removePlannerItem = (recipeId: number) => {
    setPlannerItems(prev => prev.filter(item => item.recipe.id !== recipeId));
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesSearch =
        recipe.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
        recipe.instructions.toLowerCase().includes(recipeSearch.toLowerCase());
      const matchesSpice = !selectedSpiceLevel || recipe.spice_level === selectedSpiceLevel;
      return matchesSearch && matchesSpice;
    });
  }, [recipes, recipeSearch, selectedSpiceLevel]);

  const plannerTotalCost = useMemo(() => {
    if (!bestPrice) return null;
    return plannerItems.reduce(
      (total, item) => total + item.quantity * bestPrice.price,
      0
    );
  }, [plannerItems, bestPrice]);

  const handleSavePlanner = async () => {
    if (!selectedRegionId || !deviceId || plannerItems.length === 0) return;
    const ingredientQuantities = plannerItems.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.recipe.ingredient_id] =
          (acc[item.recipe.ingredient_id] || 0) + item.quantity;
        return acc;
      },
      {}
    );
    await fetchJson('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({
        name: plannerName,
        recipe_ids: plannerItems.map(item => item.recipe.id),
        ingredient_quantities: ingredientQuantities,
        region_id: selectedRegionId,
        created_by: deviceId,
      }),
    });
    setPlannerStatus('Cook plan saved!');
    addToast('Cook plan saved!');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white relative">
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[240px] rounded-xl border px-4 py-3 shadow-2xl transition-all duration-300 animate-in slide-in-from-right ${
              toast.type === 'success'
                ? 'border-emerald-500/50 bg-slate-900 text-emerald-300'
                : 'border-rose-500/50 bg-slate-900 text-rose-300'
            }`}
          >
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">FoodMarket</p>
              <h1 className="text-3xl font-semibold">
                Crowd-powered local food pricing & recipes
              </h1>
              <p className="text-slate-300">
                Live crawfish intel for Hammond, LA — powered by your neighbors.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
              <p className="text-emerald-200">Anonymous device:</p>
              <p className="font-mono text-xs text-emerald-100 break-all">
                {deviceId || 'Loading...'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-300">Location</label>
              <select
                value={selectedRegionId ?? ''}
                onChange={event => setSelectedRegionId(Number(event.target.value))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              >
                {regions.map(region => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
              {selectedRegion && (
                <p className="text-xs text-slate-500">
                  Radius {selectedRegion.radius_km} km • Weighted by distance
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-300">Ingredient</label>
              <select
                value={selectedIngredientId ?? ''}
                onChange={event => setSelectedIngredientId(Number(event.target.value))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              >
                {ingredients.map(ingredient => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.emoji} {ingredient.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold mb-4">Best price near you</h2>
            {bestPrice ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-950/70 p-4">
                  <p className="text-sm text-slate-400">Vendor</p>
                  <p className="text-lg font-semibold">{bestPrice.food_source_name}</p>
                  <p className="text-xs text-slate-500">
                    {bestPrice.distance_km} km away
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/70 p-4">
                  <p className="text-sm text-slate-400">Price</p>
                  <p className="text-2xl font-semibold text-emerald-300">
                    {formatCurrency(bestPrice.price)} / {bestPrice.unit}
                  </p>
                  <p className="text-xs text-slate-500">Score {bestPrice.score}</p>
                </div>
                <div className="rounded-xl bg-slate-950/70 p-4">
                  <p className="text-sm text-slate-400">Confirmations</p>
                  <p className="text-2xl font-semibold">{bestPrice.confirmations}</p>
                  <p className="text-xs text-slate-500">Most-confirmed wins</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No active prices yet. Be the first to report.</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold mb-4">Live price feed</h2>
            <div className="space-y-3">
              {priceReports.map(report => (
                <div
                  key={report.id}
                  className="flex flex-col gap-3 rounded-xl bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm text-slate-400">{report.food_source_name}</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(report.price)} / {report.unit}
                    </p>
                    <p className="text-xs text-slate-500">
                      {report.distance_km} km • {formatRelativeTime(report.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-300">
                      <span className="font-semibold">{report.confirmations}</span> confirmations
                    </div>
                    <button
                      onClick={() => handleConfirm(report.id)}
                      className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
                    >
                      Confirm price
                    </button>
                  </div>
                </div>
              ))}
              {priceReports.length === 0 && (
                <p className="text-sm text-slate-400">
                  No live reports yet — submit a price below.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold mb-4">Submit a price</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300">Vendor</label>
                <select
                  value={selectedFoodSourceId ?? ''}
                  onChange={event => setSelectedFoodSourceId(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                >
                  {foodSources.map(source => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-300">Price per {selectedIngredient?.unit}</label>
                <input
                  value={priceInput}
                  onChange={event => setPriceInput(event.target.value)}
                  placeholder="4.25"
                  className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleReportSubmit}
                disabled={isSubmittingReport}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit report'}
              </button>
              <p className="text-xs text-slate-500">
                Reports expire after 48 hours. Newer reports push older ones down.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold mb-4">Cook planner</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300">Plan name</label>
                <input
                  value={plannerName}
                  onChange={event => setPlannerName(event.target.value)}
                  className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-3">
                {plannerItems.map(item => (
                  <div
                    key={item.recipe.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.recipe.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.recipe.servings} servings • {item.recipe.spice_level} spice
                        </p>
                      </div>
                      <button
                        onClick={() => removePlannerItem(item.recipe.id)}
                        className="text-xs text-rose-300 hover:text-rose-200"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <label className="text-xs text-slate-400">Quantity ({selectedIngredient?.unit})</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={event =>
                          updatePlannerQuantity(item.recipe.id, Number(event.target.value))
                        }
                        className="w-24 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                ))}
                {plannerItems.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Add recipes from the browser to build your cook plan.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-sm text-slate-400">Estimated total cost</p>
                <p className="text-2xl font-semibold text-emerald-300">
                  {plannerTotalCost ? formatCurrency(plannerTotalCost) : 'Need live price'}
                </p>
                <p className="text-xs text-slate-500">
                  Uses the current best price near you.
                </p>
              </div>
              <button
                onClick={handleSavePlanner}
                className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
              >
                Save cook plan
              </button>
              {plannerStatus && <p className="text-xs text-emerald-300">{plannerStatus}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">Recipe browser</h2>
              <p className="text-sm text-slate-400">
                Tap a recipe to add it to your cook plan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                  className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm w-64 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                {['mild', 'medium', 'hot'].map(level => (
                  <button
                    key={level}
                    onClick={() => setSelectedSpiceLevel(selectedSpiceLevel === level ? null : level)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize border transition-colors ${
                      selectedSpiceLevel === level
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map(recipe => (
              <button
                key={recipe.id}
                onClick={() => addRecipeToPlan(recipe)}
                className="text-left rounded-2xl border border-slate-800 bg-slate-950/70 p-5 hover:border-emerald-500/50"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{recipe.name}</h3>
                  <span className="text-xs text-amber-300">★ {recipe.rating.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {recipe.spice_level} spice • {recipe.servings} servings
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  {recipe.instructions}
                </p>
                <div className="mt-4 rounded-lg bg-slate-900/60 p-3 text-xs text-slate-300">
                  Best price: {bestPrice ? `${formatCurrency(bestPrice.price)} / ${bestPrice.unit}` : 'awaiting report'}
                </div>
              </button>
            ))}
            {filteredRecipes.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center col-span-full">
                {recipes.length === 0 ? 'No recipes loaded yet.' : 'No recipes match your search/filters.'}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
