USE HawkerDB;
GO
 
-- BED-231: save checkout details with each order.
-- checkout_id links all the per-stall orders created from one checkout,
-- so the order history can group them into a single combined receipt.
ALTER TABLE Orders
ADD
    checkout_id VARCHAR(30) NULL,          -- groups the per-stall orders of one checkout
    collection_method VARCHAR(20) NULL,    -- 'Pickup' or 'Delivery'
    delivery_address VARCHAR(255) NULL,    -- NULL when Pickup
    postal_code VARCHAR(6) NULL,           -- NULL when Pickup
    delivery_charge DECIMAL(10,2) NULL,    -- NULL when Pickup; the delivery fee
    payment_method VARCHAR(20) NULL;       -- 'card', 'nets', or 'cash'
GO

-- Snapshot the dish name onto each order item so a past receipt still shows
-- the name as it was when the order was placed, even if the stall renames it.
ALTER TABLE OrderItems
ADD item_name VARCHAR(100) NULL;
GO