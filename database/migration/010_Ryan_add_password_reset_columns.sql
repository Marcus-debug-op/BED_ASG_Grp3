-- BED-142 subtask 1: add password reset token tracking to Users.
-- (Numbered 010 to avoid colliding with 006_damien_promo_code_unique_per_stall.sql)
-- Both nullable - most users never have an active reset request.

ALTER TABLE Users
ADD
    reset_token VARCHAR(255) NULL,
    token_expiry DATETIME NULL;
GO
