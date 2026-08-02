-- ============================================================================
-- Migration 010 - Create the SavedAddresses table (BED-223)
-- Author: Ryan Tan
-- ----------------------------------------------------------------------------
-- WHY THIS MIGRATION EXISTS:
-- At the moment a patron must retype their delivery address every single time
-- they order. This table lets a patron save addresses against their account so
-- they can reuse, update or delete them at checkout.
--
-- This is also the feature that gives the patron side a full CRUD resource:
-- Create (save a new address), Read (list saved addresses), Update (edit one)
-- and Delete (remove one) - all through RESTful API routes to SQL Server.
--
-- NOTE: this is separate from the delivery_address column on Orders. That
-- column is a SNAPSHOT of where one particular order went. This table is the
-- patron's reusable address book. Deleting a saved address must never change
-- where a past order was delivered, which is why they are kept apart.
-- ============================================================================
 
USE HawkerDB__Official;   -- make sure we are creating the table in the right database
GO
 
CREATE TABLE SavedAddresses (
    -- System-assigned id for each saved address.
    address_id INT IDENTITY(1,1) PRIMARY KEY,
 
    -- Which patron this address belongs to. Every query filters on this, so a
    -- patron can only ever see and change their own addresses.
    patron_id INT NOT NULL,
 
    -- The address itself and its 6-digit Singapore postal code.
    address VARCHAR(255) NOT NULL,
    postal_code VARCHAR(6) NOT NULL,
 
    -- Contact details saved with the address, so the whole delivery section can
    -- be filled in from one click. Nullable because they are optional extras.
    contact_name VARCHAR(100) NULL,
    contact_phone VARCHAR(20) NULL,
 
    -- When the address was saved, so the list can be shown newest-first.
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
 
    -- Link the address to a real user account. This stops an address being
    -- saved against a patron id that doesn't exist.
    CONSTRAINT FK_SavedAddresses_Patron
        FOREIGN KEY (patron_id) REFERENCES Users(user_id)
);
GO