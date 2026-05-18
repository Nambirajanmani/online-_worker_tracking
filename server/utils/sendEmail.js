const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html
  });
};

const sendWelcomeEmail = async (email, name, password) => {
  await sendEmail({
    to: email,
    subject: "Welcome to Employee Tracking System",
    html: `<p>Hello ${name},</p><p>Your account has been created.</p><p>Email: ${email}</p><p>Password: ${password}</p>`
  });
};

module.exports = { sendEmail, sendWelcomeEmail };
