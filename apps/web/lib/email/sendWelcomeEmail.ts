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
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f2f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.09);">

              <!-- Dark header with logo -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color:#05070E;padding:36px 40px 32px;border-radius:18px 18px 0 0;">

                    <!-- Green avatar / profile icon -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 14px;">
                      <tr>
                        <td style="background-color:#22C55E;border-radius:16px;width:56px;height:56px;text-align:center;vertical-align:middle;">
                          <span style="color:#05070E;font-size:28px;font-weight:900;line-height:56px;display:inline-block;width:56px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">K</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Wordmark -->
                    <p style="margin:0 0 4px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Kashio</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);letter-spacing:0.2px;">Find what you can claim.</p>

                  </td>
                </tr>
              </table>

              <!-- Body content -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:36px 40px 32px;">

                    <!-- Greeting -->
                    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a0f1e;letter-spacing:-0.3px;">
                      Welcome to Kashio
                    </p>
                    <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;">
                      Your account is ready. Kashio helps Australians find potential tax deductions in their everyday spending — so you get more back at tax time.
                    </p>

                    <!-- Steps heading -->
                    <p style="margin:0 0 16px;font-size:12px;font-weight:600;color:#9ca3af;letter-spacing:0.8px;text-transform:uppercase;">
                      Getting started
                    </p>

                    <!-- Steps -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">

                      <tr>
                        <td style="padding-bottom:18px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                            <tr>
                              <td style="width:36px;vertical-align:top;padding-top:1px;">
                                <table role="presentation" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="background-color:#22C55E;border-radius:8px;width:28px;height:28px;text-align:center;vertical-align:middle;">
                                      <span style="color:#05070E;font-size:13px;font-weight:700;line-height:28px;display:inline-block;width:28px;">1</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding-left:12px;vertical-align:top;">
                                <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0a0f1e;">Import your transactions</p>
                                <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                                  Download a statement from your bank and drop it into Kashio. We'll scan every transaction automatically — no manual entry needed.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding-bottom:18px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                            <tr>
                              <td style="width:36px;vertical-align:top;padding-top:1px;">
                                <table role="presentation" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="background-color:#22C55E;border-radius:8px;width:28px;height:28px;text-align:center;vertical-align:middle;">
                                      <span style="color:#05070E;font-size:13px;font-weight:700;line-height:28px;display:inline-block;width:28px;">2</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding-left:12px;vertical-align:top;">
                                <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0a0f1e;">See what you can claim</p>
                                <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                                  Kashio flags work expenses, home office costs, WFH deductions, and more. Confirm or skip each one in seconds.
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
                              <td style="width:36px;vertical-align:top;padding-top:1px;">
                                <table role="presentation" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="background-color:#22C55E;border-radius:8px;width:28px;height:28px;text-align:center;vertical-align:middle;">
                                      <span style="color:#05070E;font-size:13px;font-weight:700;line-height:28px;display:inline-block;width:28px;">3</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding-left:12px;vertical-align:top;">
                                <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0a0f1e;">Export your report</p>
                                <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                                  Generate a clean deduction summary to share with your accountant or keep for your own records.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                    </table>

                    <!-- Features row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;background-color:#f9fafb;border-radius:10px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#9ca3af;letter-spacing:0.8px;text-transform:uppercase;">What's included</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="50%" style="vertical-align:top;padding-bottom:6px;">
                                <p style="margin:0;font-size:13px;color:#374151;">
                                  <span style="color:#22C55E;font-weight:700;margin-right:6px;">✓</span>Work expense detection
                                </p>
                              </td>
                              <td width="50%" style="vertical-align:top;padding-bottom:6px;">
                                <p style="margin:0;font-size:13px;color:#374151;">
                                  <span style="color:#22C55E;font-weight:700;margin-right:6px;">✓</span>WFH deduction tools
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td width="50%" style="vertical-align:top;">
                                <p style="margin:0;font-size:13px;color:#374151;">
                                  <span style="color:#22C55E;font-weight:700;margin-right:6px;">✓</span>Receipt uploads
                                </p>
                              </td>
                              <td width="50%" style="vertical-align:top;">
                                <p style="margin:0;font-size:13px;color:#374151;">
                                  <span style="color:#22C55E;font-weight:700;margin-right:6px;">✓</span>Tax-ready export reports
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="${APP_URL}/import" style="display:inline-block;background-color:#22C55E;color:#05070E;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:-0.1px;">
                            Start reviewing transactions →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.65;">
                      Questions?
                      <a href="mailto:support@kashio.com.au" style="color:#22C55E;text-decoration:none;">support@kashio.com.au</a>
                    </p>

                  </td>
                </tr>
              </table>

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
