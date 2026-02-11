# PWA Analytics Queries (With Dedicated Columns)

Simplified queries using dedicated `device_type`, `country`, and `city` columns.

## Device Type Analysis

**Count installs by device type:**
```sql
SELECT 
  device_type,
  COUNT(*) AS install_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM pwa_installs
WHERE device_type IS NOT NULL
GROUP BY device_type
ORDER BY install_count DESC;
```

**Android vs iOS breakdown:**
```sql
SELECT 
  CASE 
    WHEN device_type = 'Android' THEN 'Android'
    WHEN device_type = 'iOS' THEN 'iOS'
    ELSE 'Other'
  END AS platform,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(*) AS total_installs
FROM pwa_installs
GROUP BY platform
ORDER BY unique_users DESC;
```

**Device type over time:**
```sql
SELECT 
  DATE(first_opened_at) AS day,
  device_type,
  COUNT(DISTINCT user_id) AS new_installs
FROM pwa_installs
WHERE device_type IS NOT NULL
GROUP BY day, device_type
ORDER BY day DESC, new_installs DESC;
```

## Location Analysis

**Installs by country:**
```sql
SELECT 
  country,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(*) AS total_installs
FROM pwa_installs
WHERE country IS NOT NULL
GROUP BY country
ORDER BY unique_users DESC;
```

**Installs by city:**
```sql
SELECT 
  country,
  city,
  COUNT(DISTINCT user_id) AS unique_users
FROM pwa_installs
WHERE city IS NOT NULL
GROUP BY country, city
ORDER BY unique_users DESC
LIMIT 50;
```

**Top countries:**
```sql
SELECT 
  country,
  COUNT(DISTINCT user_id) AS users
FROM pwa_installs
WHERE country IS NOT NULL
GROUP BY country
ORDER BY users DESC
LIMIT 10;
```

## Combined Analysis

**Device type and country breakdown:**
```sql
SELECT 
  device_type,
  country,
  COUNT(DISTINCT user_id) AS users
FROM pwa_installs
WHERE device_type IS NOT NULL
  AND country IS NOT NULL
GROUP BY device_type, country
ORDER BY users DESC
LIMIT 30;
```

**Android vs iOS by country:**
```sql
SELECT 
  country,
  SUM(CASE WHEN device_type = 'Android' THEN 1 ELSE 0 END) AS android_users,
  SUM(CASE WHEN device_type = 'iOS' THEN 1 ELSE 0 END) AS ios_users,
  COUNT(DISTINCT user_id) AS total_users
FROM pwa_installs
WHERE device_type IN ('Android', 'iOS')
  AND country IS NOT NULL
GROUP BY country
ORDER BY total_users DESC;
```

## Summary Statistics

**Complete overview:**
```sql
SELECT 
  COUNT(DISTINCT user_id) AS total_installed_users,
  COUNT(*) AS total_installs,
  COUNT(DISTINCT CASE WHEN device_type = 'Android' THEN user_id END) AS android_users,
  COUNT(DISTINCT CASE WHEN device_type = 'iOS' THEN user_id END) AS ios_users,
  COUNT(DISTINCT CASE WHEN device_type = 'Desktop' THEN user_id END) AS desktop_users,
  COUNT(DISTINCT country) AS countries_count,
  COUNT(DISTINCT CASE WHEN country IS NOT NULL THEN user_id END) AS users_with_location
FROM pwa_installs;
```

**Location coverage:**
```sql
SELECT 
  COUNT(*) AS total_records,
  COUNT(CASE WHEN country IS NOT NULL THEN 1 END) AS with_location,
  COUNT(CASE WHEN country IS NULL THEN 1 END) AS without_location,
  ROUND(100.0 * COUNT(CASE WHEN country IS NOT NULL THEN 1 END) / COUNT(*), 2) AS location_coverage_percent
FROM pwa_installs;
```

**Device type distribution:**
```sql
SELECT 
  device_type,
  COUNT(DISTINCT user_id) AS users,
  ROUND(100.0 * COUNT(DISTINCT user_id) / NULLIF((SELECT COUNT(DISTINCT user_id) FROM pwa_installs), 0), 2) AS percentage
FROM pwa_installs
WHERE device_type IS NOT NULL
GROUP BY device_type
ORDER BY users DESC;
```
