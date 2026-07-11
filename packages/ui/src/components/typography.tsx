import { cn } from '../lib/cn';

/**
 * 시맨틱 타이포그래피 컴포넌트.
 *
 * variant는 "시각적 스타일"을 결정하고, as는 "HTML 태그"를 결정한다.
 * 이 둘을 분리함으로써 시각과 의미론을 독립적으로 제어할 수 있다.
 *
 * 예시:
 *   <Typography variant="h1">        → <h1>로 렌더링, h1 스타일
 *   <Typography variant="h1" as="h2"> → <h2>로 렌더링, h1 스타일 (시각적으로 크지만 DOM 계층은 h2)
 *   <Typography variant="body" as="p"> → <p>로 렌더링, 본문 스타일
 *
 * 모든 크기/굵기/행간은 Tailwind 클래스를 통해 스킨 토큰으로 위임된다.
 * 스킨을 바꾸면 Typography를 사용하는 모든 곳이 함께 변경된다.
 */

type TypographyVariant =
  | 'h1'       // 페이지 제목
  | 'h2'       // 섹션 제목
  | 'h3'       // 서브섹션 제목
  | 'h4'       // 카드/패널 제목
  | 'body'     // 기본 본문
  | 'body-sm'  // 작은 본문 (설명, 부가 정보)
  | 'label'    // 폼 레이블, UI 레이블
  | 'caption'; // 캡션, 힌트, 타임스탬프

// 각 variant의 기본 렌더링 태그
const DEFAULT_TAG: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  'body-sm': 'p',
  label: 'span',
  caption: 'span',
};

// 모든 클래스가 Tailwind 토큰을 통해 스킨으로 위임됨
const VARIANT_CLASSES: Record<TypographyVariant, string> = {
  h1:       'text-4xl font-bold leading-tight tracking-tight text-text',
  h2:       'text-3xl font-bold leading-tight tracking-tight text-text',
  h3:       'text-2xl font-semibold leading-tight text-text',
  h4:       'text-xl font-semibold leading-normal text-text',
  body:     'text-base font-normal leading-normal text-text',
  'body-sm':'text-sm font-normal leading-normal text-text',
  label:    'text-sm font-medium leading-none text-text',
  caption:  'text-xs font-normal leading-normal text-text-muted',
};

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant: TypographyVariant;
  as?: keyof React.JSX.IntrinsicElements;
}

export function Typography({
  variant,
  as,
  className,
  children,
  ...props
}: TypographyProps) {
  const Tag = (as ?? DEFAULT_TAG[variant]) as React.ElementType;

  return (
    <Tag className={cn(VARIANT_CLASSES[variant], className)} {...props}>
      {children}
    </Tag>
  );
}
