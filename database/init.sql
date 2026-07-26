CREATE DATABASE HawkerDB;
GO

USE HawkerDB;
GO

CREATE TABLE HawkerCentres (
    hawker_centre_id INT IDENTITY(1,1) PRIMARY KEY,
    centre_name VARCHAR(100) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    area VARCHAR(100),
    is_active BIT NOT NULL DEFAULT 1
);

/* This table creates the accounts according to the "role", etc role = vendor means vendor account, role = officer means officer account */
CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patron', 'vendor', 'officer', 'operator')),
    phone_number VARCHAR(20),
    created_at DATETIME DEFAULT GETDATE(),
    profile_image_url VARCHAR(255) NULL /* merged from migration/003_Marcus_Add_profilepic_attrribute.sql */
);



CREATE TABLE Stalls (
    stall_id INT IDENTITY(1,1) PRIMARY KEY,
    vendor_id INT NOT NULL, /* This is "user_id" from Users, I used vendor_id to make the naming consistent so vendor_id = user_id */
    stall_name VARCHAR(100) NOT NULL,
    cuisine_type VARCHAR(50),
    description VARCHAR(255),
    unit_number VARCHAR(20) UNIQUE,
    is_active BIT DEFAULT 1,
    hawker_centre_id INT NOT NULL,
    /* merged from migration/001_Ben_alter_stalls.sql */
    operating_hours VARCHAR(50),
    price_range VARCHAR(20),
    phone_number VARCHAR(20),
    image_url VARCHAR(255),

    CONSTRAINT FK_Stalls_Vendor FOREIGN KEY (vendor_id) REFERENCES Users(user_id),
    CONSTRAINT FK_Stalls_HawkerCentre FOREIGN KEY (hawker_centre_id) REFERENCES HawkerCentres(hawker_centre_id)
);


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


CREATE TABLE Promotions (
    promotion_id INT IDENTITY(1,1) PRIMARY KEY,
    stall_id INT NOT NULL,
    promo_code VARCHAR(50) NOT NULL, /* no longer inline UNIQUE - see UQ_Promotions_Stall_PromoCode below (migration/006_damien_promo_code_unique_per_stall.sql) */
    description VARCHAR(255),
    discount_percent DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    /* merged from migration/005_damien_promotion_redemption.sql */
    min_spend_amount DECIMAL(10,2) NULL,
    max_redemptions INT NULL,

    FOREIGN KEY (stall_id) REFERENCES Stalls(stall_id),
    /* merged from migration/006_damien_promo_code_unique_per_stall.sql
       promo_code only needs to be unique per stall, not across the whole platform */
    CONSTRAINT UQ_Promotions_Stall_PromoCode UNIQUE (stall_id, promo_code)
);


/* Dont use this yet, its been created but I planning to use this to store the profiles so its abit unupdated*/
CREATE TABLE VendorProfiles (
    vendor_profile_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    stall_name VARCHAR(100) NOT NULL,
    cuisine_type VARCHAR(50),
    stall_description VARCHAR(255),
    unit_number VARCHAR(20),
    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE MenuItems (
    menu_item_id INT IDENTITY(1,1) PRIMARY KEY,
    stall_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NULL,
    image_url VARCHAR(255) NULL,
    is_available BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    likes INT DEFAULT 0, /* merged from migration/002_Ben_alter_menuitems.sql */

    CONSTRAINT FK_MenuItems_Stalls FOREIGN KEY (stall_id) REFERENCES Stalls(stall_id)
);


CREATE TABLE Orders (
    order_id INT IDENTITY(1,1) PRIMARY KEY,
    patron_id INT NOT NULL,
    stall_id INT NOT NULL,
    promotion_id INT NULL,
    order_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    total_amount DECIMAL(10,2) NOT NULL,
    order_date DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CK_Orders_Status CHECK (order_status IN ('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled')),
    CONSTRAINT FK_Orders_Patron FOREIGN KEY (patron_id) REFERENCES Users(user_id),
    CONSTRAINT FK_Orders_Stall FOREIGN KEY (stall_id) REFERENCES Stalls(stall_id),
    CONSTRAINT FK_Orders_Promotion FOREIGN KEY (promotion_id) REFERENCES Promotions(promotion_id)
);


CREATE TABLE OrderItems (
    order_item_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT CK_OrderItems_Quantity CHECK (quantity > 0),
    CONSTRAINT FK_OrderItems_Order FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    CONSTRAINT FK_OrderItems_MenuItem FOREIGN KEY (menu_item_id) REFERENCES MenuItems(menu_item_id)
);

CREATE TABLE Feedbacks (
    feedback_id INT IDENTITY(1,1) PRIMARY KEY,
    patron_id INT NOT NULL,
    stall_id INT NOT NULL,
    rating INT NOT NULL,
    comment VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CK_Feedbacks_Rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT FK_Feedbacks_Patron FOREIGN KEY (patron_id) REFERENCES Users(user_id),
    CONSTRAINT FK_Feedbacks_Stall FOREIGN KEY (stall_id) REFERENCES Stalls(stall_id)
);

CREATE TABLE Complaints (
    complaint_id INT IDENTITY(1,1) PRIMARY KEY,
    patron_id INT NOT NULL,
    stall_id INT NULL,
    complaint_type VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    complaint_status VARCHAR(30) NOT NULL DEFAULT 'Open', /* this just mean status will be "Open" until something runs and changes it */
    handled_by_officer_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    resolved_at DATETIME NULL,

    /* 'Acknowledged' added by migration/004_damien_migration_menu_cuisines_and_complaint_notes.sql
       (Open -> Acknowledged is the vendor's action; officers then move it through In Progress -> Resolved/Closed) */
    CONSTRAINT CK_Complaints_Status CHECK (complaint_status IN ('Open', 'Acknowledged', 'In Progress', 'Resolved', 'Closed')),
    CONSTRAINT FK_Complaints_Patron FOREIGN KEY (patron_id) REFERENCES Users(user_id),
    CONSTRAINT FK_Complaints_Stall FOREIGN KEY (stall_id) REFERENCES Stalls(stall_id),
    CONSTRAINT FK_Complaints_Officer FOREIGN KEY (handled_by_officer_id) REFERENCES Users(user_id),
    /* merged from migration/004_damien_migration_menu_cuisines_and_complaint_notes.sql */
    CONSTRAINT CK_Complaints_Type CHECK (complaint_type IN ('Hygiene', 'Service', 'Food Quality', 'Overcharging', 'Other'))
);

CREATE TABLE Inspections (
    inspection_id INT IDENTITY(1,1) PRIMARY KEY,
    stall_id INT NOT NULL,
    officer_id INT NOT NULL,
    inspection_date DATETIME NOT NULL DEFAULT GETDATE(),
    hygiene_grade CHAR(1) NULL,
    remarks VARCHAR(500) NULL,
    inspection_status VARCHAR(30) NOT NULL DEFAULT 'Completed',

    CONSTRAINT CK_Inspections_Grade CHECK (hygiene_grade IN ('A', 'B', 'C', 'D')),
    CONSTRAINT FK_Inspections_Stall FOREIGN KEY (stall_id) REFERENCES Stalls(stall_id),
    CONSTRAINT FK_Inspections_Officer FOREIGN KEY (officer_id) REFERENCES Users(user_id)
);

-- =====================================================================
-- BED-26: Menu item likes
-- merged from migration/004_Ben_create_userlikesmenuitem.sql
-- =====================================================================
CREATE TABLE UserLikesMenuItem (
    user_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    liked_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_UserLikesMenuItem PRIMARY KEY (user_id, menu_item_id),
    CONSTRAINT FK_ULMI_User FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT FK_ULMI_MenuItem FOREIGN KEY (menu_item_id) REFERENCES MenuItems(menu_item_id)
);
GO

-- =====================================================================
-- Cuisines + MenuItemCuisines (many-to-many: a dish can belong to
-- more than one cuisine, e.g. "Nasi Lemak" = Malay + Halal)
-- merged from migration/004_damien_migration_menu_cuisines_and_complaint_notes.sql
-- =====================================================================
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

-- =====================================================================
-- ComplaintNotes (one-to-many: every status change / resolution
-- comment an officer makes is logged as its own row - an audit trail
-- that accumulates, instead of a single field being overwritten)
-- merged from migration/004_damien_migration_menu_cuisines_and_complaint_notes.sql
-- =====================================================================
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

-- =====================================================================
-- PromotionRedemptions
-- merged from migration/005_damien_promotion_redemption.sql
-- =====================================================================
CREATE TABLE PromotionRedemptions (
    redemption_id INT IDENTITY(1,1) PRIMARY KEY,
    promotion_id INT NOT NULL,
    order_id INT NOT NULL,
    patron_id INT NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    redeemed_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Redemptions_Promotion FOREIGN KEY (promotion_id) REFERENCES Promotions(promotion_id),
    CONSTRAINT FK_Redemptions_Order FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    CONSTRAINT FK_Redemptions_Patron FOREIGN KEY (patron_id) REFERENCES Users(user_id),
    CONSTRAINT UQ_Redemptions_Order UNIQUE (order_id),
    CONSTRAINT UQ_Redemptions_PromotionPatron UNIQUE (promotion_id, patron_id)
);
GO
