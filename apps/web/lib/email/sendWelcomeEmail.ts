import { Resend } from "resend";
import { db } from "@/lib/db";

const APP_URL = "https://app.kashio.com.au";

function makeResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

// Sends a welcome email exactly once per user. Safe to call on every auth
// callback — it checks welcomeEmailSent before sending and marks it true.
export async function sendWelcomeEmailIfNew(userId: string, email: string | null): Promise<void> {
  if (!email) return;

  // Check existing profile
  const profile = await db.userProfile.findUnique({
    where:  { userId },
    select: { welcomeEmailSent: true },
  });

  // Already sent — nothing to do
  if (profile?.welcomeEmailSent) return;

  // Mark as sent (create or update) before sending, so a retry/race won't
  // fire a second email even if the send below fails partway through.
  await db.userProfile.upsert({
    where:  { userId },
    update: { welcomeEmailSent: true },
    create: { userId, welcomeEmailSent: true },
  });

  const resend = makeResend();

  await resend.emails.send({
    from:    "Kashio <hello@kashio.com.au>",
    to:      email,
    subject: "Welcome to Kashio",
    html:    buildWelcomeEmail(),
  });
}

function buildWelcomeEmail(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Welcome to Kashio</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f0f2f5" style="background-color:#f0f2f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">

          <!-- Green header — saturated colour survives Gmail dark mode inversion;
               white SVG logo remains clearly visible against it -->
          <tr>
            <td align="center" bgcolor="#22C55E" style="background-color:#22C55E;padding:36px 40px 28px;border-radius:14px 14px 0 0;">

              <!-- Kashio logo (white SVG on green background) -->
              <img src="https://app.kashio.com.au/logo.svg"
                   width="140" height="auto" alt="Kashio"
                   style="display:block;margin:0 auto 10px;width:140px;" />

              <p style="margin:0;font-size:13px;color:rgba(0,0,0,0.45);letter-spacing:0.2px;">
                Find what you can claim.
              </p>

            </td>
          </tr>

          <!-- White card body -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:36px 36px 32px;border-radius:0 0 14px 14px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a0f1e;letter-spacing:-0.3px;">
                Welcome to Kashio
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;">
                Your account is ready. Kashio helps Australians find potential tax deductions in their everyday spending — so you get more back at tax time.
              </p>

              <!-- Steps heading -->
              <p style="margin:0 0 14px;font-size:11px;font-weight:600;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;">
                Getting started
              </p>

              <!-- Step 1 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
                <tr>
                  <td width="32" style="vertical-align:top;padding-top:1px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td bgcolor="#22C55E" style="background-color:#22C55E;border-radius:8px;width:28px;height:28px;text-align:center;vertical-align:middle;">
                          <span style="color:#05070E;font-size:13px;font-weight:700;line-height:28px;display:inline-block;width:28px;">1</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0a0f1e;">Import your transactions</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">Download a statement from your bank and drop it into Kashio. We'll scan every transaction automatically — no manual entry needed.</p>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
                <tr>
                  <td width="32" style="vertical-align:top;padding-top:1px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td bgcolor="#22C55E" style="background-color:#22C55E;border-radius:8px;width:28px;height:28px;text-align:center;vertical-align:middle;">
                          <span style="color:#05070E;font-size:13px;font-weight:700;line-height:28px;display:inline-block;width:28px;">2</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0a0f1e;">See what you can claim</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">Kashio flags work expenses, home office costs, WFH deductions, and more. Confirm or skip each one in seconds.</p>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr>
                  <td width="32" style="vertical-align:top;padding-top:1px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td bgcolor="#22C55E" style="background-color:#22C55E;border-radius:8px;width:28px;height:28px;text-align:center;vertical-align:middle;">
                          <span style="color:#05070E;font-size:13px;font-weight:700;line-height:28px;display:inline-block;width:28px;">3</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0a0f1e;">Export your report</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">Generate a clean deduction summary to share with your accountant or keep for your own records.</p>
                  </td>
                </tr>
              </table>

              <!-- Features list — single column, no wrapping issues -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr>
                  <td bgcolor="#f9fafb" style="background-color:#f9fafb;border-radius:10px;padding:16px 18px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;">What's included</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                      <tr><td width="20" style="vertical-align:top;padding-bottom:8px;color:#22C55E;font-weight:700;font-size:13px;">✓</td><td style="padding-bottom:8px;font-size:13px;color:#374151;">Work-related expense detection</td></tr>
                      <tr><td width="20" style="vertical-align:top;padding-bottom:8px;color:#22C55E;font-weight:700;font-size:13px;">✓</td><td style="padding-bottom:8px;font-size:13px;color:#374151;">Work from home (WFH) deduction tools</td></tr>
                      <tr><td width="20" style="vertical-align:top;padding-bottom:8px;color:#22C55E;font-weight:700;font-size:13px;">✓</td><td style="padding-bottom:8px;font-size:13px;color:#374151;">Receipt uploads &amp; storage</td></tr>
                      <tr><td width="20" style="vertical-align:top;color:#22C55E;font-weight:700;font-size:13px;">✓</td><td style="font-size:13px;color:#374151;">Tax-ready export reports</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/import" style="display:inline-block;background-color:#22C55E;color:#05070E;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:-0.1px;">
                      Start reviewing transactions →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                Questions? <a href="mailto:support@kashio.com.au" style="color:#22C55E;text-decoration:none;">support@kashio.com.au</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.65;">
                © ${new Date().getFullYear()} Kashio · Australian tax deduction tracker<br/>
                <a href="https://kashio.com.au/legal/privacy" style="color:#9ca3af;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="https://kashio.com.au/legal/terms" style="color:#9ca3af;text-decoration:none;">Terms</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
