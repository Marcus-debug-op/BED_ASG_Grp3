IF OBJECT_ID('dbo.RentalAgreements', 'U') IS NULL
BEGIN
    CREATE TABLE RentalAgreements (
        rental_agreement_id INT IDENTITY(1,1) PRIMARY KEY,
        stall_id INT NOT NULL,
        lease_start_date DATE NOT NULL,
        lease_end_date DATE NOT NULL,
        monthly_rent DECIMAL(10,2) NOT NULL,
        agreement_status VARCHAR(20) NOT NULL DEFAULT 'Active',
        created_at DATETIME NOT NULL DEFAULT GETDATE(),

        CONSTRAINT CK_RentalAgreements_Dates
            CHECK (lease_end_date >= lease_start_date),

        CONSTRAINT CK_RentalAgreements_Status
            CHECK (agreement_status IN ('Active', 'Expired', 'Terminated')),

        CONSTRAINT FK_RentalAgreements_Stall
            FOREIGN KEY (stall_id) REFERENCES Stalls(stall_id)
    );

    CREATE INDEX IX_RentalAgreements_Status_EndDate
        ON RentalAgreements (agreement_status, lease_end_date);
END;