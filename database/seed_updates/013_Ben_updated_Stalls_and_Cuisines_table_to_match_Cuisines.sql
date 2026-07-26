UPDATE stalls
SET cuisine_type = TRIM(REPLACE(cuisine_type, ' Cuisine', ''));

DELETE FROM cuisines
WHERE cuisine_name NOT IN (SELECT DISTINCT cuisine_type FROM stalls);

INSERT INTO cuisines (cuisine_name)
SELECT DISTINCT cuisine_type
FROM stalls
WHERE cuisine_type NOT IN (SELECT cuisine_name FROM cuisines);