-- BED-26: Menu item likes
CREATE TABLE UserLikesMenuItem (
    user_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    liked_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_UserLikesMenuItem PRIMARY KEY (user_id, menu_item_id),
    CONSTRAINT FK_ULMI_User FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT FK_ULMI_MenuItem FOREIGN KEY (menu_item_id) REFERENCES MenuItems(menu_item_id)
);
GO
