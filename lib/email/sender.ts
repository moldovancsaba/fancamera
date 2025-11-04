/**
 * Email Sender using Resend API
 * Version: 1.0.0
 * 
 * Handles email delivery for the Camera webapp.
 * Uses Resend API for reliable email delivery with retry logic.
 * 
 * Use cases:
 * - Send composed image to user after submission
 * - Send welcome emails
 * - Send notification emails
 * 
 * Resend Documentation: https://resend.com/docs
 */

import { Resend } from 'resend';

// Environment variable validation
const EMAIL_API_KEY = process.env.EMAIL_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@fancamera.vercel.app';

if (!EMAIL_API_KEY) {
  console.warn('⚠ EMAIL_API_KEY not configured - email functionality will be disabled');
}

// Initialize Resend client (will be null if no API key)
const resend = EMAIL_API_KEY ? new Resend(EMAIL_API_KEY) : null;

/**
 * Email send options
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  replyTo?: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Email send result
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email using Resend API with retry logic
 * 
 * @param options - Email options (to, subject, html/text, attachments)
 * @returns Send result with success status and message ID
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const {
    to,
    subject,
    html,
    text,
    attachments,
    replyTo,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  // Check if email is configured
  if (!resend) {
    console.error('✗ Email not configured - EMAIL_API_KEY missing');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  // Validate required fields
  if (!to) {
    return {
      success: false,
      error: 'Recipient email address is required',
    };
  }

  if (!subject) {
    return {
      success: false,
      error: 'Email subject is required',
    };
  }

  if (!html && !text) {
    return {
      success: false,
      error: 'Email must have either HTML or text content',
    };
  }

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Sending email attempt ${attempt}/${maxRetries} to ${to}...`);

      const emailData: any = {
        from: EMAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
      };

      if (html) emailData.html = html;
      if (text) emailData.text = text;
      if (attachments) emailData.attachments = attachments;
      if (replyTo) emailData.replyTo = replyTo;

      const result = await resend.emails.send(emailData);

      if (result.data) {
        console.log('✓ Email sent successfully:', result.data.id);
        return {
          success: true,
          messageId: result.data.id,
        };
      } else if (result.error) {
        throw new Error(result.error.message);
      }

    } catch (error) {
      lastError = error as Error;
      console.error(`✗ Email send attempt ${attempt} failed:`, error);

      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        const delay = retryDelay * attempt; // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: `Failed to send email after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
  };
}

/**
 * Send composed image to user
 * 
 * @param userEmail - User's email address
 * @param userName - User's name
 * @param imageUrl - URL of the composed image on imgbb.com
 * @returns Send result
 */
export async function sendComposedImage(
  userEmail: string,
  userName: string,
  imageUrl: string
): Promise<SendEmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Composed Image from Camera</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; font-size: 32px; color: #333;">📸 Your Photo is Ready!</h1>
      <p style="margin: 10px 0 0 0; color: #666; font-size: 16px;">Hi ${userName}, your composed image is ready to download and share.</p>
    </div>

    <!-- Image Preview -->
    <div style="text-align: center; margin: 30px 0;">
      <img src="${imageUrl}" alt="Your composed image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    </div>

    <!-- Action Buttons -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${imageUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 5px;">Download Image</a>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://fancamera.vercel.app'}/profile" style="display: inline-block; background-color: #6b7280; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 5px;">View Gallery</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #999; font-size: 14px;">
      <p style="margin: 5px 0;">Sent by Camera - Photo Frame Application</p>
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} Done Is Better</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hi ${userName},

Your composed image is ready to download and share!

Download your image: ${imageUrl}

View your gallery: ${process.env.NEXT_PUBLIC_APP_URL || 'https://fancamera.vercel.app'}/profile

---
Sent by Camera - Photo Frame Application
© ${new Date().getFullYear()} Done Is Better
  `;

  return sendEmail({
    to: userEmail,
    subject: '📸 Your Composed Image is Ready!',
    html,
    text,
  });
}

/**
 * Send welcome email to new user
 * 
 * @param userEmail - User's email address
 * @param userName - User's name
 * @returns Send result
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string
): Promise<SendEmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Camera</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; font-size: 32px; color: #333;">Welcome to Camera! 📸</h1>
      <p style="margin: 10px 0 0 0; color: #666; font-size: 16px;">Hi ${userName}, we're excited to have you join us!</p>
    </div>

    <div style="margin: 30px 0; color: #333; line-height: 1.6;">
      <h2 style="font-size: 20px; margin-bottom: 15px;">What you can do:</h2>
      <ul style="list-style: none; padding: 0;">
        <li style="margin: 10px 0;">📸 Capture photos with your camera or upload from your device</li>
        <li style="margin: 10px 0;">🖼️ Choose from beautiful pre-designed frames</li>
        <li style="margin: 10px 0;">🔗 Share your creations on social media</li>
        <li style="margin: 10px 0;">👤 Manage your photo gallery and history</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://fancamera.vercel.app'}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Start Creating</a>
    </div>

    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #999; font-size: 14px;">
      <p style="margin: 5px 0;">Camera - Photo Frame Application</p>
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} Done Is Better</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Welcome to Camera! 📸

Hi ${userName}, we're excited to have you join us!

What you can do:
- Capture photos with your camera or upload from your device
- Choose from beautiful pre-designed frames
- Share your creations on social media
- Manage your photo gallery and history

Start creating: ${process.env.NEXT_PUBLIC_APP_URL || 'https://fancamera.vercel.app'}

---
Camera - Photo Frame Application
© ${new Date().getFullYear()} Done Is Better
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Welcome to Camera! 📸',
    html,
    text,
  });
}
