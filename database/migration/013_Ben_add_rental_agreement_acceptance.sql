-- BED-74: Vendor Rental Agreement Acknowledgement
-- Adds the two columns needed to record whether a vendor has
-- accepted their rental agreement, on top of the original
-- RentalAgreements table from migration 011.

IF COL_LENGTH('dbo.RentalAgreements', 'is_accepted') IS NULL
BEGIN
    ALTER TABLE RentalAgreements
    ADD is_accepted BIT NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.RentalAgreements', 'acceptance_timestamp') IS NULL
BEGIN
    ALTER TABLE RentalAgreements
    ADD acceptance_timestamp DATETIME NULL;
END;