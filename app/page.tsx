'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  FoodSource,
  Ingredient,
  PriceReport,
  Recipe,
  Region,
} from '@/types/foodmarket';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

// ===========================================
// TYPES
// ===========================================

interface DashboardData {
  foodSources: FoodSource[];
  recipes: Recipe[];
  priceReports: PriceReportWithTrust[];
  bestPrice: PriceReportWithTrust | null;
  region: Region;
}

interface PriceReportWithTrust extends PriceReport {
  reporter_trust_level?: string;
}

interface DeviceReputation {
  device_id: string;
  total_reports: number;
  confirmed_reports: number;
  disputed_reports: number;
  total_confirmations_given: number;
  accuracy_score: number;
  trust_level: string;
}

// ===========================================
// UTILITIES
// ===========================================

const fetchJson = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }
  return response.json();
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatRelativeTime = (isoDate: string) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Trust level badge component
const TrustBadge = ({ level }: { level?: string }) => {
  const badges: Record<string, { color: string; label: string }> = {
    new: { color: 'bg-slate-600', label: 'New' },
    bronze: { color: 'bg-amber-700', label: 'Bronze' },
    silver: { color: 'bg-slate-400', label: 'Silver' },
    gold: { color: 'bg-yellow-500', label: 'Gold' },
    platinum: { color: 'bg-cyan-400', label: 'Platinum' },
  };
  const badge = badges[level || 'new'] || badges.new;
  return (
    <span className={`${badge.color} text-xs px-2 py-0.5 rounded-full text-white font-medium`}>
      {badge.label}
    </span>
  );
};

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
        type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
      } text-white max-w-md`}
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          &times;
        </button>
      </div>
    </div>
  );
};

export default function Home() {
  // ===========================================
  // STATE
  // ===========================================
  const [deviceId, setDeviceId] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [foodSources, setFoodSources] = useState<FoodSource[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [priceReports, setPriceReports] = useState<PriceReportWithTrust[]>([]);
  const [bestPrice, setBestPrice] = useState<PriceReportWithTrust | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [selectedFoodSourceId, setSelectedFoodSourceId] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [plannerItems, setPlannerItems] = useState<{ recipe: Recipe; quantity: number }[]>([]);
  const [plannerName, setPlannerName] = useState('Weekend Boil Plan');
  const [plannerStatus, setPlannerStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reputation, setReputation] = useState<DeviceReputation | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Debounced values for API calls
  const debouncedRegionId = useDebounce(selectedRegionId, 300);
  const debouncedIngredientId = useDebounce(selectedIngredientId, 300);

  // ===========================================
  // COMPUTED VALUES
  // ===========================================
  const selectedIngredient = useMemo(
    () => ingredients.find(ingredient => ingredient.id === selectedIngredientId) || null,
    [ingredients, selectedIngredientId]
  );

  const selectedRegion = useMemo(
    () => regions.find(region => region.id === selectedRegionId) || null,
    [regions, selectedRegionId]
  );

  const plannerTotalCost = useMemo(() => {
    if (!bestPrice) return null;
    return plannerItems.reduce((total, item) => total + item.quantity * bestPrice.price, 0);
  }, [plannerItems, bestPrice]);

  // ===========================================
  // EFFECTS
  // ===========================================

  // Initialize device ID
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

  // Load initial data (regions & ingredients)
  useEffect(() => {
    const loadBase = async () => {
      const [regionData, ingredientData] = await Promise.all([
        fetchJson<Region[]>('/api/regions'),
        fetchJson<Ingredient[]>('/api/ingredients'),
      ]);
      setRegions(regionData);
      setIngredients(ingredientData);
      if (regionData.length > 0) setSelectedRegionId(regionData[0].id);
      if (ingredientData.length > 0) setSelectedIngredientId(ingredientData[0].id);
    };
    loadBase().catch(error => {
      console.error('Failed to load base data', error);
      setToast({ message: 'Failed to load initial data', type: 'error' });
    });
  }, []);

  // Fetch reputation
  useEffect(() => {
    if (!deviceId) return;
    fetchJson<DeviceReputation>(`/api/reputation/${deviceId}`)
      .then(setReputation)
      .catch(console.error);
  }, [deviceId]);

  // ===========================================
  // BATCH DASHBOARD FETCH (with debouncing)
  // ===========================================
  const refreshDashboard = useCallback(async (regionId: number, ingredientId: number) => {
    setIsLoading(true);
    try {
      const data = await fetchJson<DashboardData>(
        `/api/dashboard?regionId=${regionId}&ingredientId=${ingredientId}`
      );
      setFoodSources(data.foodSources);
      setRecipes(data.recipes);
      setPriceReports(data.priceReports);
      setBestPrice(data.bestPrice);
      if (data.foodSources.length > 0 && !selectedFoodSourceId) {
        setSelectedFoodSourceId(data.foodSources[0].id);
      }
      // Filter planner items to current ingredient
      setPlannerItems(prev => prev.filter(item => item.recipe.ingredient_id === ingredientId));
    } catch (error) {
      console.error('Failed to load dashboard', error);
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFoodSourceId]);

  // Trigger dashboard refresh when debounced values change
  useEffect(() => {
    if (!debouncedRegionId || !debouncedIngredientId) return;
    refreshDashboard(debouncedRegionId, debouncedIngredientId);
  }, [debouncedRegionId, debouncedIngredientId, refreshDashboard]);

  // ===========================================
  // WEBSOCKET WITH SUBSCRIPTIONS & RECONNECT
  // ===========================================
  const connectWebSocket = useCallback(() => {
    if (!debouncedRegionId || !debouncedIngredientId) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const socket = new WebSocket(WS_BASE);
    wsRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptsRef.current = 0;
      // Subscribe to specific region/ingredient channel
      socket.send(JSON.stringify({
        type: 'subscribe',
        regionId: debouncedRegionId,
        ingredientId: debouncedIngredientId,
      }));
    };

    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'price_report_created' || message.type === 'price_report_confirmed') {
          // Optimistic update: add/update the report in local state
          if (message.type === 'price_report_created') {
            setPriceReports(prev => [message.payload, ...prev]);
          } else {
            setPriceReports(prev =>
              prev.map(r => (r.id === message.payload.id ? message.payload : r))
            );
          }
          // Refresh best price calculation
          refreshDashboard(debouncedRegionId, debouncedIngredientId);
        } else if (message.type === 'price_report_disputed') {
          // Remove disputed report
          setPriceReports(prev => prev.filter(r => r.id !== message.payload.id));
          refreshDashboard(debouncedRegionId, debouncedIngredientId);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    socket.onclose = () => {
      // Exponential backoff reconnect
      const attempts = reconnectAttemptsRef.current;
      if (attempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connectWebSocket();
        }, delay);
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [debouncedRegionId, debouncedIngredientId, refreshDashboard]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket]);

  // ===========================================
  // HANDLERS
  // ===========================================

  const handleReportSubmit = async () => {
    if (!selectedRegionId || !selectedIngredientId || !selectedFoodSourceId || !deviceId) return;
    const priceValue = Number(priceInput);
    if (!priceValue) {
      setToast({ message: 'Please enter a valid price', type: 'error' });
      return;
    }

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
      setToast({ message: 'Price reported successfully!', type: 'success' });
      // Refresh reputation
      fetchJson<DeviceReputation>(`/api/reputation/${deviceId}`).then(setReputation);
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleConfirm = async (reportId: number) => {
    if (!deviceId) return;
    try {
      await fetchJson(`/api/price-reports/${reportId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId }),
      });
      setToast({ message: 'Price confirmed!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleDispute = async (reportId: number) => {
    if (!deviceId) return;
    try {
      const result = await fetchJson<{ disputes: number }>(`/api/price-reports/${reportId}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId, reason: 'Price seems incorrect' }),
      });
      setToast({ message: `Reported (${result.disputes}/3 disputes)`, type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const addRecipeToPlan = (recipe: Recipe) => {
    setPlannerItems(prev => {
      if (prev.find(item => item.recipe.id === recipe.id)) return prev;
      return [...prev, { recipe, quantity: recipe.servings }];
    });
    setPlannerStatus(null);
  };

  const updatePlannerQuantity = (recipeId: number, quantity: number) => {
    setPlannerItems(prev =>
      prev.map(item => (item.recipe.id === recipeId ? { ...item, quantity } : item))
    );
  };

  const removePlannerItem = (recipeId: number) => {
    setPlannerItems(prev => prev.filter(item => item.recipe.id !== recipeId));
  };

  const handleSavePlanner = async () => {
    if (!selectedRegionId || !deviceId || plannerItems.length === 0) return;
    const ingredientQuantities = plannerItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.recipe.ingredient_id] = (acc[item.recipe.ingredient_id] || 0) + item.quantity;
      return acc;
    }, {});
    try {
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
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">FoodMarket</p>
              <h1 className="text-3xl font-semibold">Crowd-powered local food pricing & recipes</h1>
              <p className="text-slate-300">
                Live crawfish intel for Hammond, LA — powered by your neighbors.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <p className="text-emerald-200">Your reputation:</p>
                {reputation && <TrustBadge level={reputation.trust_level} />}
              </div>
              <p className="font-mono text-xs text-emerald-100 break-all mt-1">
                {deviceId ? `${deviceId.slice(0, 8)}...` : 'Loading...'}
              </p>
              {reputation && (
                <p className="text-xs text-emerald-300/70 mt-1">
                  {reputation.total_reports} reports | {reputation.confirmed_reports} confirmed
                </p>
              )}
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
                  Radius {selectedRegion.radius_km} km | Weighted by distance
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

          {/* Loading indicator */}
          {isLoading && (
            <div className="text-center text-sm text-emerald-400">Loading...</div>
          )}
        </div>
      </header>

      {/* Main content */}
      <section className="max-w-6xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          {/* Best price card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold mb-4">Best price near you</h2>
            {bestPrice ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-950/70 p-4">
                  <p className="text-sm text-slate-400">Vendor</p>
                  <p className="text-lg font-semibold">{bestPrice.food_source_name}</p>
                  <p className="text-xs text-slate-500">{bestPrice.distance_km} km away</p>
                </div>
                <div className="rounded-xl bg-slate-950/70 p-4">
                  <p className="text-sm text-slate-400">Price</p>
                  <p className="text-2xl font-semibold text-emerald-300">
                    {formatCurrency(bestPrice.price)} / {bestPrice.unit}
                  </p>
                  <p className="text-xs text-slate-500">Score {bestPrice.score}</p>
                </div>
                <div className="rounded-xl bg-slate-950/70 p-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-400">Reporter</p>
                    <TrustBadge level={bestPrice.reporter_trust_level} />
                  </div>
                  <p className="text-2xl font-semibold">{bestPrice.confirmations}</p>
                  <p className="text-xs text-slate-500">confirmations</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No active prices yet. Be the first to report.</p>
            )}
          </div>

          {/* Live price feed */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold mb-4">Live price feed</h2>
            <div className="space-y-3">
              {priceReports.map(report => (
                <div
                  key={report.id}
                  className="flex flex-col gap-3 rounded-xl bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-slate-400">{report.food_source_name}</p>
                      <TrustBadge level={report.reporter_trust_level} />
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(report.price)} / {report.unit}
                    </p>
                    <p className="text-xs text-slate-500">
                      {report.distance_km} km | {formatRelativeTime(report.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-300">
                      <span className="font-semibold">{report.confirmations}</span> confirms
                    </div>
                    <button
                      onClick={() => handleConfirm(report.id)}
                      className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleDispute(report.id)}
                      className="rounded-lg border border-red-400/60 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30"
                    >
                      Flag
                    </button>
                  </div>
                </div>
              ))}
              {priceReports.length === 0 && (
                <p className="text-sm text-slate-400">No live reports yet — submit a price below.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          {/* Submit price form */}
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
                <label className="text-sm text-slate-300">
                  Price per {selectedIngredient?.unit} ($0.50 - $50.00)
                </label>
                <input
                  value={priceInput}
                  onChange={event => setPriceInput(event.target.value)}
                  placeholder="4.25"
                  type="number"
                  min="0.50"
                  max="50"
                  step="0.01"
                  className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleReportSubmit}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Submit report
              </button>
              <p className="text-xs text-slate-500">
                Reports expire after 48h. Max 5 reports/hour. Your reputation affects price ranking.
              </p>
            </div>
          </div>

          {/* Cook planner */}
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
                          {item.recipe.servings} servings | {item.recipe.spice_level} spice
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
                      <label className="text-xs text-slate-400">
                        Quantity ({selectedIngredient?.unit})
                      </label>
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
                <p className="text-xs text-slate-500">Uses the current best price near you.</p>
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

      {/* Recipe browser */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-semibold">Recipe browser</h2>
            <p className="text-sm text-slate-400">Tap a recipe to add it to your cook plan.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map(recipe => (
              <button
                key={recipe.id}
                onClick={() => addRecipeToPlan(recipe)}
                className="text-left rounded-2xl border border-slate-800 bg-slate-950/70 p-5 hover:border-emerald-500/50"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{recipe.name}</h3>
                  <span className="text-xs text-amber-300">* {recipe.rating.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {recipe.spice_level} spice | {recipe.servings} servings
                </p>
                <p className="mt-3 text-sm text-slate-300">{recipe.instructions}</p>
                <div className="mt-4 rounded-lg bg-slate-900/60 p-3 text-xs text-slate-300">
                  Best price:{' '}
                  {bestPrice
                    ? `${formatCurrency(bestPrice.price)} / ${bestPrice.unit}`
                    : 'awaiting report'}
                </div>
              </button>
            ))}
            {recipes.length === 0 && (
              <p className="text-sm text-slate-400">No recipes loaded yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
