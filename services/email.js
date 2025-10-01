const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendPasswordResetEmail = async (email, resetUrl) => {
  const msg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM,
      name: "Haustier-Service-Support",
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
      "X-Entity-Ref-ID": "reset-pwd-123",
    },
    categories: ["password_reset"],
  };

  await sgMail.send(msg);
};

const sendDoubleOptInEmail = async (email, verificationUrl) => {
  const msg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM,
      name: "Haustier-Service",
    },
    subject: "Bestätigen Sie Ihre E-Mail – Haustier-Service",
    text: `Willkommen bei Haustier-Service! \n\nVielen Dank für Ihre Registrierung. Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren. \n\nKlicken Sie auf den folgenden Link, um Ihre E-Mail zu bestätigen: \n${verificationUrl}\n\nWenn Sie sich nicht bei Haustier-Service registriert haben, ignorieren Sie diese E-Mail bitte. \n\nDieser Bestätigungslink läuft in 24 Stunden ab.`,
    html: `
      <div style="max-width: 480px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: #4f8cff; padding: 24px 0; text-align: center;">
          <img src="https://identqr.de/images/logo-header.png" alt="Haustier-Service" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="color: #fff; margin: 0; font-size: 24px;">Willkommen bei Haustier-Service!</h2>
        </div>
        
        <div style="padding: 32px; background: #fff;">
          <p style="font-size: 16px; color: #333; margin-bottom: 16px;">Hallo,</p>
          <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
            Vielen Dank für Ihre Registrierung bei Haustier-Service! Um Ihr Konto zu aktivieren und unsere Dienste nutzen zu können, bestätigen Sie bitte Ihre E-Mail-Adresse.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" style="background: #4f8cff; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s;">
              E-Mail bestätigen
            </a>
          </div>
          
          <div style="background: #f8f9fa; padding: 16px; border-radius: 6px; margin: 24px 0;">
            <p style="font-size: 14px; color: #666; margin: 0;">
              <strong>Link nicht anklickbar?</strong><br>
              Kopieren Sie diesen Link in Ihren Browser:<br>
              <span style="color: #4f8cff; word-break: break-all;">${verificationUrl}</span>
            </p>
          </div>
          
          <p style="font-size: 14px; color: #888; margin-bottom: 16px;">
            <strong>Wichtiger Hinweis:</strong><br>
            Dieser Bestätigungslink ist 24 Stunden gültig. Wenn Sie sich nicht bei Haustier-Service registriert haben, können Sie diese E-Mail ignorieren.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          
          <div style="text-align: center;">
            <p style="font-size: 12px; color: #aaa; margin-bottom: 8px;">
              Haben Sie Fragen? Wir helfen Ihnen gerne weiter.
            </p>
            <p style="font-size: 12px; color: #aaa; margin: 0;">
              &copy; ${new Date().getFullYear()} Haustier-Service. 
              <a href="mailto:support@haustier-service.de" style="color: #4f8cff; text-decoration: none;">Kontaktieren Sie unseren Support</a>
            </p>
          </div>
        </div>
      </div>
    `,
    headers: {
      "X-Entity-Ref-ID": "double-opt-in-" + Date.now(),
    },
    categories: ["double_opt_in", "user_signup"],
  };

  await sgMail.send(msg);
};

const send2FACodeEmail = async (email, code) => {
  const msg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM,
      name: "Haustier-Service-Sicherheit",
    },
    subject: "Anmeldebestätigung – Haustier-Service",
    text: `Sie haben sich gerade bei Ihrem Haustier-Service-Konto angemeldet. \n\nVerwenden Sie den folgenden Bestätigungscode, um den Anmeldevorgang abzuschließen: \n${code}\n\nWenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail bitte. \n\nDieser Code läuft in 10 Minuten ab.`,
    html: `
      <div style="max-width: 480px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background: #4f8cff; padding: 24px 0; text-align: center;">
          <img src="https://identqr.de/images/logo-header.png" alt="Haustier-Service" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="color: #fff; margin: 0;">Anmeldebestätigung</h2>
        </div>
        <div style="padding: 24px; background: #fff;">
          <p style="font-size: 16px; color: #333;">Hallo,</p>
          <p style="font-size: 16px; color: #333;">
            Sie haben sich gerade bei Ihrem Haustier-Service-Konto angemeldet. 
            Zur Sicherheit benötigen wir eine zusätzliche Bestätigung.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <div style="background: #f8f9fa; border: 2px dashed #4f8cff; border-radius: 8px; padding: 20px; display: inline-block;">
              <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Ihr Bestätigungscode:</p>
              <div style="background: #4f8cff; color: #fff; padding: 16px 32px; border-radius: 6px; font-size: 28px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">
                ${code}
              </div>
            </div>
          </div>
          
          <div style="background: #fff3cd; padding: 16px; border-radius: 6px; margin: 24px 0; border: 1px solid #ffeaa7;">
            <p style="font-size: 14px; color: #856404; margin: 0;">
              <strong>Sicherheitshinweis:</strong> Geben Sie diesen Code niemals an Dritte weiter. 
              Unser Support wird Sie niemals nach diesem Code fragen.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #888;">
            Wenn Sie diese Anmeldung nicht veranlasst haben, ändern Sie bitte umgehend Ihr Passwort.<br>
            Dieser Code läuft in 10 Minuten ab.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          
          <p style="font-size: 12px; color: #aaa; text-align: center;">
            &copy; ${new Date().getFullYear()} Haustier-Service. 
            Fragen? <a href="mailto:support@haustier-service.de" style="color: #4f8cff;">Support kontaktieren</a>
          </p>
        </div>
      </div>
    `,
    headers: {
      "X-Entity-Ref-ID": "2fa-login-" + Date.now(),
    },
    categories: ["login_2fa", "security"],
  };

  await sgMail.send(msg);
};

module.exports = {
  sendPasswordResetEmail,
  sendDoubleOptInEmail,
  send2FACodeEmail,
};
