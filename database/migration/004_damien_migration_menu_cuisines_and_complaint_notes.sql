-- =====================================================================
-- Migration: Menu Cuisines + Complaint Notes + Acknowledged status
-- Run this AFTER your existing init.sql / seed.sql have already been run.
-- Safe to run on its own - does not touch or recreate any existing table.
-- =====================================================================

USE HawkerDB;
GO

-- ---------------------------------------------------------------------
-- 1. Cuisines + MenuItemCuisines (many-to-many: a dish can belong to
--    more than one cuisine, e.g. "Nasi Lemak" = Malay + Halal)
-- ---------------------------------------------------------------------

CREATE TABLE Cuisines (
    cuisine_id INT IDENTITY(1,1) PRIMARY KEY,
    cuisine_name VARCHAR(50) NOT NULL UNIQUE
);
GO

CREATE TABLE MenuItemCuisines (
    menu_item_id INT NOT NULL,
    cuisine_id INT NOT NULL,

    PRIMARY KEY (menu_item_id, cuisine_id),
    CONSTRAINT FK_MIC_MenuItems FOREIGN KEY (menu_item_id) REFERENCES MenuItems(menu_item_id) ON DELETE CASCADE,
    CONSTRAINT FK_MIC_Cuisines FOREIGN KEY (cuisine_id) REFERENCES Cuisines(cuisine_id)
);
GO

-- ---------------------------------------------------------------------
-- 2. ComplaintNotes (one-to-many: every status change / resolution
--    comment an officer makes is logged as its own row - an audit trail
--    that accumulates, instead of a single field being overwritten)
-- ---------------------------------------------------------------------

CREATE TABLE ComplaintNotes (
    complaint_note_id INT IDENTITY(1,1) PRIMARY KEY,
    complaint_id INT NOT NULL,
    officer_id INT NOT NULL,
    note VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_ComplaintNotes_Complaint FOREIGN KEY (complaint_id) REFERENCES Complaints(complaint_id) ON DELETE CASCADE,
    CONSTRAINT FK_ComplaintNotes_Officer FOREIGN KEY (officer_id) REFERENCES Users(user_id)
);
GO

-- ---------------------------------------------------------------------
-- 3. Add 'Acknowledged' as a valid Complaints.complaint_status value
--    (Open -> Acknowledged is the vendor's action; officers then move it
--    through In Progress -> Resolved/Closed)
-- ---------------------------------------------------------------------

ALTER TABLE Complaints DROP CONSTRAINT CK_Complaints_Status;
GO

ALTER TABLE Complaints
ADD CONSTRAINT CK_Complaints_Status CHECK (complaint_status IN ('Open', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'));
GO
