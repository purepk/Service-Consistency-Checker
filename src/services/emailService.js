import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
    },
});

export async function sendIncidentAlert({ monitorName, url, status, error, responseTime }) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS || !process.env.ALERT_EMAIL_TO) {
        console.log('[EMAIL] Alert skipped: GMAIL_USER, GMAIL_APP_PASS, or ALERT_EMAIL_TO missing in .env');
        return;
    }

    const isDown = status === 'DOWN';
    const subject = `[${status}] Alert: ${monitorName}`;

    const html = `
    <div style="font-family: monospace; background-color: #09090b; color: #f4f4f5; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
      <h2 style="color: ${isDown ? '#ef4444' : '#10b981'}; margin-top: 0; font-size: 18px;">
        ${isDown ? '🚨 INCIDENT DETECTED' : '✅ SERVICE RECOVERED'}
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px;">
        <tr>
          <td style="padding: 6px 0; color: #a1a1aa; width: 130px;">Target Name:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #f4f4f5;">${monitorName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #a1a1aa;">Target URL:</td>
          <td style="padding: 6px 0;"><a href="${url}" style="color: #3b82f6; text-decoration: none;">${url}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #a1a1aa;">Current State:</td>
          <td style="padding: 6px 0; font-weight: bold; color: ${isDown ? '#ef4444' : '#10b981'};">${status}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #a1a1aa;">Response Time:</td>
          <td style="padding: 6px 0; color: #f4f4f5;">${responseTime ? `${responseTime}ms` : '--'}</td>
        </tr>
        ${error ? `
        <tr>
          <td style="padding: 6px 0; color: #a1a1aa;">Failure Cause:</td>
          <td style="padding: 6px 0; color: #f87171;">${error}</td>
        </tr>` : ''}
      </table>
      <hr style="border: 0; border-top: 1px solid #27272a; margin: 20px 0;" />
      <p style="font-size: 11px; color: #71717a; margin: 0;">Automated alert sent by Service Consistency Checker.</p>
    </div>
  `;

    try {
        await transporter.sendMail({
            from: `"Consistency Checker" <${process.env.GMAIL_USER}>`,
            to: process.env.ALERT_EMAIL_TO,
            subject,
            html,
        });
        console.log(`[EMAIL] Gmail alert sent successfully to ${process.env.ALERT_EMAIL_TO} (${status})`);
    } catch (err) {
        console.error('[EMAIL] Failed to send alert email via Gmail:', err.message);
    }
}