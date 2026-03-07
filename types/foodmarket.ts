export interface Ingredient {
  id: number;
  name: string;
  emoji: string;
  unit: string;
}

export interface Region {
  id: number;
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
}

export interface FoodSource {
  id: number;
  name: string;
  region_id: number;
  lat: number;
  lng: number;
}

export interface PriceReport {
  id: number;
  ingredient_id: number;
  food_source_id: number;
  region_id: number;
  price: number;
  unit: string;
  reported_by: string;
  created_at: string;
  confirmations: number;
  status: string;
  food_source_name: string;
  distance_km: number;
  score?: number;
  image_data?: string | null;
}

export interface Recipe {
  id: number;
  name: string;
  ingredient_id: number;
  instructions: string;
  spice_level: string;
  servings: number;
  rating: number;
}

export interface Playlist {
  id: number;
  name: string;
  recipe_ids: string;
  ingredient_quantities: string;
  region_id: number;
  created_by: string;
  created_at: string;
}
