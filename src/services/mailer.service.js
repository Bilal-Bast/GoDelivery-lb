import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
	if (transporter) return transporter;
	if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
		return null;
	}
	transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT) || 587,
		secure: Number(process.env.SMTP_PORT) === 465,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});
	return transporter;
}

// In dev (no SMTP configured) the reset link is logged instead of emailed.
export async function sendPasswordResetEmail(to, resetUrl) {
	const t = getTransporter();

	if (!t) {
		console.log(`[mailer] SMTP not configured. Password reset link for ${to}: ${resetUrl}`);
		return;
	}

	await t.sendMail({
		from: process.env.SMTP_FROM || process.env.SMTP_USER,
		to,
		subject: "Reset your GoDelivery password",
		html: `
			<p>You requested a password reset.</p>
			<p><a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p>
			<p>If you didn't request this, you can safely ignore this email.</p>
		`,
	});
}
