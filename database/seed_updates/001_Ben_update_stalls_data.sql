-- Update Lao Ban Soya Beancurd
UPDATE Stalls
SET 
    operating_hours = '07:00 AM - 09:00 PM',
    price_range = '$1.50 - $2.50',
    phone_number = '81234567',
    image_url = 'img/Lao Ban Soya Beancurd.jpg'
WHERE stall_name = 'Lao Ban Soya Beancurd';
GO

-- Update Laksa Legend
UPDATE Stalls
SET 
    operating_hours = '09:00 AM - 08:00 PM',
    price_range = '$5.00 - $7.00',
    phone_number = '98765432',
    image_url = 'img/Laksa Legend.jpg'
WHERE stall_name = 'Laksa Legend';
GO

-- Nasi Lemak Galore
UPDATE Stalls
SET 
    vendor_id = '3',
    description = 'Start your day right with our fragrant coconut rice, served with crispy fried chicken wings, crunchy ikan bilis, roasted peanuts.',
    operating_hours = '07:00 AM - 08:00 PM',
    price_range = '$3.00 - $5.50',
    phone_number = '64567890',
    image_url = 'img/Nasi Lemak Galore.jpg'
WHERE stall_name = 'Nasi Lemak Galore';
GO