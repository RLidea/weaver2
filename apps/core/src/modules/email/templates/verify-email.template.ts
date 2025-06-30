export const verifyEmailTemplate = () => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
      <h2>Welcome to Weaver2 👋</h2>
      <p>Thank you for signing up. Please verify your email by clicking the button below:</p>
      <a href="https://yourdomain.com/v1/auth/verify?token=abc123"
         style="display: inline-block; background-color: #4CAF50; color: white;
                padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        Verify Email
      </a>
      <p>If you didn’t request this, please ignore this message.</p>
      <hr>
      <small>This link will expire in 1 hour.</small>
    </div>`;
};
