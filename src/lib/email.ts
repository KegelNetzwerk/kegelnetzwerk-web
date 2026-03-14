import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@kegelnetzwerk.de',
    to,
    subject,
    html,
  });
}

export function inviteEmailHtml(clubName: string, nickname: string, password: string): string {
  return `
    <h2>Willkommen bei KegelNetzwerk!</h2>
    <p>Hallo ${nickname},</p>
    <p>Sie wurden zum Klub <strong>${clubName}</strong> eingeladen.</p>
    <p>Ihre Zugangsdaten:</p>
    <ul>
      <li><strong>Klubname:</strong> ${clubName}</li>
      <li><strong>Spitzname:</strong> ${nickname}</li>
      <li><strong>Passwort:</strong> ${password}</li>
    </ul>
    <p>Bitte ändern Sie Ihr Passwort nach dem ersten Login.</p>
  `;
}

export function passwordResetEmailHtml(resetUrl: string): string {
  return `
    <h2>Passwort zurücksetzen</h2>
    <p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>Der Link ist 1 Stunde gültig.</p>
    <p>Falls Sie keine Passwort-Zurücksetzung angefordert haben, ignorieren Sie diese E-Mail.</p>
  `;
}
