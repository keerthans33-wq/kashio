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
  <title>Welcome to Kashio</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color:#22C55E;border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:#05070E;font-size:20px;font-weight:800;line-height:36px;display:inline-block;width:36px;">K</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:#0a0f1e;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Kashio</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 2px 16px rgba(0,0,0,0.07);">

              <!-- Greeting -->
              <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#0a0f1e;letter-spacing:-0.3px;">
                Welcome to Kashio
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.65;">
                Your account is ready. Kashio scans your bank transactions and flags potential tax deductions — so you stop leaving money on the table at tax time.
              </p>

              <!-- Steps -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:32px;">

                <tr>
                  <td style="padding-bottom:20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td style="width:40px;vertical-align:top;padding-top:2px;">
                          <div style="width:32px;height:32px;background-color:#dcfce7;border-radius:8px;text-align:center;line-height:32px;font-size:16px;">📁</div>
                        </td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0a0f1e;">1. Upload your bank CSV</p>
                          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.55;">
                            Export a CSV from your bank and upload it to Kashio. We'll scan every transaction automatically.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td style="width:40px;vertical-align:top;padding-top:2px;">
                          <div style="width:32px;height:32px;background-color:#dcfce7;border-radius:8px;text-align:center;line-height:32px;font-size:16px;">🔍</div>
                        </td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0a0f1e;">2. Review possible deductions</p>
                          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.55;">
                            We flag transactions that may be tax-deductible. Confirm or reject them in seconds.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td style="width:40px;vertical-align:top;padding-top:2px;">
                          <div style="width:32px;height:32px;background-color:#dcfce7;border-radius:8px;text-align:center;line-height:32px;font-size:16px;">📄</div>
                        </td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0a0f1e;">3. Export your report</p>
                          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.55;">
                            Download a clean deduction summary to give your accountant or keep for your records.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

              <div style="border-top:1px solid #f0f0f0;margin-bottom:28px;"></div>

              <!-- CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/import" style="display:inline-block;background-color:#22C55E;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 36px;border-radius:10px;letter-spacing:-0.1px;">
                      Get started →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.65;">
                Questions? Email us at
                <a href="mailto:support@kashio.com.au" style="color:#22C55E;text-decoration:none;">support@kashio.com.au</a>
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
