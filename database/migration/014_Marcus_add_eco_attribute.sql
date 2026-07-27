USE HawkerDB;

IF COL_LENGTH('Orders', 'eco_friendly_packaging') IS NULL
BEGIN
    ALTER TABLE Orders
    ADD eco_friendly_packaging BIT NOT NULL
    CONSTRAINT DF_Orders_eco_friendly_packaging DEFAULT 0;
END;

