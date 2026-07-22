USE HawkerDB;

INSERT INTO Stalls (vendor_id, stall_name, cuisine_type, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
-- Vendor 10 (Ahmad)
(10, 'Sugar Cane Oasis', 'Drinks', 'Freshly pressed sugar cane juice to beat the heat.', '#01-30', 1, 1, '08:00 AM - 10:00 PM', '$1.50 - $3.00', '91234501', ''),
(10, 'Aunties Kopi & Teh', 'Drinks', 'Traditional Nanyang coffee and tea brewed to perfection.', '#01-31', 1, 1, '06:00 AM - 08:00 PM', '$1.20 - $2.50', '91234502', ''),

-- Vendor 11 (Shirley)
(11, 'Cool Dessert Haven', 'Dessert', 'Refreshing local shaved ice desserts and more.', '#01-32', 1, 2, '11:00 AM - 10:00 PM', '$2.00 - $4.00', '91234503', ''),
(11, 'Ah Mas Tang Yuan', 'Dessert', 'Handmade glutinous rice balls in sweet warm soup.', '#01-33', 1, 2, '12:00 PM - 11:00 PM', '$2.50 - $4.50', '91234504', ''),

-- Vendor 12 (Muthu)
(12, 'Fresh Fruit Juices', 'Drinks', '100% freshly blended tropical fruit juices.', '#01-34', 1, 1, '09:00 AM - 10:00 PM', '$2.00 - $4.00', '91234505', ''),
(12, 'Mango Sago Sweet', 'Dessert', 'Specialty mango desserts and rich durian mousse.', '#01-35', 1, 3, '12:00 PM - 11:00 PM', '$3.00 - $6.00', '91234506', ''),

-- Vendor 13 (Nurul)
(13, 'Soya Bean Delights', 'Drinks', 'Smooth soya bean milk and crispy youtiao.', '#01-36', 1, 1, '06:00 AM - 09:00 PM', '$1.50 - $3.00', '91234507', ''),
(13, 'Bubble Tea Stop', 'Drinks', 'Modern bubble tea with chewy brown sugar pearls.', '#01-37', 1, 2, '11:00 AM - 10:00 PM', '$3.00 - $5.50', '91234508', ''),

-- Vendor 14 (David)
(14, 'Hainanese Curry Rice', 'Chinese Cuisine', 'Messy but delicious curry rice topped with crispy pork.', '#01-38', 1, 1, '10:00 AM - 09:00 PM', '$4.00 - $6.00', '91234509', ''),
(14, 'Al-Ameen Murtabak', 'Indian Cuisine', 'Thick, pan-fried stuffed folded omelette pancake.', '#01-39', 1, 2, '24 Hours', '$6.00 - $12.00', '91234510', ''),

-- Vendor 15 (Siti)
(15, 'Xin Tian Di Roast Meat', 'Chinese Cuisine', 'Caramelized char siew and crispy roast pork belly.', '#02-01', 1, 3, '10:00 AM - 08:00 PM', '$4.50 - $8.00', '91234511', ''),
(15, 'Goreng Pisang Crispy', 'Snacks', 'Piping hot deep-fried banana and tapioca fritters.', '#02-02', 1, 1, '11:00 AM - 07:00 PM', '$1.00 - $3.00', '91234512', ''),

-- Vendor 16 (Ramesh)
(16, 'Marina BBQ Seafood', 'Seafood', 'Signature sambal stingray grilled perfectly on banana leaf.', '#02-03', 1, 2, '05:00 PM - 12:00 AM', '$12.00 - $30.00', '91234513', ''),
(16, 'Uncle Oyster Omelette', 'Chinese Cuisine', 'Crispy and fluffy Orh Luak with plump oysters.', '#02-04', 1, 3, '04:00 PM - 11:00 PM', '$5.00 - $10.00', '91234514', ''),

-- Vendor 17 (Faridah)
(17, 'Western Grill Station', 'Western', 'Old-school sizzling hotplate chops and cutlets.', '#02-05', 1, 1, '11:00 AM - 10:00 PM', '$6.00 - $15.00', '91234515', ''),
(17, 'Ban Mian Tradition', 'Chinese Cuisine', 'Handmade noodles in rich ikan bilis broth.', '#02-06', 1, 2, '09:00 AM - 09:00 PM', '$4.00 - $6.00', '91234516', ''),

-- Vendor 18 (Suresh)
(18, 'Healthy Yong Tau Foo', 'Chinese Cuisine', 'Pick your own fresh vegetables and stuffed tofu.', '#02-07', 1, 1, '08:00 AM - 08:00 PM', '$4.00 - $7.00', '91234517', ''),

-- Vendor 19 (Grace)
(19, 'MacPherson Bak Chor Mee', 'Chinese Cuisine', 'Springy noodles tossed in vinegar and chili with minced pork.', '#02-08', 1, 3, '07:00 AM - 02:00 PM', '$4.50 - $6.50', '91234518', ''),

-- Vendor 20 (Faizal)
(20, 'Popiah & Kueh Pie Tee', 'Snacks', 'Freshly wrapped popiah with crunchy turnip filling.', '#02-09', 1, 1, '10:00 AM - 08:00 PM', '$2.00 - $5.00', '91234519', ''),

-- Vendor 21 (Joanne)
(21, 'Nasi Padang Corner', 'Malay Cuisine', 'Richly spiced dishes like beef rendang and ayam merah.', '#02-10', 1, 2, '10:00 AM - 07:00 PM', '$5.00 - $10.00', '91234520', '');