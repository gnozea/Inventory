-- Migration 003: Inventory Forms
-- Inventory Control Form (receiving) and Inventory Removal/Transfer Form

-- Inventory Control Form header
CREATE TABLE inventory_control_forms (
  id                    UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID() PRIMARY KEY,
  form_number           NVARCHAR(50)      NOT NULL,
  agency_id             UNIQUEIDENTIFIER  NOT NULL,
  grant_year            NVARCHAR(10)      NULL,
  po_number             NVARCHAR(100)     NULL,
  vendor_name           NVARCHAR(255)     NULL,
  vendor_contact        NVARCHAR(255)     NULL,
  invoice_number        NVARCHAR(100)     NULL,
  received_date         DATE              NULL,
  received_by_name      NVARCHAR(255)     NULL,
  received_by_title     NVARCHAR(255)     NULL,
  receiving_location    NVARCHAR(500)     NULL,
  discrepancies         NVARCHAR(MAX)     NULL,
  notes                 NVARCHAR(MAX)     NULL,
  status                NVARCHAR(20)      NOT NULL DEFAULT 'draft',
  created_by_id         UNIQUEIDENTIFIER  NOT NULL,
  created_by_name       NVARCHAR(255)     NOT NULL,
  created_at            DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
  modified_at           DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
  submitted_at          DATETIME2         NULL,

  CONSTRAINT FK_icf_agency FOREIGN KEY (agency_id) REFERENCES agencies(id),
  CONSTRAINT CK_icf_status CHECK (status IN ('draft', 'submitted'))
);

CREATE INDEX IX_icf_agency ON inventory_control_forms (agency_id);
CREATE INDEX IX_icf_status ON inventory_control_forms (status);

-- Control Form line items (one row per equipment piece received)
CREATE TABLE inventory_control_form_items (
  id                    UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID() PRIMARY KEY,
  form_id               UNIQUEIDENTIFIER  NOT NULL,
  equipment_id          UNIQUEIDENTIFIER  NULL,
  line_number           INT               NOT NULL,
  item_name             NVARCHAR(255)     NOT NULL,
  category              NVARCHAR(100)     NULL,
  quantity              INT               NOT NULL DEFAULT 1,
  unit_price            DECIMAL(12,2)     NULL,
  tag_number            NVARCHAR(100)     NULL,
  serial_number         NVARCHAR(255)     NULL,
  make_model            NVARCHAR(255)     NULL,
  year                  NVARCHAR(10)      NULL,
  grant_number          NVARCHAR(100)     NULL,
  condition_at_receipt  NVARCHAR(50)      NULL,
  discrepancy_noted     BIT               NOT NULL DEFAULT 0,
  discrepancy_notes     NVARCHAR(MAX)     NULL,

  CONSTRAINT FK_icfi_form      FOREIGN KEY (form_id)      REFERENCES inventory_control_forms(id) ON DELETE CASCADE,
  CONSTRAINT FK_icfi_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

CREATE INDEX IX_icfi_form      ON inventory_control_form_items (form_id);
CREATE INDEX IX_icfi_equipment ON inventory_control_form_items (equipment_id);

-- Inventory Removal and Transfer Form (one per equipment action)
-- action_type: removal or transfer
-- removal_reason: surplus, damage, end-of-life, loss, theft, obsolete
-- disposal_method: auction, destruction, donation, trade-in, returned-to-vendor
CREATE TABLE inventory_removal_forms (
  id                          UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID() PRIMARY KEY,
  form_number                 NVARCHAR(50)      NOT NULL,
  equipment_id                UNIQUEIDENTIFIER  NOT NULL,
  action_type                 NVARCHAR(20)      NOT NULL,
  date_of_action              DATE              NULL,
  removal_reason              NVARCHAR(100)     NULL,
  disposal_method             NVARCHAR(100)     NULL,
  transfer_to_entity          NVARCHAR(255)     NULL,
  transfer_to_agency_id       UNIQUEIDENTIFIER  NULL,
  linked_transfer_request_id  UNIQUEIDENTIFIER  NULL,
  prior_location              NVARCHAR(500)     NULL,
  poc_name                    NVARCHAR(255)     NULL,
  poc_title                   NVARCHAR(255)     NULL,
  poc_phone                   NVARCHAR(100)     NULL,
  poc_email                   NVARCHAR(255)     NULL,
  authorized_by_name          NVARCHAR(255)     NULL,
  authorized_by_title         NVARCHAR(255)     NULL,
  authorized_date             DATE              NULL,
  notes                       NVARCHAR(MAX)     NULL,
  status                      NVARCHAR(20)      NOT NULL DEFAULT 'draft',
  created_by_id               UNIQUEIDENTIFIER  NOT NULL,
  created_by_name             NVARCHAR(255)     NOT NULL,
  created_at                  DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
  modified_at                 DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
  submitted_at                DATETIME2         NULL,

  CONSTRAINT FK_irf_equipment     FOREIGN KEY (equipment_id)               REFERENCES equipment(id),
  CONSTRAINT FK_irf_to_agency     FOREIGN KEY (transfer_to_agency_id)      REFERENCES agencies(id),
  CONSTRAINT FK_irf_transfer_req  FOREIGN KEY (linked_transfer_request_id) REFERENCES transfer_requests(id),
  CONSTRAINT CK_irf_action        CHECK (action_type IN ('removal', 'transfer')),
  CONSTRAINT CK_irf_status        CHECK (status IN ('draft', 'submitted'))
);

CREATE INDEX IX_irf_equipment ON inventory_removal_forms (equipment_id);
CREATE INDEX IX_irf_status    ON inventory_removal_forms (status);
