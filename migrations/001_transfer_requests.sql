-- Migration 001: Transfer Requests
-- Supports both permanent transfers (dual-approval) and borrows (single AgencyAdmin approval)

CREATE TABLE transfer_requests (
  id                   UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID() PRIMARY KEY,
  equipment_id         UNIQUEIDENTIFIER  NOT NULL,
  request_type         NVARCHAR(10)      NOT NULL, -- 'transfer' | 'borrow'
  from_agency_id       UNIQUEIDENTIFIER  NOT NULL,
  to_agency_id         UNIQUEIDENTIFIER  NOT NULL,
  requested_by_id      UNIQUEIDENTIFIER  NOT NULL, -- user_profiles.id
  requested_by_name    NVARCHAR(255)     NOT NULL,
  status               NVARCHAR(20)      NOT NULL DEFAULT 'pending',
  notes                NVARCHAR(MAX)     NULL,
  -- Agency-level approval (AgencyAdmin of from_agency)
  agency_approved_by   NVARCHAR(255)     NULL,
  agency_approved_at   DATETIME2         NULL,
  -- System-level approval (SystemAdmin — required for permanent transfers only)
  system_approved_by   NVARCHAR(255)     NULL,
  system_approved_at   DATETIME2         NULL,
  -- Denial
  denied_by            NVARCHAR(255)     NULL,
  denied_at            DATETIME2         NULL,
  denial_reason        NVARCHAR(MAX)     NULL,
  -- Borrow-specific
  expected_return_date DATE              NULL,
  returned_at          DATETIME2         NULL,
  -- Timestamps
  created_at           DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
  modified_at          DATETIME2         NOT NULL DEFAULT GETUTCDATE(),

  CONSTRAINT FK_transfer_equipment  FOREIGN KEY (equipment_id)   REFERENCES equipment(id),
  CONSTRAINT FK_transfer_from_agency FOREIGN KEY (from_agency_id) REFERENCES agencies(id),
  CONSTRAINT FK_transfer_to_agency   FOREIGN KEY (to_agency_id)   REFERENCES agencies(id),
  CONSTRAINT CK_transfer_type   CHECK (request_type IN ('transfer', 'borrow')),
  CONSTRAINT CK_transfer_status CHECK (status IN (
    'pending', 'agency_approved', 'approved', 'denied',
    'in_transit', 'completed', 'returned', 'cancelled'
  ))
);

CREATE INDEX IX_transfer_equipment  ON transfer_requests (equipment_id);
CREATE INDEX IX_transfer_from_agency ON transfer_requests (from_agency_id);
CREATE INDEX IX_transfer_to_agency   ON transfer_requests (to_agency_id);
CREATE INDEX IX_transfer_status      ON transfer_requests (status);
