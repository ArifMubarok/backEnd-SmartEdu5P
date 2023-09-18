import { htmlToText } from 'html-to-text';
import nodemailer from 'nodemailer';
import pug from 'pug';
import path from 'path';

class Email {
  constructor(user, url) {
    this.from = `Smart Edu 5P <${process.env.EMAIL_FROM}>`;
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST_DEV,
      port: process.env.SMTP_PORT_DEV,
      auth: {
        user: process.env.SMTP_USERNAME_DEV,
        pass: process.env.SMTP_PASSWORD_DEV,
      },
    });
  }

  async send(template, subject) {
    const html = pug.renderFile(`${path.resolve()}/views/emails/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Smart Edu 5P Application');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Your password reset token (valid for 10 minutes)');
  }
}

export default Email;
