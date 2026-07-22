USE HawkerDB;

INSERT INTO MenuItems (stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
-- ==========================================
-- ORIGINAL STALLS (IDs 3 to 5)
-- ==========================================
-- Stall 3: Nasi Lemak Galore
(3, 'Chicken Wing Nasi Lemak', 'Crispy chicken wing with fragrant coconut rice and sambal.', 4.50, 'Main Course', '', 1, GETDATE(), 420),
(3, 'Fish Fillet Nasi Lemak', 'Fried fish fillet with coconut rice and peanuts.', 4.00, 'Main Course', '', 1, GETDATE(), 310),
(3, 'Otah Nasi Lemak', 'Spicy grilled fish paste otah with coconut rice.', 4.00, 'Main Course', '', 1, GETDATE(), 350),

-- Stall 4: Ah Seng Chicken Rice
(4, 'Steamed Chicken Rice', 'Classic Hainanese steamed chicken with fragrant rice.', 4.50, 'Main Course', '', 1, GETDATE(), 600),
(4, 'Roasted Chicken Rice', 'Tender roasted chicken with savory soy sauce.', 4.50, 'Main Course', '', 1, GETDATE(), 580),
(4, 'Oyster Sauce Vegetables', 'Blanched leafy greens topped with oyster sauce.', 3.00, 'Side Dish', '', 1, GETDATE(), 200),

-- Stall 5: Mee Rebus Master
(5, 'Mee Rebus Special', 'Yellow noodles in rich and sweet potato gravy.', 4.00, 'Main Course', '', 1, GETDATE(), 450),
(5, 'Mee Soto', 'Yellow noodles in a spicy chicken broth.', 4.00, 'Main Course', '', 1, GETDATE(), 390),
(5, 'Begedil', 'Deep-fried potato patty.', 1.00, 'Side Dish', '', 1, GETDATE(), 250),

-- ==========================================
-- STALLS 6 to 10
-- ==========================================
-- Stall 6: Satay King
(6, 'Chicken Satay (10 Pcs)', 'Tender grilled chicken skewers with peanut sauce.', 8.00, 'Main Course', '', 1, GETDATE(), 800),
(6, 'Mutton Satay (10 Pcs)', 'Flavorful mutton skewers charred to perfection.', 9.00, 'Main Course', '', 1, GETDATE(), 750),
(6, 'Ketupat', 'Traditional compressed rice cakes.', 1.00, 'Side Dish', '', 1, GETDATE(), 300),

-- Stall 7: Spring Leaf Prata
(7, 'Plain Prata (2 Pcs)', 'Crispy on the outside, fluffy on the inside.', 3.00, 'Main Course', '', 1, GETDATE(), 650),
(7, 'Egg Prata', 'Classic prata folded with a beaten egg.', 2.50, 'Main Course', '', 1, GETDATE(), 550),
(7, 'Chicken Curry', 'Rich and spicy chicken curry.', 4.00, 'Side Dish', '', 1, GETDATE(), 400),

-- Stall 8: Wok Master
(8, 'Seafood Hor Fun', 'Flat rice noodles wrapped in silky egg gravy.', 6.00, 'Main Course', '', 1, GETDATE(), 520),
(8, 'Beef Hor Fun', 'Tender beef slices with stir-fried flat noodles.', 6.50, 'Main Course', '', 1, GETDATE(), 480),
(8, 'Yang Zhou Fried Rice', 'Classic fried rice with char siew and shrimp.', 5.50, 'Main Course', '', 1, GETDATE(), 410),

-- Stall 9: Old Airport Char Kway Teow
(9, 'Cockle Char Kway Teow', 'Wok-hei infused noodles with plump blood cockles.', 5.00, 'Main Course', '', 1, GETDATE(), 720),
(9, 'Egg Char Kway Teow', 'Noodles stir-fried with extra egg and dark soy sauce.', 4.50, 'Main Course', '', 1, GETDATE(), 500),
(9, 'Otah', 'Spicy grilled fish cake wrapped in banana leaf.', 1.50, 'Side Dish', '', 1, GETDATE(), 300),

-- Stall 10: Chomp Chomp Satay House
(10, 'Pork Satay (10 Pcs)', 'Juicy pork skewers with a caramelized glaze.', 8.00, 'Main Course', '', 1, GETDATE(), 850),
(10, 'Beef Satay (10 Pcs)', 'Tender beef skewers with spicy peanut dip.', 8.00, 'Main Course', '', 1, GETDATE(), 700),
(10, 'BBQ Chicken Wings (2 Pcs)', 'Smoky, honey-glazed grilled chicken wings.', 3.50, 'Snacks', '', 1, GETDATE(), 900),

-- ==========================================
-- STALLS 11 to 30
-- ==========================================
-- Stall 11: Sugar Cane Oasis
(11, 'Sugar Cane Juice (Large)', 'Ice cold, pure sugar cane juice.', 2.50, 'Drinks', '', 1, GETDATE(), 500),
(11, 'Sugar Cane with Lemon', 'Sugar cane juice with a refreshing twist of lemon.', 3.00, 'Drinks', '', 1, GETDATE(), 450),
(11, 'Fresh Coconut Water', 'Whole coconut opened fresh to order.', 3.50, 'Drinks', '', 1, GETDATE(), 600),

-- Stall 12: Aunties Kopi & Teh
(12, 'Kopi O (Hot)', 'Traditional black coffee with sugar.', 1.20, 'Drinks', '', 1, GETDATE(), 800),
(12, 'Teh C (Ice)', 'Tea with evaporated milk and sugar over ice.', 1.80, 'Drinks', '', 1, GETDATE(), 750),
(12, 'Milo Dinosaur', 'Iced Milo topped with a mountain of Milo powder.', 3.00, 'Drinks', '', 1, GETDATE(), 900),

-- Stall 13: Cool Dessert Haven
(13, 'Ice Kachang', 'Shaved ice mountain with colorful syrups and jellies.', 2.50, 'Dessert', '', 1, GETDATE(), 650),
(13, 'Chendol', 'Coconut milk, palm sugar, and pandan jelly bits.', 3.00, 'Dessert', '', 1, GETDATE(), 820),
(13, 'Cheng Tng (Cold)', 'Refreshing clear sweet soup with longan and white fungus.', 2.50, 'Dessert', '', 1, GETDATE(), 400),

-- Stall 14: Ah Mas Tang Yuan
(14, 'Peanut Tang Yuan', 'Glutinous rice balls filled with crushed peanuts.', 2.50, 'Dessert', '', 1, GETDATE(), 450),
(14, 'Black Sesame Tang Yuan', 'Glutinous rice balls filled with rich black sesame paste.', 2.50, 'Dessert', '', 1, GETDATE(), 500),
(14, 'Red Bean Soup', 'Warm and comforting traditional red bean sweet soup.', 2.00, 'Dessert', '', 1, GETDATE(), 300),

-- Stall 15: Fresh Fruit Juices
(15, 'Watermelon Juice', 'Freshly blended sweet watermelon.', 2.50, 'Drinks', '', 1, GETDATE(), 550),
(15, 'Orange Juice', '100% freshly squeezed oranges.', 3.00, 'Drinks', '', 1, GETDATE(), 480),
(15, 'ABC Juice', 'Healthy blend of Apple, Beetroot, and Carrot.', 3.50, 'Drinks', '', 1, GETDATE(), 350),

-- Stall 16: Mango Sago Sweet
(16, 'Mango Sago Pomelo', 'Chilled mango purée with sago pearls and pomelo sacs.', 4.50, 'Dessert', '', 1, GETDATE(), 750),
(16, 'Mango Pudding', 'Smooth pudding made from fresh mangoes.', 3.00, 'Dessert', '', 1, GETDATE(), 400),
(16, 'Durian Mousse', 'Rich and creamy mousse made from real D24 durian.', 5.50, 'Dessert', '', 1, GETDATE(), 850),

-- Stall 17: Soya Bean Delights
(17, 'Soya Bean Milk (Cold)', 'Freshly brewed traditional soya bean milk.', 1.50, 'Drinks', '', 1, GETDATE(), 600),
(17, 'Soya Bean with Grass Jelly', 'Michael Jackson mix - Soya milk and dark grass jelly.', 2.00, 'Drinks', '', 1, GETDATE(), 500),
(17, 'Youtiao', 'Crispy deep-fried dough fritters, perfect for dipping.', 1.20, 'Snacks', '', 1, GETDATE(), 700),

-- Stall 18: Bubble Tea Stop
(18, 'Brown Sugar Pearl Milk', 'Fresh milk layered with rich brown sugar syrup and pearls.', 4.50, 'Drinks', '', 1, GETDATE(), 950),
(18, 'Classic Milk Tea', 'Traditional brewed tea with milk and chewy tapioca pearls.', 3.50, 'Drinks', '', 1, GETDATE(), 800),
(18, 'Taro Milk Tea', 'Creamy and sweet taro-flavored milk tea.', 4.00, 'Drinks', '', 1, GETDATE(), 650),

-- Stall 19: Hainanese Curry Rice
(19, 'Pork Chop Curry Rice', 'Crispy pork chop smothered in rich Hainanese curry.', 5.00, 'Main Course', '', 1, GETDATE(), 780),
(19, 'Braised Pork Belly Rice', 'Melt-in-your-mouth braised pork with curry sauce.', 5.50, 'Main Course', '', 1, GETDATE(), 650),
(19, 'Curry Cabbage', 'Soft, slow-cooked cabbage in mild curry.', 1.50, 'Side Dish', '', 1, GETDATE(), 300),

-- Stall 20: Al-Ameen Murtabak
(20, 'Chicken Murtabak', 'Pan-fried dough stuffed with minced chicken and onions.', 7.00, 'Main Course', '', 1, GETDATE(), 600),
(20, 'Mutton Murtabak', 'Savory stuffed dough with spiced minced mutton.', 8.00, 'Main Course', '', 1, GETDATE(), 750),
(20, 'Teh Tarik', 'Hot, frothy pulled tea to go with your meal.', 1.80, 'Drinks', '', 1, GETDATE(), 400),

-- Stall 21: Xin Tian Di Roast Meat
(21, 'Char Siew Rice', 'Sweet and sticky caramelized roast pork with rice.', 4.50, 'Main Course', '', 1, GETDATE(), 720),
(21, 'Roast Pork Belly Rice (Sio Bak)', 'Roast pork with an ultra-crispy crackling skin.', 5.00, 'Main Course', '', 1, GETDATE(), 800),
(21, 'Roast Duck Rice', 'Tender roast duck bathed in herbal savory sauce.', 5.50, 'Main Course', '', 1, GETDATE(), 650),

-- Stall 22: Goreng Pisang Crispy
(22, 'Banana Fritter (Goreng Pisang)', 'Sweet ripe banana enveloped in a crispy batter.', 1.50, 'Snacks', '', 1, GETDATE(), 850),
(22, 'Tapioca Fritter', 'Dense and sweet deep-fried tapioca cake.', 1.20, 'Snacks', '', 1, GETDATE(), 400),
(22, 'Sweet Potato Fritter', 'Crispy battered sweet potato slices.', 1.20, 'Snacks', '', 1, GETDATE(), 350),

-- Stall 23: Marina BBQ Seafood
(23, 'Sambal Stingray', 'Grilled stingray slathered in spicy, smoky sambal paste.', 15.00, 'Main Course', '', 1, GETDATE(), 950),
(23, 'BBQ Sotong', 'Fresh squid grilled and tossed in sweet and spicy sauce.', 12.00, 'Main Course', '', 1, GETDATE(), 600),
(23, 'Garlic Lala', 'Clams stir-fried in a rich garlic and chili broth.', 10.00, 'Main Course', '', 1, GETDATE(), 550),

-- Stall 24: Uncle Oyster Omelette
(24, 'Oyster Omelette (Orh Luak)', 'Starchy and crispy egg batter packed with fresh oysters.', 6.00, 'Main Course', '', 1, GETDATE(), 800),
(24, 'Fried Oyster (Orh Jian)', 'Fluffier version of the oyster omelette with less starch.', 6.00, 'Main Course', '', 1, GETDATE(), 600),
(24, 'Prawn Omelette', 'Crispy omelette substituting oysters with fresh prawns.', 6.00, 'Main Course', '', 1, GETDATE(), 450),

-- Stall 25: Western Grill Station
(25, 'Chicken Chop', 'Grilled chicken thigh with black pepper or mushroom sauce.', 7.00, 'Main Course', '', 1, GETDATE(), 750),
(25, 'Fish and Chips', 'Battered fish fillet fried till golden, served with fries.', 7.50, 'Main Course', '', 1, GETDATE(), 600),
(25, 'Sirloin Steak', 'Sizzling sirloin steak served with baked beans and fries.', 12.00, 'Main Course', '', 1, GETDATE(), 500),

-- Stall 26: Ban Mian Tradition
(26, 'Soup Ban Mian', 'Flat handmade noodles in soup with minced pork and an egg.', 4.50, 'Main Course', '', 1, GETDATE(), 700),
(26, 'Dry Ban Mian', 'Noodles tossed in dark soy sauce, topped with crispy ikan bilis.', 5.00, 'Main Course', '', 1, GETDATE(), 650),
(26, 'Tom Yum Ban Mian', 'Handmade noodles in a spicy and sour tom yum broth.', 5.50, 'Main Course', '', 1, GETDATE(), 450),

-- Stall 27: Healthy Yong Tau Foo
(27, 'Soup Yong Tau Foo (6 Pcs + Noodles)', 'Assorted stuffed tofu and veggies in clear soy bean broth.', 5.50, 'Main Course', '', 1, GETDATE(), 850),
(27, 'Dry Yong Tau Foo (6 Pcs + Noodles)', 'Ingredients drizzled with sweet sauce and chili sauce.', 5.50, 'Main Course', '', 1, GETDATE(), 700),
(27, 'Laksa Yong Tau Foo (6 Pcs + Noodles)', 'Served in a rich, spicy coconut milk gravy.', 6.50, 'Main Course', '', 1, GETDATE(), 900),

-- Stall 28: MacPherson Bak Chor Mee
(28, 'Bak Chor Mee (Dry)', 'Noodles tossed in vinegar/chili, topped with minced pork.', 5.00, 'Main Course', '', 1, GETDATE(), 880),
(28, 'Bak Chor Mee (Soup)', 'Minced meat noodles served in a rich, cloudy pork broth.', 5.00, 'Main Course', '', 1, GETDATE(), 600),
(28, 'Fishball Noodles', 'Springy noodles served with bouncy handmade fishballs.', 4.50, 'Main Course', '', 1, GETDATE(), 550),

-- Stall 29: Popiah & Kueh Pie Tee
(29, 'Traditional Popiah', 'Soft crepe wrapped around stewed turnips, eggs, and peanuts.', 2.00, 'Snacks', '', 1, GETDATE(), 750),
(29, 'Kueh Pie Tee (5 Pcs)', 'Crispy pastry shells filled with spicy, sweet turnip mixture.', 4.00, 'Snacks', '', 1, GETDATE(), 600),
(29, 'Rojak', 'Local fruit and dough fritter salad in sweet shrimp paste.', 4.50, 'Snacks', '', 1, GETDATE(), 650),

-- Stall 30: Nasi Padang Corner
(30, 'Beef Rendang Rice', 'Slow-cooked, melt-in-your-mouth beef in dry coconut curry.', 7.00, 'Main Course', '', 1, GETDATE(), 820),
(30, 'Ayam Masak Merah Rice', 'Chicken pieces cooked in a spicy tomato sauce.', 6.00, 'Main Course', '', 1, GETDATE(), 700),
(30, 'Sambal Goreng', 'Stir-fried tofu, tempeh, and long beans in chili paste.', 2.00, 'Side Dish', '', 1, GETDATE(), 400);