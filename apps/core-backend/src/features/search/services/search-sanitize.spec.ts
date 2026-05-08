import { SearchService } from './search.service';
import { PrismaService } from '@weaver2/prisma';

const service = new SearchService({} as PrismaService);

describe('SearchService.sanitizeSearchQuery', () => {
  it('공백을 AND 연산자로 변환', () => {
    expect(service.sanitizeSearchQuery('hello world')).toBe('hello & world');
  });

  it('단일 단어는 그대로', () => {
    expect(service.sanitizeSearchQuery('search')).toBe('search');
  });

  it('앞뒤 공백 trim', () => {
    expect(service.sanitizeSearchQuery('  weaver  ')).toBe('weaver');
  });

  it('PostgreSQL tsquery 메타문자 제거', () => {
    expect(service.sanitizeSearchQuery('a&b|c!d(e)f')).toBe(
      'a & b & c & d & e & f',
    );
  });

  it('연속된 공백을 하나의 AND로 압축', () => {
    expect(service.sanitizeSearchQuery('foo    bar')).toBe('foo & bar');
  });

  it('빈 문자열은 빈 문자열 그대로', () => {
    expect(service.sanitizeSearchQuery('')).toBe('');
  });

  it('공백만 있는 입력 → 빈 문자열', () => {
    expect(service.sanitizeSearchQuery('   ')).toBe('');
  });

  it('한국어 처리 (특수문자 없는 경우)', () => {
    expect(service.sanitizeSearchQuery('안녕 세상')).toBe('안녕 & 세상');
  });
});
