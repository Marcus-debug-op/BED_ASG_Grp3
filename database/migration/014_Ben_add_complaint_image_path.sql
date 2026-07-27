-- BED-131: Update Complaint Submission API to Support Image Uploads
-- Complaints.stall_id is already nullable (supports "General Facility"
-- complaints not tied to a specific stall), so the only schema change
-- actually needed here is somewhere to store the uploaded image's path.

IF COL_LENGTH('dbo.Complaints', 'image_path') IS NULL
BEGIN
    ALTER TABLE Complaints
    ADD image_path VARCHAR(255) NULL;
END;
