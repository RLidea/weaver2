export const emailVerificationTemplate = {
  name: 'email-verification',
  subject: '[Weaver2] 이메일 인증 안내',
  htmlContent: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">Weaver2</h1>
        <p style="color: #666; font-size: 16px;">이메일 인증</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">이메일 인증을 완료해주세요</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          Weaver2에 오신 것을 환영합니다! 아래 버튼을 클릭하여 이메일 인증을 완료해주세요.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{verificationLink}}" 
             style="display: inline-block; padding: 15px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            이메일 인증하기
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 25px;">
          버튼이 작동하지 않는 경우, 다음 URL을 복사하여 브라우저에 붙여넣어 주세요:
        </p>
        <p style="color: #007bff; font-size: 14px; word-break: break-all; background: #f1f3f4; padding: 10px; border-radius: 4px;">
          {{verificationLink}}
        </p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>본 메일은 발신 전용입니다. 문의사항이 있으시면 고객센터로 연락해주세요.</p>
        <p>&copy; 2024 Weaver2. All rights reserved.</p>
      </div>
    </div>
  `,
  textContent: `
    [Weaver2] 이메일 인증 안내
    
    Weaver2에 오신 것을 환영합니다!
    
    이메일 인증을 완료하려면 다음 링크를 클릭해주세요:
    {{verificationLink}}
    
    문의사항이 있으시면 고객센터로 연락해주세요.
    
    © 2024 Weaver2. All rights reserved.
  `,
  variables: ['verificationLink'],
};
