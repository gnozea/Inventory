import sgMail from '@sendgrid/mail';
import { getPool } from './db';
import type { ConnectionPool } from 'mssql';

const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL;
const APP_URL    = (process.env.APP_BASE_URL ?? '').replace(/\/$/, '');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// ── TransferContext ──────────────────────────────────────────────────────────

export interface TransferContext {
  id: string;
  equipment_name: string;
  serial_number?: string | null;
  request_type: 'transfer' | 'borrow';
  from_agency_id: string;
  to_agency_id: string;
  from_agency_name: string;
  to_agency_name: string;
  status: string;
  requested_by_id: string;
  requested_by_name: string;
}

// Fetch an enriched transfer row by ID using an already-open pool.
export async function getTransferContext(id: string, pool: ConnectionPool): Promise<TransferContext | null> {
  const r = await pool.request()
    .input('id', id)
    .query(`
      SELECT
        tr.id, tr.request_type, tr.status,
        tr.from_agency_id, tr.to_agency_id,
        tr.requested_by_id, tr.requested_by_name,
        e.name  AS equipment_name,
        e.serial_number,
        fa.name AS from_agency_name,
        ta.name AS to_agency_name
      FROM transfer_requests tr
      JOIN equipment e  ON tr.equipment_id   = e.id
      JOIN agencies  fa ON tr.from_agency_id = fa.id
      JOIN agencies  ta ON tr.to_agency_id   = ta.id
      WHERE tr.id = @id
    `);
  return r.recordset[0] ?? null;
}

// ── Recipient queries ────────────────────────────────────────────────────────

async function getAgencyAdminEmails(agencyId: string): Promise<string[]> {
  const pool = await getPool();
  const r = await pool.request()
    .input('agencyId', agencyId)
    .query(`SELECT email FROM user_profiles WHERE agency_id = @agencyId AND role = 'AgencyAdmin'`);
  return r.recordset.map((u: any) => u.email).filter(Boolean);
}

async function getSystemAdminEmails(): Promise<string[]> {
  const pool = await getPool();
  const r = await pool.request()
    .query(`SELECT email FROM user_profiles WHERE role = 'SystemAdmin'`);
  return r.recordset.map((u: any) => u.email).filter(Boolean);
}

async function getRequesterEmail(requestedById: string): Promise<string | null> {
  const pool = await getPool();
  const r = await pool.request()
    .input('oid', requestedById)
    .query(`SELECT email FROM user_profiles WHERE azure_ad_object_id = @oid`);
  return r.recordset[0]?.email ?? null;
}

// ── Email template ───────────────────────────────────────────────────────────

function buildBody(tr: TransferContext, headline: string, detail: string): string {
  const typeLabel   = tr.request_type === 'borrow' ? 'Borrow Request' : 'Permanent Transfer';
  const statusLabel = tr.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e293b;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:16px">Emergency Response Equipment Portal</h2>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
    <h3 style="margin:0 0 16px;color:#0f172a">${headline}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
      <tr>
        <td style="padding:6px 0;color:#64748b;width:140px">Equipment</td>
        <td style="padding:6px 0;color:#0f172a;font-weight:600">
          ${tr.equipment_name}${tr.serial_number ? ` (SN: ${tr.serial_number})` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b">Request Type</td>
        <td style="padding:6px 0;color:#0f172a">${typeLabel}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b">From Agency</td>
        <td style="padding:6px 0;color:#0f172a">${tr.from_agency_name}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b">To Agency</td>
        <td style="padding:6px 0;color:#0f172a">${tr.to_agency_name}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b">Status</td>
        <td style="padding:6px 0;color:#0f172a">${statusLabel}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b">Requested By</td>
        <td style="padding:6px 0;color:#0f172a">${tr.requested_by_name}</td>
      </tr>
    </table>
    <p style="color:#475569;font-size:14px;margin:0 0 20px">${detail}</p>
    <a href="${APP_URL}/transfers"
       style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;
              text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">
      View Request →
    </a>
  </div>
</div>`.trim();
}

// ── Core send (fire-and-forget — caller must .catch()) ───────────────────────

async function send(to: string[], subject: string, html: string): Promise<void> {
  if (!to.length) return;
  if (!FROM_EMAIL) {
    console.warn('[notify] NOTIFICATION_FROM_EMAIL not set — skipping send');
    return;
  }
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[notify] SENDGRID_API_KEY not set — skipping send');
    return;
  }
  await sgMail.sendMultiple({ to, from: FROM_EMAIL, subject, html });
}

type Log = (msg: string) => void;

// ── Public notification functions ────────────────────────────────────────────

export function notifyNewRequest(tr: TransferContext, log: Log): void {
  Promise.all([
    getAgencyAdminEmails(tr.from_agency_id),
    tr.request_type === 'transfer' ? getSystemAdminEmails() : Promise.resolve([] as string[]),
  ]).then(([agencyAdmins, sysAdmins]) => {
    const recipients = [...new Set([...agencyAdmins, ...sysAdmins])];
    const typeLabel  = tr.request_type === 'borrow' ? 'borrow request' : 'transfer request';
    const detail     = tr.request_type === 'transfer'
      ? 'An AgencyAdmin must approve this first, then a SystemAdmin will give final approval.'
      : 'An AgencyAdmin must approve this borrow request.';
    return send(
      recipients,
      `[Action Required] New ${typeLabel}: ${tr.equipment_name}`,
      buildBody(tr, `New ${typeLabel} submitted`, detail),
    );
  }).catch(e => log(`[notify] notifyNewRequest failed: ${e.message}`));
}

export function notifyApproved(tr: TransferContext, approverName: string, newStatus: string, log: Log): void {
  if (newStatus === 'agency_approved') {
    // Notify requester that agency approved; notify SystemAdmins they're next
    Promise.all([
      getRequesterEmail(tr.requested_by_id),
      getSystemAdminEmails(),
    ]).then(([requesterEmail, sysAdmins]) => {
      const promises: Promise<void>[] = [];
      if (requesterEmail) {
        promises.push(send(
          [requesterEmail],
          `[Update] Agency approved your request: ${tr.equipment_name}`,
          buildBody(tr, 'Agency approval granted',
            `Approved by ${approverName}. A SystemAdmin must now give final approval before the transfer can proceed.`),
        ));
      }
      if (sysAdmins.length) {
        promises.push(send(
          sysAdmins,
          `[Action Required] Final approval needed: ${tr.equipment_name}`,
          buildBody(tr, 'SystemAdmin approval required',
            `The originating agency has approved this transfer. Your final approval is now needed.`),
        ));
      }
      return Promise.all(promises);
    }).catch(e => log(`[notify] notifyApproved(agency_approved) failed: ${e.message}`));

  } else if (newStatus === 'approved') {
    // Fully approved — notify requester + both agencies' admins
    Promise.all([
      getRequesterEmail(tr.requested_by_id),
      getAgencyAdminEmails(tr.from_agency_id),
      getAgencyAdminEmails(tr.to_agency_id),
    ]).then(([requesterEmail, fromAdmins, toAdmins]) => {
      const recipients = [...new Set([
        ...(requesterEmail ? [requesterEmail] : []),
        ...fromAdmins,
        ...toAdmins,
      ])];
      return send(
        recipients,
        `[Approved] Request fully approved: ${tr.equipment_name}`,
        buildBody(tr, 'Request fully approved',
          `Approved by ${approverName}. The equipment is ready to be moved — coordinate with both agencies to arrange transit.`),
      );
    }).catch(e => log(`[notify] notifyApproved(approved) failed: ${e.message}`));
  }
}

export function notifyDenied(tr: TransferContext, deniedBy: string, reason: string | null, log: Log): void {
  getRequesterEmail(tr.requested_by_id).then(email => {
    if (!email) return;
    const detail = reason
      ? `Denied by ${deniedBy}. Reason: ${reason}`
      : `Denied by ${deniedBy}.`;
    return send(
      [email],
      `[Denied] Your request was denied: ${tr.equipment_name}`,
      buildBody(tr, 'Request denied', detail),
    );
  }).catch(e => log(`[notify] notifyDenied failed: ${e.message}`));
}

export function notifyStatusChanged(tr: TransferContext, newStatus: string, changedBy: string, log: Log): void {
  // Only notify for meaningful logistics transitions, not cancellations
  if (!['in_transit', 'completed', 'returned'].includes(newStatus)) return;

  Promise.all([
    getRequesterEmail(tr.requested_by_id),
    getAgencyAdminEmails(tr.from_agency_id),
    getAgencyAdminEmails(tr.to_agency_id),
  ]).then(([requesterEmail, fromAdmins, toAdmins]) => {
    const recipients = [...new Set([
      ...(requesterEmail ? [requesterEmail] : []),
      ...fromAdmins,
      ...toAdmins,
    ])];
    const labels: Record<string, string> = {
      in_transit: 'Equipment is now in transit',
      completed:  'Transfer completed',
      returned:   'Equipment returned',
    };
    return send(
      recipients,
      `[Update] ${labels[newStatus]}: ${tr.equipment_name}`,
      buildBody(tr, labels[newStatus], `Updated by ${changedBy}.`),
    );
  }).catch(e => log(`[notify] notifyStatusChanged failed: ${e.message}`));
}
