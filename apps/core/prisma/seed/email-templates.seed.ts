import { PrismaClient } from '@prisma/client';
import { emailVerificationTemplate } from '../../src/infrastructure/email/templates/email-verification.template';
import { passwordResetTemplate } from '../../src/infrastructure/email/templates/password-reset.template';
import { welcomeTemplate } from '../../src/infrastructure/email/templates/welcome.template';
const prisma = new PrismaClient();

export async function seedEmailTemplates() {
  const templates = [
    emailVerificationTemplate,
    passwordResetTemplate,
    welcomeTemplate,
  ];

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: {
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        variables: template.variables,
        isActive: true,
      },
      create: {
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        variables: template.variables,
        isActive: true,
      },
    });

    console.log(`✓ Email template '${template.name}' seeded successfully`);
  }
}
