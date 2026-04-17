-- Migration 002: Resource Library
-- Shared document/resource library for emergency responders

CREATE TABLE library_categories (
  id          UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID() PRIMARY KEY,
  name        NVARCHAR(100)     NOT NULL,
  description NVARCHAR(500)     NULL,
  created_at  DATETIME2         NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT UQ_library_category_name UNIQUE (name)
);

CREATE TABLE library_resources (
  id            UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID() PRIMARY KEY,
  category_id   UNIQUEIDENTIFIER  NOT NULL,
  title         NVARCHAR(255)     NOT NULL,
  description   NVARCHAR(MAX)     NULL,
  file_url      NVARCHAR(2048)    NULL,
  file_type     NVARCHAR(50)      NULL,  -- e.g. 'pdf', 'docx', 'link', 'video'
  tags          NVARCHAR(500)     NULL,  -- comma-separated
  -- NULL agency_id = global resource visible to all; non-null = agency-scoped
  agency_id     UNIQUEIDENTIFIER  NULL,
  created_by    NVARCHAR(255)     NOT NULL,
  created_at    DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
  modified_at   DATETIME2         NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT FK_resource_category FOREIGN KEY (category_id) REFERENCES library_categories(id),
  CONSTRAINT FK_resource_agency   FOREIGN KEY (agency_id)   REFERENCES agencies(id)
);

CREATE INDEX IX_resource_category ON library_resources (category_id);
CREATE INDEX IX_resource_agency   ON library_resources (agency_id);

-- Seed a few starter categories
INSERT INTO library_categories (name, description) VALUES
  ('SOPs', 'Standard Operating Procedures'),
  ('Training Materials', 'Training guides and reference documents'),
  ('Equipment Manuals', 'Manufacturer manuals and maintenance guides'),
  ('Forms & Templates', 'Fillable forms and report templates'),
  ('Emergency Plans', 'Incident action plans and emergency protocols');
