-- 2FA 마지막 수단이 꺼졌을 때 보내는 알림 템플릿. 배포는 seed 를 돌리지 않으므로 마이그레이션으로 넣는다.
-- 이미 있으면(관리자가 고쳤거나 seed 가 먼저 넣었으면) 건드리지 않는다. 원본: two-factor-disabled.template.ts
-- 충돌 대상은 적지 않는다 — 파생 프로젝트가 유일 키를 (name, locale) 처럼 넓혀도 그대로 통하게.
INSERT INTO "email_templates" ("id", "name", "subject", "htmlContent", "textContent", "variables", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, $tpl$two-factor-disabled$tpl$, $tpl$[Weaver2] 2단계 인증이 꺼졌습니다$tpl$, $tpl$
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">2단계 인증이 꺼졌습니다</h2>
      <p style="color: #666; line-height: 1.6;">
        계정의 마지막 2단계 인증 수단이 해제되어, 이제 비밀번호(또는 소셜 로그인)만으로 로그인됩니다.
      </p>
      <p style="color: #666; line-height: 1.6;">
        직접 하신 일이 아니라면 바로 비밀번호를 바꾸고 2단계 인증을 다시 켜 주세요.
      </p>
    </div>
  $tpl$, $tpl$
    [Weaver2] 2단계 인증이 꺼졌습니다

    계정의 마지막 2단계 인증 수단이 해제되어, 이제 비밀번호(또는 소셜 로그인)만으로 로그인됩니다.
    직접 하신 일이 아니라면 바로 비밀번호를 바꾸고 2단계 인증을 다시 켜 주세요.
  $tpl$, $tpl$[]$tpl$::jsonb, true, NOW(), NOW())
ON CONFLICT DO NOTHING;
