export const verifyEmailTemplate = (token: {
  verificationToken: string;
  expiresAt: Date;
}) => {
  const formatExpirationTime = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours >= 1) {
      return `${hours}시간`;
    } else if (minutes > 0) {
      return `${minutes}분`;
    } else {
      return '곧';
    }
  };

  return {
    subject: 'Welcome to Weaver2 👋',
    html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
      <h2>Welcome to Weaver2 👋</h2>
      <p>Thank you for signing up. Please verify your email by clicking the button below:</p>
      <a href="https://yourdomain.com/v1/auth/verify?token=${token.verificationToken}"
         style="display: inline-block; background-color: #4CAF50; color: white;
                padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        Verify Email
      </a>
      <p>If you didn’t request this, please ignore this message.</p>
      <hr>
      <small>This link will expire in ${formatExpirationTime(token.expiresAt)}.</small>
    </div>`,
  };
};
