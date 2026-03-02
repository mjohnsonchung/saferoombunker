// Vercel serverless function — handles contact form submissions via Resend
//
// Required environment variable (set in Vercel dashboard):
//   RESEND_API_KEY  — your Resend API key (starts with re_...)
//
// Required Resend setup:
//   1. Add & verify saferoombunker.com as a sending domain in Resend
//   2. The 'from' address below (enquiries@saferoombunker.com) must be on that verified domain
//      OR change it to "Saferoom & Bunker Co. <onboarding@resend.dev>" for initial testing

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const ENQUIRY_LABELS = {
  license:     'Tier I — Plan License',
  turnkey:     'Tier II — Turnkey Build',
  acquisition: 'Tier III — Full Acquisition',
  general:     'General Enquiry',
};

const PLAN_LABELS = {
  sentinel: 'The Sentinel — 24m² (Solo / Couple)',
  redoubt:  'The Redoubt — 96m² (Family)',
  citadel:  'The Citadel — 216m² (Extended-Stay)',
  sovereign: 'The Sovereign — 500m²+ (Survival Estate)',
  unsure:   'Unsure — needs guidance',
};

const TIMELINE_LABELS = {
  asap:     'Immediately — ready to proceed',
  '6mo':    'Within 6 months',
  '12mo':   'Within 12 months',
  '24mo':   '1–2 years',
  planning: 'Planning phase — no fixed timeline',
};

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(fields) {
  const {
    enquiry_type, plan, fullname, email,
    country, build_location, timeline, message, nda_confirm,
  } = fields;

  const enquiryLabel  = ENQUIRY_LABELS[enquiry_type] || enquiry_type;
  const planLabel     = plan ? (PLAN_LABELS[plan] || plan) : null;
  const timelineLabel = TIMELINE_LABELS[timeline] || timeline || 'Not specified';

  const row = (label, value) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0ede8;vertical-align:top;width:160px;">
        <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${label}</span>
      </td>
      <td style="padding:12px 0 12px 16px;border-bottom:1px solid #f0ede8;vertical-align:top;">
        <span style="font-size:14px;color:#1a1a18;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${value}</span>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f4f4f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:0 auto;">

    <!-- Header -->
    <div style="background:#0D0D0B;padding:24px 32px;border-bottom:2px solid #C4962A;">
      <p style="margin:0;color:#C4962A;font-size:15px;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">Saferoom &amp; Bunker Co.</p>
      <p style="margin:5px 0 0;color:#5C5A54;font-size:11px;letter-spacing:0.05em;">New website enquiry received</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border:1px solid #e0ddd8;border-top:none;">
      <div style="display:inline-block;background:#0D0D0B;color:#C4962A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;padding:5px 12px;margin-bottom:28px;">
        ${escapeHtml(enquiryLabel)}
      </div>

      <table style="width:100%;border-collapse:collapse;">
        ${row('Name',     escapeHtml(fullname))}
        ${row('Email',    `<a href="mailto:${escapeHtml(email)}" style="color:#C4962A;text-decoration:none;">${escapeHtml(email)}</a>`)}
        ${row('Country',  escapeHtml(country || 'Not specified'))}
        ${planLabel ? row('Plan of Interest', escapeHtml(planLabel)) : ''}
        ${row('Build Location', escapeHtml(build_location || 'Not specified'))}
        ${row('Timeline', escapeHtml(timelineLabel))}
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f0ede8;vertical-align:top;width:160px;">
            <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#999;">Message</span>
          </td>
          <td style="padding:12px 0 12px 16px;border-bottom:1px solid #f0ede8;vertical-align:top;">
            <div style="background:#f9f8f6;border-left:2px solid #C4962A;padding:14px 16px;font-size:13px;color:#2a2a26;line-height:1.75;white-space:pre-wrap;word-break:break-word;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(message || '(no message provided)')}</div>
          </td>
        </tr>
        ${row('NDA Acknowledged', nda_confirm ? 'Yes' : 'No')}
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#f4f4f2;padding:14px 32px;border:1px solid #e0ddd8;border-top:none;">
      <p style="margin:0;font-size:10px;color:#aaa;letter-spacing:0.03em;">
        Submitted via saferoombunker.com &nbsp;·&nbsp; ${new Date().toUTCString()}
      </p>
    </div>

  </div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    enquiry_type, plan, fullname, email,
    country, build_location, timeline, message, nda_confirm,
  } = req.body || {};

  // Validation
  if (!fullname || !email || !enquiry_type) {
    return res.status(400).json({ error: 'Required fields missing.' });
  }
  if (!nda_confirm) {
    return res.status(400).json({ error: 'NDA acknowledgement is required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const subject = `Enquiry — ${ENQUIRY_LABELS[enquiry_type] || enquiry_type} — ${fullname}`;

  try {
    await resend.emails.send({
      from:    'Saferoom & Bunker Co. <enquiries@saferoombunker.com>',
      to:      ['plans@saferoombunker.com'],
      replyTo: email,
      subject,
      html: buildEmailHtml({
        enquiry_type, plan, fullname, email,
        country, build_location, timeline, message, nda_confirm,
      }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Resend error:', err?.message || err);
    return res.status(500).json({
      error: 'Failed to send. Please email plans@saferoombunker.com directly.',
    });
  }
};
