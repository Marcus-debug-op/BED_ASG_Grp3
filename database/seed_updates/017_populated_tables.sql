-- =========================================================
-- Seed Orders: 3 sample orders per stall
-- This uses existing stalls, menu items, and the first patron account.
-- =========================================================

DECLARE @SeedPatronId INT;

SELECT TOP 1 @SeedPatronId = user_id
FROM Users
WHERE role = 'patron'
ORDER BY user_id;

IF @SeedPatronId IS NULL
BEGIN
    PRINT 'No patron account found. Orders were not inserted.';
END
ELSE
BEGIN
    -- Store the orders we insert so we can link OrderItems correctly.
    DECLARE @InsertedOrders TABLE (
        order_id INT,
        stall_id INT,
        order_no INT
    );

    ;WITH StallOrderSeed AS (
        SELECT
            s.stall_id,
            order_seed.order_no,
            order_seed.order_status,
            order_seed.eco_friendly_packaging,
            order_seed.payment_method,
            order_seed.days_ago,
            mi.menu_item_id,
            mi.item_name,
            mi.price
        FROM Stalls s
        CROSS APPLY (
            SELECT TOP 1
                m.menu_item_id,
                m.item_name,
                m.price
            FROM MenuItems m
            WHERE m.stall_id = s.stall_id
            ORDER BY m.menu_item_id
        ) mi
        CROSS JOIN (
            VALUES
                (1, 'Completed', 1, 'Cash', 3),
                (2, 'Pending',   0, 'PayNow', 1),
                (3, 'Ready',     1, 'Cash', 0)
        ) order_seed(order_no, order_status, eco_friendly_packaging, payment_method, days_ago)
        WHERE s.is_active = 1
    )
    INSERT INTO Orders (
        patron_id,
        stall_id,
        promotion_id,
        order_status,
        total_amount,
        order_date,
        checkout_id,
        collection_method,
        delivery_address,
        postal_code,
        delivery_charge,
        payment_method,
        eco_friendly_packaging
    )
    OUTPUT
        INSERTED.order_id,
        INSERTED.stall_id,
        CAST(RIGHT(INSERTED.checkout_id, 1) AS INT)
    INTO @InsertedOrders (order_id, stall_id, order_no)
    SELECT
        @SeedPatronId,
        stall_id,
        NULL,
        order_status,
        price + CASE WHEN eco_friendly_packaging = 1 THEN 0.20 ELSE 0.00 END,
        DATEADD(DAY, -days_ago, GETDATE()),
        CONCAT('SEED-', stall_id, '-', order_no),
        'Pickup',
        NULL,
        NULL,
        0.00,
        payment_method,
        eco_friendly_packaging
    FROM StallOrderSeed;

    -- =========================================================
    -- Seed OrderItems
    -- Each inserted order gets one item from that stall.
    -- =========================================================

    INSERT INTO OrderItems (
        order_id,
        menu_item_id,
        quantity,
        unit_price,
        subtotal,
        item_name
    )
    SELECT
        io.order_id,
        mi.menu_item_id,
        1,
        mi.price,
        mi.price,
        mi.item_name
    FROM @InsertedOrders io
    CROSS APPLY (
        SELECT TOP 1
            m.menu_item_id,
            m.item_name,
            m.price
        FROM MenuItems m
        WHERE m.stall_id = io.stall_id
        ORDER BY m.menu_item_id
    ) mi;
END;
GO



UPDATE Orders
SET 
    checkout_id = 'SEED-OLD-1',
    collection_method = 'Pickup',
    delivery_address = NULL,
    postal_code = NULL,
    delivery_charge = 0.00,
    payment_method = 'Cash',
    eco_friendly_packaging = 1
WHERE order_id = 1;
GO

UPDATE Orders
SET 
    checkout_id = 'SEED-OLD-1',
    collection_method = 'Pickup',
    delivery_address = NULL,
    postal_code = NULL,
    delivery_charge = 0.00,
    payment_method = 'Cash',
    eco_friendly_packaging = 1
WHERE order_id = 1;
GO

-- =========================================================
-- Seed MenuItemCuisines
-- Links menu items to cuisine categories.
-- This helps with cuisine filtering/searching.
-- =========================================================

INSERT INTO MenuItemCuisines (menu_item_id, cuisine_id)
SELECT 
    mi.menu_item_id,
    c.cuisine_id
FROM MenuItems mi
INNER JOIN Stalls s
    ON mi.stall_id = s.stall_id
INNER JOIN Cuisines c
    ON s.cuisine_id = c.cuisine_id
WHERE NOT EXISTS (
    SELECT 1
    FROM MenuItemCuisines mic
    WHERE mic.menu_item_id = mi.menu_item_id
      AND mic.cuisine_id = c.cuisine_id
);
GO

-- =========================================================
-- Seed UserLikesMenuItem
-- Sample likes from patron users to menu items.
-- This helps test the menu item like/favourite feature.
-- =========================================================

INSERT INTO UserLikesMenuItem (user_id, menu_item_id)
SELECT 
    u.user_id,
    mi.menu_item_id
FROM Users u
CROSS APPLY (
    SELECT TOP 3 menu_item_id
    FROM MenuItems
    ORDER BY menu_item_id
) mi
WHERE u.role = 'patron'
  AND NOT EXISTS (
      SELECT 1
      FROM UserLikesMenuItem ul
      WHERE ul.user_id = u.user_id
        AND ul.menu_item_id = mi.menu_item_id
  );
GO

-- =========================================================
-- Seed Feedbacks
-- Sample feedback records from patron users to stalls.
-- =========================================================

INSERT INTO Feedbacks (
    patron_id,
    stall_id,
    rating,
    comment,
    created_at,
    photo_path
)
SELECT
    u.user_id,
    s.stall_id,
    feedback_seed.rating,
    feedback_seed.comment,
    DATEADD(DAY, -feedback_seed.days_ago, GETDATE()),
    feedback_seed.photo_path
FROM Stalls s
CROSS APPLY (
    SELECT TOP 1 user_id
    FROM Users
    WHERE role = 'patron'
    ORDER BY user_id
) u
CROSS JOIN (
    VALUES
        (5, 'Food was fresh and tasty. Service was also fast.', 5, NULL),
        (4, 'Good portion size and reasonable price.', 3, NULL),
        (3, 'Taste was okay, but waiting time could be improved.', 1, NULL)
) feedback_seed(rating, comment, days_ago, photo_path)
WHERE s.is_active = 1;
GO

-- =========================================================
-- Seed SavedAddresses
-- Sample saved delivery addresses for patron users.
-- =========================================================

INSERT INTO SavedAddresses (
    patron_id,
    address,
    postal_code,
    contact_name,
    contact_phone,
    created_at
)
SELECT
    u.user_id,
    address_seed.address,
    address_seed.postal_code,
    u.full_name,
    address_seed.contact_phone,
    GETDATE()
FROM Users u
CROSS JOIN (
    VALUES
        ('123 Sample Street #05-01', '123456', '91234567'),
        ('456 Test Avenue #08-12', '234567', '92345678'),
        ('789 Demo Road #10-03', '345678', '93456789')
) address_seed(address, postal_code, contact_phone)
WHERE u.role = 'patron';
GO


-- =========================================================
-- Seed RentalAgreements
-- Sample lease/rental agreements for stalls.
-- =========================================================

INSERT INTO RentalAgreements (
    stall_id,
    lease_start_date,
    lease_end_date,
    monthly_rent,
    agreement_status,
    created_at,
    is_accepted,
    acceptance_timestamp
)
SELECT
    s.stall_id,
    DATEADD(MONTH, -1, CAST(GETDATE() AS DATE)),
    DATEADD(MONTH, 11, CAST(GETDATE() AS DATE)),
    CASE 
        WHEN s.stall_id % 3 = 0 THEN 1800.00
        WHEN s.stall_id % 3 = 1 THEN 1500.00
        ELSE 1650.00
    END,
    CASE 
        WHEN s.stall_id % 3 = 0 THEN 'Expired'
        WHEN s.stall_id % 3 = 1 THEN 'Active'
        ELSE 'Terminated'
    END,
    GETDATE(),
    CASE 
        WHEN s.stall_id % 2 = 0 THEN 1
        ELSE 0
    END,
    CASE 
        WHEN s.stall_id % 2 = 0 THEN GETDATE()
        ELSE NULL
    END
FROM Stalls s
WHERE s.is_active = 1;
GO


-- =========================================================
-- Seed Inspections
-- Sample NEA inspection records for stalls.
-- Includes Scheduled, Completed, and Cancelled inspections.
-- =========================================================

DECLARE @OfficerId INT;

SELECT TOP 1 @OfficerId = user_id
FROM Users
WHERE role = 'officer'
ORDER BY user_id;

IF @OfficerId IS NULL
BEGIN
    PRINT 'No officer account found. Inspections were not inserted.';
END
ELSE
BEGIN
    INSERT INTO Inspections (
        stall_id,
        officer_id,
        inspection_date,
        hygiene_grade,
        remarks,
        inspection_status,
        score,
        result,
        completed_at
    )
    SELECT
        s.stall_id,
        @OfficerId,

        -- Different inspection dates for testing
        CASE 
            WHEN s.stall_id % 3 = 0 THEN DATEADD(DAY, 7, GETDATE())
            WHEN s.stall_id % 3 = 1 THEN DATEADD(DAY, -5, GETDATE())
            ELSE DATEADD(DAY, -2, GETDATE())
        END,

        -- Only completed inspections should have hygiene grade
        CASE 
            WHEN s.stall_id % 3 = 0 THEN NULL
            WHEN s.stall_id % 3 = 1 THEN 'A'
            ELSE 'B'
        END,

        CASE 
            WHEN s.stall_id % 3 = 0 THEN 'Inspection has been scheduled and is waiting to be completed.'
            WHEN s.stall_id % 3 = 1 THEN 'Stall is clean and food preparation area is well maintained.'
            ELSE 'Stall is generally clean but minor improvements are needed.'
        END,

        CASE 
            WHEN s.stall_id % 3 = 0 THEN 'Scheduled'
            WHEN s.stall_id % 3 = 1 THEN 'Completed'
            ELSE 'Completed'
        END,

        -- Only completed inspections should have score
        CASE 
            WHEN s.stall_id % 3 = 0 THEN NULL
            WHEN s.stall_id % 3 = 1 THEN 92
            ELSE 78
        END,

        -- Only completed inspections should have result
        CASE 
            WHEN s.stall_id % 3 = 0 THEN NULL
            WHEN s.stall_id % 3 = 1 THEN 'Pass'
            ELSE 'Needs Follow-up'
        END,

        -- Only completed inspections should have completed_at
        CASE 
            WHEN s.stall_id % 3 = 0 THEN NULL
            ELSE GETDATE()
        END
    FROM Stalls s
    WHERE s.is_active = 1;
END;
GO

-- =========================================================
-- Sync latest completed inspection grade to Stalls table
-- This makes hygiene grade appear on stall/vendor/patron pages.
-- =========================================================

UPDATE s
SET s.current_hygiene_grade = latest.hygiene_grade
FROM Stalls s
INNER JOIN (
    SELECT 
        i.stall_id,
        i.hygiene_grade,
        ROW_NUMBER() OVER (
            PARTITION BY i.stall_id 
            ORDER BY i.completed_at DESC, i.inspection_id DESC
        ) AS rn
    FROM Inspections i
    WHERE i.inspection_status = 'Completed'
      AND i.hygiene_grade IS NOT NULL
) latest
    ON s.stall_id = latest.stall_id
WHERE latest.rn = 1;
GO