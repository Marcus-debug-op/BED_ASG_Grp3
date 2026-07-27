-- 1. Add the column
ALTER TABLE stalls ADD cuisine_id INT NULL;

-- 2. Populate it by matching cuisine_type to cuisine_name
UPDATE s
SET s.cuisine_id = c.cuisine_id
FROM stalls s
JOIN cuisines c ON s.cuisine_type = c.cuisine_name;

-- 3. Check nothing was missed
SELECT * FROM stalls WHERE cuisine_id IS NULL;

-- 4. Add the foreign key constraint
ALTER TABLE stalls
ADD CONSTRAINT FK_stalls_cuisines
FOREIGN KEY (cuisine_id) REFERENCES cuisines(cuisine_id);