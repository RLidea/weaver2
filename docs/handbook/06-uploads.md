# 06. 파일 업로드

> 파일이 올라와서 저장되고, 썸네일이 만들어지고, 다시 서빙되기까지 — 그리고 Local↔S3 전환이 어떻게 한 줄로 가능한지.
> 코드 위치: `libs/upload/`(코어) + `apps/core-backend/src/infrastructure/upload/`(컨트롤러)

## 1. StorageProvider 추상화 — 확장 포인트의 교과서

저장 백엔드는 인터페이스 뒤에 숨어 있습니다 (`libs/upload/src/providers/storage-provider.interface.ts`):

```ts
interface StorageProvider {
  save(file, dir, type: { ext, contentType, inline }): { storedName, path }  // type = 업로드 서비스가 검증한 형식
  saveBuffer(buffer, filename, dir): { storedName, path }
  delete(path); exists(path);
  getFileUrl(path): Promise<string>
}
```

구현 2종과 분기 지점:

| 구현 | 저장 | `getFileUrl` 반환 |
|---|---|---|
| `LocalStorageProvider` | `uploads/YYYY/MM/{uuid}{ext}` 파일시스템 | `/uploads/...` 정적 경로 |
| `S3StorageProvider` | S3/MinIO (`S3_ENDPOINT` 있으면 `forcePathStyle` — MinIO 호환) | **presigned GET URL (1시간 만료)** |

분기는 `libs/upload/src/upload.module.ts`의 provider factory 한 곳: `STORAGE_DRIVER` env가 `s3`면 S3, 아니면 local. **서비스·컨트롤러 코드는 드라이버를 전혀 모릅니다** — CHARTER §5.1 "seam은 열되 구현은 필요한 것만"의 대표 사례입니다.

S3 필수 env: `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` (+선택 `S3_ENDPOINT`).

## 2. 업로드 플로우

`POST /v1/upload` (`infrastructure/upload/controllers/upload.controller.ts`):

```mermaid
flowchart LR
    REQ["multipart/form-data<br/>(메모리 저장, 최대 50개)"] --> V["검증<br/>크기·MIME·개수"]
    V --> S["StorageProvider.save<br/>uploads/YYYY/MM/{uuid}{ext}"]
    S --> T["썸네일 (이미지면)<br/>sharp resize"]
    T --> D["PostFile 레코드 생성"]
```

1. **수신** — `FilesInterceptor('files', 50, { storage: memoryStorage() })`. Rate limit 1분 10회
2. **검증** — 값은 코드 하드코딩이 아니라 **SystemSetting(런타임 설정)**에서 옵니다 (`infrastructure/config/system-setting.service.ts`의 DEFAULTS):

   | 설정 키 | 기본값 |
   |---|---|
   | `uploadMaxFileCount` | 10 |
   | `uploadMaxFileSize` | 10 MiB |
   | `uploadAllowedMimeTypes` | jpeg, png, gif, webp, pdf, zip |
   | `uploadThumbnailWidth/Height` | 300×300 |
   | `uploadOrphanRetentionHours` | null (고아 정리 비활성) |

   관리자 화면의 시스템 설정에서 재시작 없이 변경할 수 있습니다.
3. **형식 확인** — 선언한 Content-Type 을 믿지 않습니다. `libs/upload/src/file-types.ts` 의 `UPLOAD_FILE_TYPES` 표에서 그 형식의 **시그니처(파일 앞 바이트)**가 맞아야 받습니다. 표에 없는 형식은 관리자 설정에 넣어도 거절됩니다 — 새 형식은 시그니처와 함께 표에 더하세요. SVG 처럼 스크립트를 품을 수 있는 형식은 넣지 않습니다
4. **저장** — 파일명은 provider가 `randomUUID() + 확장자`로 생성하되, **확장자는 사용자 파일명이 아니라 검증된 형식에서** 정합니다(`x.html` 을 `image/png` 로 올려도 `.png`). 원본 이름은 DB에 별도 보관

> ⚠️ **왜** — 확장자를 원본 파일명에서, 형식을 선언값에서 가져오면 `x.html` 을 `application/pdf` 로 올려 `<uuid>.html` 로 저장시킬 수 있었습니다. 그 파일은 우리 출처에서 HTML 로 열려(저장형 XSS) 연 사람의 쿠키로 무엇이든 할 수 있습니다. 프로필 이미지(`update-user-profile.service.ts`)도 같은 표로 확인합니다
5. **썸네일** — 이미지 MIME(jpeg/png/gif/webp)이면 업로드 처리 중 **동기적으로** `sharp().resize(w, h, { fit: 'inside', withoutEnlargement: true })` 실행, `thumbnailPath`에 기록 (`libs/upload/src/services/thumbnail.service.ts`). 쿼리 파라미터 `generateThumbnail=false`로 끌 수 있음
6. **DB 기록** — 모델은 `PostFile` 하나입니다 (별도 Upload/Media 모델 없음, [02장 §2.2](02-data-model.md#22-게시판-boardprisma--레퍼런스-도메인)). 업로드 시 `postId`를 주면 즉시 게시글에 연결됩니다

## 3. 서빙 — 302 redirect

`GET /v1/upload/:id/file`, `GET /v1/upload/:id/thumbnail`은 파일을 직접 스트리밍하지 않고 **`getFileUrl` 결과로 302 redirect**합니다:

- **local** → `/uploads/YYYY/MM/uuid.ext` — `main.ts`의 `useStaticAssets(uploads/, { prefix: '/uploads' })`가 서빙. 프론트에서는 Next.js rewrites가 `/uploads/*`도 백엔드로 프록시합니다(= **같은 출처**)
  - 이 정적 서빙은 helmet 보다 먼저 응답을 끝내 CSP 가 붙지 않으므로, `setUploadResponseHeaders` 가 응답마다 `Content-Security-Policy: sandbox; default-src 'none'` · `X-Content-Type-Options: nosniff` 를 걸고 **이미지가 아니면 `Content-Disposition: attachment`**(PDF·ZIP 은 내려받기)로 냅니다. 형식 확인 전에 이미 저장된 파일도 이 헤더로 막힙니다
  - `/uploads` 는 Next `proxy.ts` 의 공개 경로입니다 — 로그아웃한 방문자도 첨부(PDF·ZIP 포함)를 받습니다. 위 헤더가 프록시를 지나서도 남는지는 `apps/core-frontend/e2e/upload-headers.spec.ts` 가 봅니다
  - ⚠️ 파일 단위 접근 통제는 없습니다 — 비공개 게시판의 첨부도 URL(UUID)을 아는 사람은 받습니다. 프록시의 쿠키 확인은 쿠키가 「있는지」만 보아 통제가 되지 못했습니다. 필요하면 인증된 엔드포인트 서빙이나 짧은 서명 URL 로 설계하세요
- **s3** 업로드는 `ContentType` 을 검증된 형식으로, 이미지가 아니면 `ContentDisposition: attachment` 로 저장합니다. 썸네일(`saveBuffer`)도 파일명 확장자로 형식을 되짚어(`uploadTypeByExtension`) 같은 규칙으로 저장합니다
- **s3** → presigned URL (1시간 만료) — 앱 서버를 거치지 않고 S3에서 직접 다운로드
  - 서명 URL 이 **응답 헤더를 덮어씁니다**(`ResponseContentType` · `ResponseContentDisposition`). 형식 확인 전에 저장된 객체는 공격자가 선언한 Content-Type 을 메타데이터로 들고 있으므로, 저장된 메타데이터 대신 키의 확장자로 다시 정합니다 — 표에 있는 이미지는 그 형식으로 `inline`, 그 밖의 표 형식은 `attachment`, 표에 없는 확장자(`.html` 등)는 `application/octet-stream` + `attachment`

이 구조 덕에 드라이버가 바뀌어도 클라이언트가 아는 URL(`/v1/upload/:id/file`)은 불변입니다. 메타 조회는 `GET /v1/upload/:id`(FileDto에 url/thumbnailUrl 포함), 게시글별 파일 목록 `GET /v1/upload/post/:postId`는 `@Public()`입니다.

## 4. 수명주기 — 연결, 삭제, 고아 정리

| 동작 | API | 규칙 |
|---|---|---|
| 게시글 연결/해제 | `PATCH /v1/upload/:id/link` / `unlink` | **본인 파일만** (`uploadedById` 검사) |
| 사용자 삭제 | `DELETE /v1/upload/:id` | 소프트 삭제 (`deletedAt`) |
| 관리자 삭제 | `DELETE (admin)` | 물리 삭제 — 스토리지 파일+썸네일 제거 후 hard delete |

**고아 파일 정리**: `postId`가 없는 채로 오래된 파일(작성 중 이탈 등)은 `UploadService.purgeOrphanedFiles(retentionHours)`가 스토리지+DB에서 물리 삭제합니다. 스케줄러는 `ContentPurgeScheduler`(매시 정각)가 겸하며, **`uploadOrphanRetentionHours` 설정이 null(기본)이면 동작하지 않습니다** — 운영에서 켜려면 시스템 설정에서 값을 지정하세요.

또 하나의 안전망: `PostFile.postId`는 `onDelete: SetNull`이라 게시글이 하드 삭제돼도 파일 레코드는 고아로 남고, 위 정리 경로가 회수합니다.

## 트러블슈팅 지도

| 증상 | 확인 |
|---|---|
| 업로드 415/400 | SystemSetting의 MIME/크기 제한 (기본 6종, 10MiB) |
| 이미지인데 썸네일 없음 | MIME이 4종(jpeg/png/gif/webp)에 드는지, `generateThumbnail` 파라미터 |
| S3 전환 후 404 | presigned URL 만료(1시간) 캐싱 여부, S3 env 4종 |
| 디스크가 참 | 고아 정리 활성화 여부 (`uploadOrphanRetentionHours`) |

## 더 보기

- 확장 포인트 목록: [`CHARTER.md`](../../CHARTER.md) §6
- 파일 모델: [02. 데이터 모델](02-data-model.md)
- 게시글 첨부 흐름: [07. 게시판 (레퍼런스 도메인)](07-board-reference.md)
