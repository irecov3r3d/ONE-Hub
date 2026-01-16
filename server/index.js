const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const db = require('./db');

const app = express();

// ===========================================
// CONFIGURATION
// ===========================================
const config = {
  // Price validation bounds (per unit)
  price: {
    min: 0.50,
    max: 50.00,
  },
  // Rate limiting
  rateLimit: {
    maxReportsPerHour: 5,
    maxConfirmationsPerHour: 20,
    confirmationCooldownMinutes: 2, // minutes between confirming same report
  },
  // Trust levels
  trustLevels: {
    new: { minReports: 0, minAccuracy: 0 },
    bronze: { minReports: 3, minAccuracy: 0.5 },
    silver: { minReports: 10, minAccuracy: 0.65 },
    gold: { minReports: 25, minAccuracy: 0.8 },
    platinum: { minReports: 50, minAccuracy: 0.9 },
  },
  // CORS whitelist (empty = allow all in dev)
  corsWhitelist: process.env.CORS_WHITELIST
    ? process.env.CORS_WHITELIST.split(',')
    : [],
};

// ===========================================
// CORS CONFIGURATION
// ===========================================
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // In production, check whitelist
    if (config.corsWhitelist.length > 0) {
      if (config.corsWhitelist.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
    // In dev, allow all
    return callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ===========================================
// WEBSOCKET SUBSCRIPTION MANAGEMENT
// ===========================================
const clientSubscriptions = new Map(); // WebSocket -> { regionId, ingredientId }

wss.on('connection', ws => {
  // Initialize with no subscription
  clientSubscriptions.set(ws, null);

  ws.on('message', data => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'subscribe') {
        const { regionId, ingredientId } = message;
        clientSubscriptions.set(ws, { regionId, ingredientId });
        ws.send(JSON.stringify({ type: 'subscribed', regionId, ingredientId }));
      } else if (message.type === 'unsubscribe') {
        clientSubscriptions.set(ws, null);
        ws.send(JSON.stringify({ type: 'unsubscribed' }));
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    clientSubscriptions.delete(ws);
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: 'connected', message: 'Send subscribe with regionId and ingredientId' }));
});

// Targeted broadcast - only to clients subscribed to the region/ingredient
const broadcastToSubscribers = (regionId, ingredientId, message) => {
  const payload = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState !== WebSocket.OPEN) return;
    const sub = clientSubscriptions.get(client);
    if (sub && sub.regionId === regionId && sub.ingredientId === ingredientId) {
      client.send(payload);
    }
  });
};

// Broadcast to all (for system messages)
const broadcastAll = message => {
  const payload = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

const expireOldReports = () => {
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString();
  db.prepare(
    'UPDATE price_reports SET status = "expired" WHERE status = "active" AND created_at < ?'
  ).run(cutoff);
};

const cleanOldRateLimits = () => {
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(); // 2 hours
  db.prepare('DELETE FROM rate_limits WHERE created_at < ?').run(cutoff);
};

const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const toRad = value => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const getRegion = regionId =>
  db.prepare('SELECT * FROM regions WHERE id = ?').get(regionId);

const baseReportQuery = `
  SELECT pr.*, fs.name as food_source_name, fs.lat as food_source_lat, fs.lng as food_source_lng
  FROM price_reports pr
  JOIN food_sources fs ON fs.id = pr.food_source_id
  WHERE pr.status = 'active'
    AND pr.region_id = ?
    AND pr.ingredient_id = ?
  ORDER BY pr.created_at DESC
`;

// ===========================================
// RATE LIMITING
// ===========================================

const checkRateLimit = (deviceId, actionType, maxPerHour) => {
  const hourAgo = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  const count = db
    .prepare(
      'SELECT COUNT(*) as count FROM rate_limits WHERE device_id = ? AND action_type = ? AND created_at > ?'
    )
    .get(deviceId, actionType, hourAgo).count;
  return count < maxPerHour;
};

const recordAction = (deviceId, actionType) => {
  db.prepare(
    'INSERT INTO rate_limits (device_id, action_type, created_at) VALUES (?, ?, ?)'
  ).run(deviceId, actionType, new Date().toISOString());
};

// ===========================================
// PRICE VALIDATION
// ===========================================

const validatePrice = price => {
  const numPrice = Number(price);
  if (isNaN(numPrice)) {
    return { valid: false, error: 'Price must be a number' };
  }
  if (numPrice < config.price.min) {
    return { valid: false, error: `Price must be at least $${config.price.min}` };
  }
  if (numPrice > config.price.max) {
    return { valid: false, error: `Price must be at most $${config.price.max}` };
  }
  return { valid: true, price: numPrice };
};

// ===========================================
// REPUTATION SYSTEM
// ===========================================

const getOrCreateReputation = deviceId => {
  let rep = db.prepare('SELECT * FROM device_reputation WHERE device_id = ?').get(deviceId);
  if (!rep) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO device_reputation
        (device_id, total_reports, confirmed_reports, disputed_reports, total_confirmations_given, accuracy_score, trust_level, created_at, updated_at)
       VALUES (?, 0, 0, 0, 0, 0.5, 'new', ?, ?)`
    ).run(deviceId, now, now);
    rep = db.prepare('SELECT * FROM device_reputation WHERE device_id = ?').get(deviceId);
  }
  return rep;
};

const calculateTrustLevel = (totalReports, accuracyScore) => {
  if (totalReports >= config.trustLevels.platinum.minReports && accuracyScore >= config.trustLevels.platinum.minAccuracy) {
    return 'platinum';
  }
  if (totalReports >= config.trustLevels.gold.minReports && accuracyScore >= config.trustLevels.gold.minAccuracy) {
    return 'gold';
  }
  if (totalReports >= config.trustLevels.silver.minReports && accuracyScore >= config.trustLevels.silver.minAccuracy) {
    return 'silver';
  }
  if (totalReports >= config.trustLevels.bronze.minReports && accuracyScore >= config.trustLevels.bronze.minAccuracy) {
    return 'bronze';
  }
  return 'new';
};

const updateReputationForReport = deviceId => {
  const rep = getOrCreateReputation(deviceId);
  const newTotal = rep.total_reports + 1;
  const accuracy = rep.confirmed_reports / Math.max(newTotal, 1);
  const trustLevel = calculateTrustLevel(newTotal, accuracy);

  db.prepare(
    `UPDATE device_reputation
     SET total_reports = ?, accuracy_score = ?, trust_level = ?, updated_at = ?
     WHERE device_id = ?`
  ).run(newTotal, accuracy, trustLevel, new Date().toISOString(), deviceId);
};

const updateReputationForConfirmation = (reporterDeviceId, confirmerDeviceId) => {
  // Update reporter's confirmed count
  const reporterRep = getOrCreateReputation(reporterDeviceId);
  const newConfirmed = reporterRep.confirmed_reports + 1;
  const accuracy = newConfirmed / Math.max(reporterRep.total_reports, 1);
  const trustLevel = calculateTrustLevel(reporterRep.total_reports, accuracy);

  db.prepare(
    `UPDATE device_reputation
     SET confirmed_reports = ?, accuracy_score = ?, trust_level = ?, updated_at = ?
     WHERE device_id = ?`
  ).run(newConfirmed, accuracy, trustLevel, new Date().toISOString(), reporterDeviceId);

  // Update confirmer's confirmation count
  const confirmerRep = getOrCreateReputation(confirmerDeviceId);
  db.prepare(
    `UPDATE device_reputation
     SET total_confirmations_given = total_confirmations_given + 1, updated_at = ?
     WHERE device_id = ?`
  ).run(new Date().toISOString(), confirmerDeviceId);
};

const getReputationWeight = deviceId => {
  const rep = getOrCreateReputation(deviceId);
  // Weight multiplier based on trust level
  const weights = { new: 1.0, bronze: 1.2, silver: 1.5, gold: 2.0, platinum: 2.5 };
  return weights[rep.trust_level] || 1.0;
};

// ===========================================
// API ROUTES
// ===========================================

app.get('/api/ingredients', (_req, res) => {
  const ingredients = db.prepare('SELECT * FROM ingredients ORDER BY name').all();
  res.json(ingredients);
});

app.get('/api/regions', (_req, res) => {
  const regions = db.prepare('SELECT * FROM regions ORDER BY name').all();
  res.json(regions);
});

app.get('/api/food-sources', (req, res) => {
  const regionId = Number(req.query.regionId);
  if (!regionId) {
    return res.status(400).json({ error: 'regionId is required' });
  }
  const sources = db
    .prepare('SELECT * FROM food_sources WHERE region_id = ? ORDER BY name')
    .all(regionId);
  return res.json(sources);
});

app.get('/api/recipes', (req, res) => {
  const ingredientId = Number(req.query.ingredientId);
  if (!ingredientId) {
    return res.status(400).json({ error: 'ingredientId is required' });
  }
  const recipes = db
    .prepare('SELECT * FROM recipes WHERE ingredient_id = ? ORDER BY rating DESC')
    .all(ingredientId);
  return res.json(recipes);
});

app.get('/api/price-reports', (req, res) => {
  const ingredientId = Number(req.query.ingredientId);
  const regionId = Number(req.query.regionId);
  if (!ingredientId || !regionId) {
    return res.status(400).json({ error: 'ingredientId and regionId are required' });
  }
  expireOldReports();
  const region = getRegion(regionId);
  const reports = db.prepare(baseReportQuery).all(regionId, ingredientId);
  const enriched = reports.map(report => {
    const distanceKm = haversineDistance(
      region.lat,
      region.lng,
      report.food_source_lat,
      report.food_source_lng
    );
    const rep = getOrCreateReputation(report.reported_by);
    return {
      ...report,
      distance_km: Number(distanceKm.toFixed(2)),
      reporter_trust_level: rep.trust_level,
    };
  });
  return res.json(enriched);
});

app.get('/api/best-price', (req, res) => {
  const ingredientId = Number(req.query.ingredientId);
  const regionId = Number(req.query.regionId);
  if (!ingredientId || !regionId) {
    return res.status(400).json({ error: 'ingredientId and regionId are required' });
  }
  expireOldReports();
  const region = getRegion(regionId);
  if (!region) {
    return res.status(404).json({ error: 'Region not found' });
  }
  const reports = db.prepare(baseReportQuery).all(regionId, ingredientId);
  if (!reports.length) {
    return res.json(null);
  }

  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  reports.forEach(report => {
    const distanceKm = haversineDistance(
      region.lat,
      region.lng,
      report.food_source_lat,
      report.food_source_lng
    );
    const distanceWeight = 1 + distanceKm / Math.max(region.radius_km, 1);
    // Factor in reputation weight of reporter
    const reputationWeight = getReputationWeight(report.reported_by);
    const confirmationWeight = (1 + report.confirmations) * reputationWeight;
    const score = (report.price * distanceWeight) / confirmationWeight;

    if (score < bestScore) {
      bestScore = score;
      const rep = getOrCreateReputation(report.reported_by);
      best = {
        ...report,
        distance_km: Number(distanceKm.toFixed(2)),
        score: Number(score.toFixed(3)),
        reporter_trust_level: rep.trust_level,
      };
    }
  });

  return res.json(best);
});

// ===========================================
// BATCH DASHBOARD ENDPOINT
// ===========================================

app.get('/api/dashboard', (req, res) => {
  const ingredientId = Number(req.query.ingredientId);
  const regionId = Number(req.query.regionId);

  if (!ingredientId || !regionId) {
    return res.status(400).json({ error: 'ingredientId and regionId are required' });
  }

  expireOldReports();
  cleanOldRateLimits();

  const region = getRegion(regionId);
  if (!region) {
    return res.status(404).json({ error: 'Region not found' });
  }

  // Fetch all data in parallel (using synchronous better-sqlite3)
  const foodSources = db
    .prepare('SELECT * FROM food_sources WHERE region_id = ? ORDER BY name')
    .all(regionId);

  const recipes = db
    .prepare('SELECT * FROM recipes WHERE ingredient_id = ? ORDER BY rating DESC')
    .all(ingredientId);

  const reports = db.prepare(baseReportQuery).all(regionId, ingredientId);

  // Enrich reports with distance and trust
  const enrichedReports = reports.map(report => {
    const distanceKm = haversineDistance(
      region.lat,
      region.lng,
      report.food_source_lat,
      report.food_source_lng
    );
    const rep = getOrCreateReputation(report.reported_by);
    return {
      ...report,
      distance_km: Number(distanceKm.toFixed(2)),
      reporter_trust_level: rep.trust_level,
    };
  });

  // Calculate best price
  let bestPrice = null;
  let bestScore = Number.POSITIVE_INFINITY;

  reports.forEach(report => {
    const distanceKm = haversineDistance(
      region.lat,
      region.lng,
      report.food_source_lat,
      report.food_source_lng
    );
    const distanceWeight = 1 + distanceKm / Math.max(region.radius_km, 1);
    const reputationWeight = getReputationWeight(report.reported_by);
    const confirmationWeight = (1 + report.confirmations) * reputationWeight;
    const score = (report.price * distanceWeight) / confirmationWeight;

    if (score < bestScore) {
      bestScore = score;
      const rep = getOrCreateReputation(report.reported_by);
      bestPrice = {
        ...report,
        distance_km: Number(distanceKm.toFixed(2)),
        score: Number(score.toFixed(3)),
        reporter_trust_level: rep.trust_level,
      };
    }
  });

  return res.json({
    foodSources,
    recipes,
    priceReports: enrichedReports,
    bestPrice,
    region,
  });
});

// ===========================================
// PRICE REPORT SUBMISSION (with validation & rate limiting)
// ===========================================

app.post('/api/price-reports', (req, res) => {
  const { ingredient_id, food_source_id, region_id, price, unit, reported_by } = req.body;

  // Validate required fields
  if (!ingredient_id || !food_source_id || !region_id || price === undefined || !unit || !reported_by) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate price bounds
  const priceValidation = validatePrice(price);
  if (!priceValidation.valid) {
    return res.status(400).json({ error: priceValidation.error });
  }

  // Check rate limit
  if (!checkRateLimit(reported_by, 'report', config.rateLimit.maxReportsPerHour)) {
    return res.status(429).json({
      error: `Rate limit exceeded. Max ${config.rateLimit.maxReportsPerHour} reports per hour.`
    });
  }

  // Record the action for rate limiting
  recordAction(reported_by, 'report');

  const createdAt = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO price_reports
      (ingredient_id, food_source_id, region_id, price, unit, reported_by, created_at, confirmations, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = insert.run(
    ingredient_id,
    food_source_id,
    region_id,
    priceValidation.price,
    unit,
    reported_by,
    createdAt,
    0,
    'active'
  );

  // Update reputation
  updateReputationForReport(reported_by);

  const report = db
    .prepare(
      `SELECT pr.*, fs.name as food_source_name, fs.lat as food_source_lat, fs.lng as food_source_lng
       FROM price_reports pr
       JOIN food_sources fs ON fs.id = pr.food_source_id
       WHERE pr.id = ?`
    )
    .get(result.lastInsertRowid);

  const rep = getOrCreateReputation(reported_by);
  const enrichedReport = { ...report, reporter_trust_level: rep.trust_level };

  // Broadcast to subscribed clients only
  broadcastToSubscribers(region_id, ingredient_id, {
    type: 'price_report_created',
    payload: enrichedReport
  });

  return res.status(201).json(enrichedReport);
});

// ===========================================
// PRICE CONFIRMATION (with rate limiting & reputation)
// ===========================================

app.post('/api/price-reports/:id/confirm', (req, res) => {
  const reportId = Number(req.params.id);
  const { device_id } = req.body;

  if (!reportId || !device_id) {
    return res.status(400).json({ error: 'reportId and device_id are required' });
  }

  const report = db.prepare('SELECT * FROM price_reports WHERE id = ?').get(reportId);
  if (!report || report.status !== 'active') {
    return res.status(404).json({ error: 'Report not found or expired' });
  }

  // Prevent self-confirmation
  if (report.reported_by === device_id) {
    return res.status(400).json({ error: 'Cannot confirm your own report' });
  }

  // Check if already confirmed by this device
  const exists = db
    .prepare(
      'SELECT created_at FROM price_report_confirmations WHERE report_id = ? AND device_id = ?'
    )
    .get(reportId, device_id);

  if (exists) {
    // Check cooldown for re-confirmation
    const lastConfirmTime = new Date(exists.created_at).getTime();
    const cooldownMs = config.rateLimit.confirmationCooldownMinutes * 60 * 1000;
    if (Date.now() - lastConfirmTime < cooldownMs) {
      return res.status(429).json({
        error: `Please wait ${config.rateLimit.confirmationCooldownMinutes} minutes between confirmations.`
      });
    }
    // Already confirmed, just return current count
    return res.status(200).json({ confirmations: report.confirmations, already_confirmed: true });
  }

  // Check rate limit
  if (!checkRateLimit(device_id, 'confirm', config.rateLimit.maxConfirmationsPerHour)) {
    return res.status(429).json({
      error: `Rate limit exceeded. Max ${config.rateLimit.maxConfirmationsPerHour} confirmations per hour.`
    });
  }

  // Record the action
  recordAction(device_id, 'confirm');

  const insertConfirmation = db.prepare(
    'INSERT INTO price_report_confirmations (report_id, device_id, created_at) VALUES (?, ?, ?)'
  );
  const updateReport = db.prepare(
    'UPDATE price_reports SET confirmations = confirmations + 1 WHERE id = ?'
  );

  const transaction = db.transaction(() => {
    insertConfirmation.run(reportId, device_id, new Date().toISOString());
    updateReport.run(reportId);
  });

  transaction();

  // Update reputation for both parties
  updateReputationForConfirmation(report.reported_by, device_id);

  const updated = db
    .prepare(
      `SELECT pr.*, fs.name as food_source_name, fs.lat as food_source_lat, fs.lng as food_source_lng
       FROM price_reports pr
       JOIN food_sources fs ON fs.id = pr.food_source_id
       WHERE pr.id = ?`
    )
    .get(reportId);

  const rep = getOrCreateReputation(updated.reported_by);
  const enrichedReport = { ...updated, reporter_trust_level: rep.trust_level };

  // Broadcast to subscribed clients
  broadcastToSubscribers(report.region_id, report.ingredient_id, {
    type: 'price_report_confirmed',
    payload: enrichedReport
  });

  return res.json({ confirmations: updated.confirmations });
});

// ===========================================
// DISPUTE/FLAG A PRICE REPORT
// ===========================================

app.post('/api/price-reports/:id/dispute', (req, res) => {
  const reportId = Number(req.params.id);
  const { device_id, reason } = req.body;

  if (!reportId || !device_id) {
    return res.status(400).json({ error: 'reportId and device_id are required' });
  }

  const report = db.prepare('SELECT * FROM price_reports WHERE id = ?').get(reportId);
  if (!report || report.status !== 'active') {
    return res.status(404).json({ error: 'Report not found or expired' });
  }

  // Prevent self-dispute
  if (report.reported_by === device_id) {
    return res.status(400).json({ error: 'Cannot dispute your own report' });
  }

  // Check if already disputed
  const exists = db
    .prepare('SELECT 1 FROM price_report_disputes WHERE report_id = ? AND device_id = ?')
    .get(reportId, device_id);

  if (exists) {
    return res.status(200).json({ message: 'Already disputed' });
  }

  // Insert dispute
  db.prepare(
    'INSERT INTO price_report_disputes (report_id, device_id, reason, created_at) VALUES (?, ?, ?, ?)'
  ).run(reportId, device_id, reason || 'Price seems incorrect', new Date().toISOString());

  // Count disputes
  const disputeCount = db
    .prepare('SELECT COUNT(*) as count FROM price_report_disputes WHERE report_id = ?')
    .get(reportId).count;

  // If 3+ disputes, mark report as disputed and update reporter reputation
  if (disputeCount >= 3) {
    db.prepare('UPDATE price_reports SET status = "disputed" WHERE id = ?').run(reportId);

    // Update reporter's disputed count
    const rep = getOrCreateReputation(report.reported_by);
    const newDisputed = rep.disputed_reports + 1;
    const accuracy = rep.confirmed_reports / Math.max(rep.total_reports, 1);
    const penalizedAccuracy = Math.max(0, accuracy - 0.1); // Penalty for disputed
    const trustLevel = calculateTrustLevel(rep.total_reports, penalizedAccuracy);

    db.prepare(
      `UPDATE device_reputation
       SET disputed_reports = ?, accuracy_score = ?, trust_level = ?, updated_at = ?
       WHERE device_id = ?`
    ).run(newDisputed, penalizedAccuracy, trustLevel, new Date().toISOString(), report.reported_by);

    // Broadcast removal
    broadcastToSubscribers(report.region_id, report.ingredient_id, {
      type: 'price_report_disputed',
      payload: { id: reportId },
    });
  }

  return res.json({ disputes: disputeCount });
});

// ===========================================
// REPUTATION ENDPOINT
// ===========================================

app.get('/api/reputation/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const rep = getOrCreateReputation(deviceId);
  return res.json(rep);
});

// ===========================================
// PLAYLISTS
// ===========================================

app.post('/api/playlists', (req, res) => {
  const { name, recipe_ids, ingredient_quantities, region_id, created_by } = req.body;
  if (!name || !recipe_ids || !ingredient_quantities || !region_id || !created_by) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = db
    .prepare(
      'INSERT INTO playlists (name, recipe_ids, ingredient_quantities, region_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      name,
      JSON.stringify(recipe_ids),
      JSON.stringify(ingredient_quantities),
      region_id,
      created_by,
      new Date().toISOString()
    );

  const playlist = db
    .prepare('SELECT * FROM playlists WHERE id = ?')
    .get(result.lastInsertRowid);

  return res.status(201).json(playlist);
});

app.get('/api/playlists', (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }
  const playlists = db
    .prepare('SELECT * FROM playlists WHERE created_by = ? ORDER BY created_at DESC')
    .all(deviceId);
  return res.json(playlists);
});

// ===========================================
// HEALTH CHECK
// ===========================================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===========================================
// SERVER STARTUP
// ===========================================

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`FoodMarket API running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`Price validation: $${config.price.min} - $${config.price.max}`);
  console.log(`Rate limits: ${config.rateLimit.maxReportsPerHour} reports/hr, ${config.rateLimit.maxConfirmationsPerHour} confirms/hr`);
});
