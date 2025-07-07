export const passwordResetTemplate = (resetLink: string) => {
  return `
    <div style="font-family: sans-serif; text-align: center; padding: 40px;">
      <h2>비밀번호 재설정</h2>
      <p>아래 버튼을 클릭하여 비밀번호를 재설정하세요. 이 링크는 1시간 동안 유효합니다.</p>
      <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">
        비밀번호 재설정하기
      </a>
      <p style="margin-top: 30px; font-size: 12px; color: #888;">이 요청을 하지 않으셨다면 이 이메일을 무시하셔도 됩니다.</p>
    </div>
  `;
};
