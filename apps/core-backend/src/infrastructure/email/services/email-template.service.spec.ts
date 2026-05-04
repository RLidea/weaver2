import { EmailTemplateService } from './email-template.service';

// renderTemplate / extractTemplateVariables 는 순수 메서드이므로
// DI 의존성을 null 처리하고 직접 호출
const service = new EmailTemplateService(null as any, null as any, null as any);

describe('EmailTemplateService', () => {
  describe('renderTemplate()', () => {
    it('단일 변수 치환', () => {
      expect(service.renderTemplate('안녕하세요, {{name}}님', { name: '찬중' })).toBe(
        '안녕하세요, 찬중님',
      );
    });

    it('여러 변수 치환', () => {
      const result = service.renderTemplate(
        '코드: {{code}}, 만료: {{expiry}}분',
        { code: '123456', expiry: 5 },
      );
      expect(result).toBe('코드: 123456, 만료: 5분');
    });

    it('같은 변수가 여러 번 등장해도 모두 치환', () => {
      const result = service.renderTemplate(
        '{{siteName}}에 오신 것을 환영합니다. {{siteName}} 팀 드림.',
        { siteName: 'Weaver2' },
      );
      expect(result).toBe('Weaver2에 오신 것을 환영합니다. Weaver2 팀 드림.');
    });

    it('값이 없는 변수는 원본 플레이스홀더 유지', () => {
      expect(service.renderTemplate('안녕하세요 {{name}}님', {})).toBe(
        '안녕하세요 {{name}}님',
      );
    });

    it('숫자 값도 문자열로 변환', () => {
      expect(service.renderTemplate('OTP: {{code}}', { code: 123456 })).toBe(
        'OTP: 123456',
      );
    });

    it('변수가 없는 템플릿은 그대로 반환', () => {
      const plain = '<h1>안녕하세요</h1>';
      expect(service.renderTemplate(plain, { name: '찬중' })).toBe(plain);
    });

    it('빈 문자열 처리', () => {
      expect(service.renderTemplate('', { code: '123' })).toBe('');
    });
  });

  describe('extractTemplateVariables()', () => {
    it('단일 변수 추출', () => {
      expect(service.extractTemplateVariables('안녕 {{name}}')).toEqual(['name']);
    });

    it('여러 변수 추출', () => {
      expect(
        service.extractTemplateVariables('{{code}} expires in {{expiry}} minutes'),
      ).toEqual(['code', 'expiry']);
    });

    it('중복 변수도 각각 추출', () => {
      expect(
        service.extractTemplateVariables('{{name}} and {{name}} again'),
      ).toEqual(['name', 'name']);
    });

    it('변수 없으면 빈 배열 반환', () => {
      expect(service.extractTemplateVariables('변수 없는 텍스트')).toEqual([]);
    });

    it('빈 문자열이면 빈 배열', () => {
      expect(service.extractTemplateVariables('')).toEqual([]);
    });
  });
});
