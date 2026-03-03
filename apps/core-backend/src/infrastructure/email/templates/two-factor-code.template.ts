export const twoFactorCodeTemplate = {
  name: 'two-factor-code',
  subject: '[Weaver2] 2단계 인증 코드',
  htmlContent: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">Weaver2</h1>
        <p style="color: #666; font-size: 16px;">2단계 인증</p>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">인증 코드를 입력해주세요</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          아래 6자리 코드를 입력하여 로그인을 완료해주세요. 이 코드는 10분간 유효합니다.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 20px 40px; background-color: #007bff; color: white; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
            {{code}}
          </div>
        </div>

        <p style="color: #999; font-size: 13px; margin-top: 25px; text-align: center;">
          이 코드를 요청하지 않으셨다면 이 메일을 무시하세요.
        </p>
      </div>

      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>본 메일은 발신 전용입니다. 문의사항이 있으시면 고객센터로 연락해주세요.</p>
        <p>&copy; 2024 Weaver2. All rights reserved.</p>
      </div>
    </div>
  `,
  textContent: `
    [Weaver2] 2단계 인증 코드

    인증 코드: {{code}}

    이 코드는 10분간 유효합니다.
    이 코드를 요청하지 않으셨다면 이 메일을 무시하세요.

    © 2024 Weaver2. All rights reserved.
  `,
  variables: ['code'],
};
