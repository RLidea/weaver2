// 2FA 마지막 수단이 꺼졌을 때 계정 주인에게 보내는 알림. 비밀이 없어 기록에 남겨도 된다.
// 기존 서버에는 seed 가 돌지 않으므로 같은 내용을 마이그레이션(…_add_two_factor_disabled_template)으로도 넣는다.
export const twoFactorDisabledTemplate = {
  name: 'two-factor-disabled',
  subject: '[Weaver2] 2단계 인증이 꺼졌습니다',
  htmlContent: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">2단계 인증이 꺼졌습니다</h2>
      <p style="color: #666; line-height: 1.6;">
        계정의 마지막 2단계 인증 수단이 해제되어, 이제 비밀번호(또는 소셜 로그인)만으로 로그인됩니다.
      </p>
      <p style="color: #666; line-height: 1.6;">
        직접 하신 일이 아니라면 바로 비밀번호를 바꾸고 2단계 인증을 다시 켜 주세요.
      </p>
    </div>
  `,
  textContent: `
    [Weaver2] 2단계 인증이 꺼졌습니다

    계정의 마지막 2단계 인증 수단이 해제되어, 이제 비밀번호(또는 소셜 로그인)만으로 로그인됩니다.
    직접 하신 일이 아니라면 바로 비밀번호를 바꾸고 2단계 인증을 다시 켜 주세요.
  `,
  variables: [] as string[],
};
