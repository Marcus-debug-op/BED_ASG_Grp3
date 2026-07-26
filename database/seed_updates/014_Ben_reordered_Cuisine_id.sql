-- 1. Save the cuisine names into a temp table, in the order you want
SELECT cuisine_name INTO #temp_cuisines
FROM cuisines
ORDER BY cuisine_name;

-- 2. Delete all rows (works even with FK references, since table is empty)
DELETE FROM cuisines;

-- 3. Reset the identity counter back to 0, so next insert starts at 1
DBCC CHECKIDENT ('cuisines', RESEED, 0);

-- 4. Re-insert in order — cuisine_id will auto-generate as 1, 2, 3...
INSERT INTO cuisines (cuisine_name)
SELECT cuisine_name FROM #temp_cuisines ORDER BY cuisine_name;

DROP TABLE #temp_cuisines;