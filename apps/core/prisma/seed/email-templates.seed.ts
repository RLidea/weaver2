import { PrismaClient } from '@prisma/client';
import { emailVerificationTemplate } from '../../src/infrastructure/email/templates/email-verification.template';
import { passwordResetTemplate } from '../../src/infrastructure/email/templates/password-reset.template';
import { welcomeTemplate } from '../../src/infrastructure/email/templates/welcome.template';
import { twoFactorCodeTemplate } from '../../src/infrastructure/email/templates/two-factor-code.template';
import { logSeedResult } from './seed-logger';
const prisma = new PrismaClient();

export async function seedEmailTemplates() {
  const templates = [
    emailVerificationTemplate,
    passwordResetTemplate,
    welcomeTemplate,
    twoFactorCodeTemplate,
  ];

  for (const template of templates) {
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { name: template.name },
    });

    if (existingTemplate) {
      await prisma.emailTemplate.update({
        where: { name: template.name },
        data: {
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables,
          isActive: true,
        },
      });
      logSeedResult('EmailTemplate', template.name, 'exists');
    } else {
      await prisma.emailTemplate.create({
        data: {
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables,
          isActive: true,
        },
      });
      logSeedResult('EmailTemplate', template.name, 'created');
    }
  }
}
