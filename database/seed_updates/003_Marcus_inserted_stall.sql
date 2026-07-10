INSERT INTO Stalls
(vendor_id, hawker_centre_id, stall_name, cuisine_type, description, unit_number, is_active)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'matthewisavendor@example.com'),
    (SELECT hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Maxwell Food Centre'),
    'Nasi Lemak Galore',
    'Malay Cuisine',
    'Start your day right with our fragrant coconut rice, served with crispy fried chicken wings, crunchy ikan bilis, roasted peanuts, and our signature sweet and spicy sambal chili. A hearty, traditional meal that satisfies every craving.',
    '#01-14',
    1
);