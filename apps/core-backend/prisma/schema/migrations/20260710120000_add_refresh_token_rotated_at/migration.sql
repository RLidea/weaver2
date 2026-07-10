-- 리프레시 토큰 회전(재사용) 감지용 rotatedAt 컬럼 추가.
-- 값이 있으면 무효화된(회전된) 토큰이며, 재제시 시 탈취 감지에 쓰인다.
ALTER TABLE "refresh_tokens" ADD COLUMN "rotatedAt" TIMESTAMP(3);
