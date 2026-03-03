export const welcomeTemplate = {
  name: 'welcome',
  subject: '[Weaver2] 회원가입을 축하합니다!',
  htmlContent: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">Weaver2</h1>
        <p style="color: #666; font-size: 16px;">회원가입 완료</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">안녕하세요, {{displayName}}님!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
          Weaver2 회원가입을 진심으로 축하드립니다. 이제 다양한 기능을 이용하실 수 있습니다.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 15px;">이용 가능한 기능</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>게시판 이용 - 자유롭게 글을 작성하고 소통하세요</li>
            <li>프로필 관리 - 나만의 프로필을 꾸며보세요</li>
            <li>커뮤니티 참여 - 다른 회원들과 활발하게 소통하세요</li>
            <li>알림 설정 - 원하는 알림만 받아보세요</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://weaver2.com/dashboard" 
             style="display: inline-block; padding: 15px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            서비스 시작하기
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 25px;">
          서비스 이용 중 궁금한 점이 있으시면 언제든지 문의해 주세요. 더 나은 서비스를 제공하기 위해 항상 노력하겠습니다.
        </p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>본 메일은 발신 전용입니다. 문의사항이 있으시면 고객센터로 연락해주세요.</p>
        <p>&copy; 2024 Weaver2. All rights reserved.</p>
      </div>
    </div>
  `,
  textContent: `
    [Weaver2] 회원가입을 축하합니다!
    
    안녕하세요, {{displayName}}님!
    
    Weaver2 회원가입을 진심으로 축하드립니다.
    
    이제 다음 기능들을 이용하실 수 있습니다:
    - 게시판 이용
    - 프로필 관리
    - 커뮤니티 참여
    - 알림 설정
    
    서비스 이용 중 궁금한 점이 있으시면 언제든지 문의해 주세요.
    
    감사합니다.
    Weaver2 팀
    
    © 2024 Weaver2. All rights reserved.
  `,
  variables: ['displayName'],
};
