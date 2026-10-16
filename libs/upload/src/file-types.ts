/**
 * 업로드를 받는 형식 — 형식마다 저장 확장자와 파일 앞부분의 시그니처(매직 바이트)를 둔다.
 *
 * 저장 확장자를 사용자 파일명에서, 형식을 클라이언트가 선언한 Content-Type 에서 가져오면
 * `x.html` 을 `application/pdf` 로 올려 `<uuid>.html` 로 저장시킬 수 있다. 그 파일은 우리
 * 출처에서 HTML 로 열려(저장형 XSS) 연 사람의 쿠키로 무엇이든 할 수 있다. 그래서
 * 확장자는 이 표에서 정하고, 선언한 형식은 바이트로 확인한다.
 *
 * 관리자 설정(`upload.allowedMimeTypes`)에 넣어도 이 표에 없는 형식은 받지 않는다.
 * 새 형식은 시그니처와 함께 여기에 더한다. SVG 처럼 스크립트를 품을 수 있는 형식은 넣지 않는다.
 */
interface UploadFileType {
  ext: string;
  /** 인라인으로 보여 줘도 되는가 — 아니면 내려받기(attachment)로만 낸다 */
  inline: boolean;
  matches: (head: Buffer) => boolean;
}

function startsWith(head: Buffer, bytes: number[], offset = 0): boolean {
  if (head.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => head[offset + i] === byte);
}

function ascii(text: string): number[] {
  return [...text].map((c) => c.charCodeAt(0));
}

export const UPLOAD_FILE_TYPES: Record<string, UploadFileType> = {
  'image/jpeg': {
    ext: '.jpg',
    inline: true,
    matches: (h) => startsWith(h, [0xff, 0xd8, 0xff]),
  },
  'image/png': {
    ext: '.png',
    inline: true,
    matches: (h) =>
      startsWith(h, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  'image/gif': {
    ext: '.gif',
    inline: true,
    matches: (h) =>
      startsWith(h, ascii('GIF87a')) || startsWith(h, ascii('GIF89a')),
  },
  'image/webp': {
    ext: '.webp',
    inline: true,
    matches: (h) =>
      startsWith(h, ascii('RIFF')) && startsWith(h, ascii('WEBP'), 8),
  },
  'application/pdf': {
    ext: '.pdf',
    inline: false,
    matches: (h) => startsWith(h, ascii('%PDF-')),
  },
  'application/zip': {
    ext: '.zip',
    inline: false,
    // 일반 · 빈 아카이브 · 분할 아카이브
    matches: (h) =>
      startsWith(h, [0x50, 0x4b, 0x03, 0x04]) ||
      startsWith(h, [0x50, 0x4b, 0x05, 0x06]) ||
      startsWith(h, [0x50, 0x4b, 0x07, 0x08]),
  },
};

/**
 * 사용자가 보낸 형식 문자열로 표를 찾는다. `UPLOAD_FILE_TYPES[mime]` 으로 바로 찾으면
 * `constructor` · `__proto__` 같은 값이 프로토타입의 함수·객체를 꺼내 와 형식으로 오인되고,
 * `.matches` 를 부르다 500 이 난다. 표에 직접 있는 키만 형식으로 친다.
 */
export function uploadFileType(mimeType: string): UploadFileType | undefined {
  return Object.hasOwn(UPLOAD_FILE_TYPES, mimeType)
    ? UPLOAD_FILE_TYPES[mimeType]
    : undefined;
}

/** 저장 확장자 → 형식. 저장 확장자는 이 표에서만 나오므로 확장자로 형식을 되짚을 수 있다 */
const UPLOAD_TYPES_BY_EXTENSION = new Map(
  Object.entries(UPLOAD_FILE_TYPES).map(([contentType, t]) => [
    t.ext,
    { contentType, inline: t.inline },
  ]),
);

/**
 * 저장 확장자(예: `.png`)로 형식을 찾는다 — 표에 없으면 undefined.
 * 저장소에 남은 메타데이터(형식 확인 전에 저장된 객체는 공격자가 선언한 Content-Type 을
 * 그대로 들고 있다)를 믿지 않고, 내보낼 때마다 이것으로 형식을 다시 정한다.
 */
export function uploadTypeByExtension(
  ext: string,
): { contentType: string; inline: boolean } | undefined {
  return UPLOAD_TYPES_BY_EXTENSION.get(ext.toLowerCase());
}

/** 인라인으로 보여도 되는 저장 확장자 — 정적 서빙이 이 밖은 내려받기로 낸다 */
export const INLINE_UPLOAD_EXTENSIONS = new Set(
  Object.values(UPLOAD_FILE_TYPES)
    .filter((t) => t.inline)
    .map((t) => t.ext),
);

/**
 * `/uploads` 정적 응답 헤더. 형식 검사를 피해 이미 저장된 파일이 있어도 브라우저가
 * 스크립트로 돌리지 못하게 한다 — 응답마다 CSP sandbox 를 걸고, 내용 추측(sniff)을 막고,
 * 이미지가 아니면 내려받기로 낸다.
 */
export function setUploadResponseHeaders(
  res: { setHeader: (name: string, value: string) => unknown },
  filePath: string,
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (!INLINE_UPLOAD_EXTENSIONS.has(ext)) {
    res.setHeader('Content-Disposition', 'attachment');
  }
}
