USE HawkerDB__Official;
GO
 
ALTER TABLE Promotions ADD min_spend_amount DECIMAL(10,2) NULL;
GO
 
ALTER TABLE Promotions ADD max_redemptions INT NULL;
GO
 
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