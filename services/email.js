const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendPasswordResetEmail = async (email, resetUrl) => {
  const msg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM,
      name: "Haustier-Service-Support"
    },
    subject: "Passwort zurücksetzen – Haustier-Service",
    text: `Sie haben eine Passwortzurücksetzung für Ihr Pet Service-Konto angefordert. \n\nKlicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen: \n${resetUrl}\n\nWenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail bitte. \n\nDieser Link läuft in 1 Stunde ab.`,
    html: `
      <div style="max-width: 480px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background: #4f8cff; padding: 24px 0; text-align: center;">
          <img src="https://identqr.de/images/logo-header.png" alt="Pet Service" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="color: #fff; margin: 0;">Password Reset Request</h2>
        </div>
        <div style="padding: 24px; background: #fff;">
          <p style="font-size: 16px; color: #333;">Hi there,</p>
          <p style="font-size: 16px; color: #333;">
            Wir haben eine Anfrage erhalten, das Passwort für Ihr Pet Service-Konto zurückzusetzen.
          </p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #4f8cff; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Passwort zurücksetzen
            </a>
          </p>
          <p style="font-size: 14px; color: #888;">
            Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail getrost ignorieren.<br>
            Dieser Link läuft in 1 Stunde ab..
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">
            &copy; ${new Date().getFullYear()} Haustier-Service. Benötigen Sie Hilfe? <a href="mailto:support@yourdomain.com" style="color: #4f8cff;">Contact Support</a>
          </p>
        </div>
      </div>
    `,
    headers: {
      "X-Entity-Ref-ID": "reset-pwd-123"
    },
    categories: ["password_reset"]
  };

  await sgMail.send(msg);
};

module.exports = { sendPasswordResetEmail };
