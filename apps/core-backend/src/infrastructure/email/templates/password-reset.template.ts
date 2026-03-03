export const passwordResetTemplate = {
  name: 'password-reset',
  subject: '[Weaver2] 비밀번호 재설정 안내',
  htmlContent: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">Weaver2</h1>
        <p style="color: #666; font-size: 16px;">비밀번호 재설정</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">비밀번호 재설정 요청</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새로운 비밀번호를 설정해주세요.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetLink}}" 
             style="display: inline-block; padding: 15px 30px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            비밀번호 재설정
          </a>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>주의:</strong> 이 링크는 보안상 24시간 후 만료됩니다. 만약 비밀번호 재설정을 요청하지 않으셨다면, 이 메일을 무시하셔도 됩니다.
          </p>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 25px;">
          버튼이 작동하지 않는 경우, 다음 URL을 복사하여 브라우저에 붙여넣어 주세요:
        </p>
        <p style="color: #007bff; font-size: 14px; word-break: break-all; background: #f1f3f4; padding: 10px; border-radius: 4px;">
          {{resetLink}}
        </p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>본 메일은 발신 전용입니다. 문의사항이 있으시면 고객센터로 연락해주세요.</p>
        <p>&copy; 2024 Weaver2. All rights reserved.</p>
      </div>
    </div>
  `,
  textContent: `
    [Weaver2] 비밀번호 재설정 안내
    
    비밀번호 재설정을 요청하셨습니다.
    
    새로운 비밀번호를 설정하려면 다음 링크를 클릭해주세요:
    {{resetLink}}
    
    주의: 이 링크는 보안상 24시간 후 만료됩니다.
    만약 비밀번호 재설정을 요청하지 않으셨다면, 이 메일을 무시하셔도 됩니다.
    
    문의사항이 있으시면 고객센터로 연락해주세요.
    
    © 2024 Weaver2. All rights reserved.
  `,
  variables: ['resetLink'],
};
