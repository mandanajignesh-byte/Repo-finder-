# PWA Analytics Queries

Useful SQL queries to analyze PWA installs by device type and location.

## Device Type Analysis

**Count installs by device type:**
```sql
SELECT 
  device_info->>'deviceType' AS device_type,
  COUNT(*) AS install_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM pwa_installs
WHERE device_info->>'deviceType' IS NOT NULL
GROUP BY device_type
ORDER BY install_count DESC;
```

**Android vs iOS breakdown:**
```sql
SELECT 
  CASE 
    WHEN device_info->>'deviceType' = 'Android' THEN 'Android'
    WHEN device_info->>'deviceType' = 'iOS' THEN 'iOS'
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
  device_info->>'deviceType' AS device_type,
  COUNT(DISTINCT user_id) AS new_installs
FROM pwa_installs
WHERE device_info->>'deviceType' IS NOT NULL
GROUP BY day, device_type
ORDER BY day DESC, new_installs DESC;
```

## Location Analysis

**Installs by country:**
```sql
SELECT 
  device_info->'location'->>'country' AS country,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(*) AS total_installs
FROM pwa_installs
WHERE device_info->'location'->>'country' IS NOT NULL
GROUP BY country
ORDER BY unique_users DESC;
```

**Installs by city:**
```sql
SELECT 
  device_info->'location'->>'country' AS country,
  device_info->'location'->>'city' AS city,
  COUNT(DISTINCT user_id) AS unique_users
FROM pwa_installs
WHERE device_info->'location'->>'city' IS NOT NULL
GROUP BY country, city
ORDER BY unique_users DESC
LIMIT 50;
```

**Top countries:**
```sql
SELECT 
  device_info->'location'->>'country' AS country,
  COUNT(DISTINCT user_id) AS users
FROM pwa_installs
WHERE device_info->'location'->>'country' IS NOT NULL
GROUP BY country
ORDER BY users DESC
LIMIT 10;
```

## Combined Analysis

**Device type and country breakdown:**
```sql
SELECT 
  device_info->>'deviceType' AS device_type,
  device_info->'location'->>'country' AS country,
  COUNT(DISTINCT user_id) AS users
FROM pwa_installs
WHERE device_info->>'deviceType' IS NOT NULL
  AND device_info->'location'->>'country' IS NOT NULL
GROUP BY device_type, country
ORDER BY users DESC
LIMIT 30;
```

**Android vs iOS by country:**
```sql
SELECT 
  device_info->'location'->>'country' AS country,
  SUM(CASE WHEN device_info->>'deviceType' = 'Android' THEN 1 ELSE 0 END) AS android_users,
  SUM(CASE WHEN device_info->>'deviceType' = 'iOS' THEN 1 ELSE 0 END) AS ios_users,
  COUNT(DISTINCT user_id) AS total_users
FROM pwa_installs
WHERE device_info->>'deviceType' IN ('Android', 'iOS')
  AND device_info->'location'->>'country' IS NOT NULL
GROUP BY country
ORDER BY total_users DESC;
```

## Summary Statistics

**Complete overview:**
```sql
SELECT 
  COUNT(DISTINCT user_id) AS total_installed_users,
  COUNT(*) AS total_installs,
  COUNT(DISTINCT CASE WHEN device_info->>'deviceType' = 'Android' THEN user_id END) AS android_users,
  COUNT(DISTINCT CASE WHEN device_info->>'deviceType' = 'iOS' THEN user_id END) AS ios_users,
  COUNT(DISTINCT CASE WHEN device_info->>'deviceType' = 'Desktop' THEN user_id END) AS desktop_users,
  COUNT(DISTINCT device_info->'location'->>'country') AS countries_count,
  COUNT(DISTINCT CASE WHEN device_info->'location'->>'country' IS NOT NULL THEN user_id END) AS users_with_location
FROM pwa_installs;
```

**Location coverage:**
```sql
SELECT 
  COUNT(*) AS total_records,
  COUNT(CASE WHEN device_info->'location' IS NOT NULL THEN 1 END) AS with_location,
  COUNT(CASE WHEN device_info->'location' IS NULL THEN 1 END) AS without_location,
  ROUND(100.0 * COUNT(CASE WHEN device_info->'location' IS NOT NULL THEN 1 END) / COUNT(*), 2) AS location_coverage_percent
FROM pwa_installs;
```
