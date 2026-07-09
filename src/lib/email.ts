import { prisma } from './prisma';
import type { NotificationChannel, NotificationType } from '@prisma/client';

interface SendArgs {
  to: string;
  subject: string;
  body: string; // plain text; wrapped in a minimal HTML template
  type: NotificationType;
  customerId?: string | null;
}

const wrap = (body: string) => `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
  <div style="font-size:18px;font-weight:700;color:#0f2744;margin-bottom:4px">Garden State Water</div>
  <div style="border-top:3px solid #1c94bd;padding-top:16px;white-space:pre-line;font-size:14px;line-height:1.6">${body}</div>
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">Questions? Just reply to this email.</p>
</div>`;

/**
 * Send an email via Resend when configured; otherwise log to console so local
 * dev still shows exactly what would have gone out. Every attempt is recorded
 * in notifications_log.
 */
export async function sendEmail({ to, subject, body, type, customerId }: SendArgs) {
  let success = true;
  let error: string | null = null;
  let channel: NotificationChannel = 'EMAIL';

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error: sendError } = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? 'Garden State Water <onboarding@resend.dev>',
        to,
        subject,
        html: wrap(body),
      });
      if (sendError) {
        success = false;
        error = sendError.message;
      }
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
    }
  } else {
    channel = 'CONSOLE';
    console.log(`[email:dev] to=${to} subject="${subject}"\n${body}`);
  }

  await prisma.notificationLog.create({
    data: { customerId: customerId ?? null, type, channel, recipient: to, subject, body, success, error },
  });

  return { success, error };
}

/**
 * SMS via Twilio when configured; falls back to email, then console.
 * Uses Twilio's REST API directly — no SDK dependency needed.
 */
export async function sendSms({
  to,
  body,
  type,
  customerId,
  fallbackEmail,
}: {
  to: string;
  body: string;
  type: NotificationType;
  customerId?: string | null;
  fallbackEmail?: string | null;
}) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
    let success = true;
    let error: string | null = null;
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body }),
        }
      );
      if (!res.ok) {
        success = false;
        error = `Twilio ${res.status}: ${await res.text()}`;
      }
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
    }
    await prisma.notificationLog.create({
      data: { customerId: customerId ?? null, type, channel: 'SMS', recipient: to, body, success, error },
    });
    return { success, error };
  }

  if (fallbackEmail) {
    return sendEmail({ to: fallbackEmail, subject: 'Garden State Water', body, type, customerId });
  }

  console.log(`[sms:dev] to=${to}\n${body}`);
  await prisma.notificationLog.create({
    data: { customerId: customerId ?? null, type, channel: 'CONSOLE', recipient: to, body, success: true },
  });
  return { success: true, error: null };
}
