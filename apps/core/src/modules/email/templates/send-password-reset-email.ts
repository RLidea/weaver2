import { passwordResetTemplate } from './password-reset.template';

export const sendPasswordResetEmail = async (
  emailService,
  email: string,
  resetLink: string,
) => {
  const subject = '[Weaver2] 비밀번호 재설정 안내';
  const html = passwordResetTemplate(resetLink);

  await emailService.sendMail({
    to: email,
    subject,
    html,
  });
};
