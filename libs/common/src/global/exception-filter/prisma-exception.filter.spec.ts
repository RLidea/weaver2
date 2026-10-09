import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@weaver2/prisma';
import { PrismaClientExceptionFilter } from './prisma-exception.filter';

function run(error: Prisma.PrismaClientKnownRequestError) {
  const json = jest.fn<void, [{ error: { message: string } }]>();
  const status = jest.fn<{ json: typeof json }, [number]>(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new PrismaClientExceptionFilter().catch(error, host);
  return {
    status: status.mock.calls[0][0],
    message: json.mock.calls[0][0].error.message,
  };
}

function knownError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('x', {
    code,
    clientVersion: 'test',
    meta,
  });
}

describe('PrismaClientExceptionFilter', () => {
  it('P2002 — 어댑터(pg)가 준 기본 규칙 제약 이름을 칸 이름으로 되돌려 409 (v6 과 같은 메시지)', () => {
    // Prisma 7 + @prisma/adapter-pg 가 실제로 내는 meta 모양 (boards.name 중복)
    const res = run(
      knownError('P2002', {
        modelName: 'Board',
        driverAdapterError: {
          name: 'DriverAdapterError',
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: { index: 'boards_name_key' },
            table: 'boards',
          },
        },
      }),
    );
    expect(res).toEqual({
      status: HttpStatus.CONFLICT,
      message: 'Duplicate field: name',
    });
  });

  it('P2002 — 복합 제약도 칸 목록으로', () => {
    const res = run(
      knownError('P2002', {
        driverAdapterError: {
          cause: {
            constraint: { index: 'post_reactions_postId_userId_emojiId_key' },
            table: 'post_reactions',
          },
        },
      }),
    );
    expect(res.message).toBe('Duplicate field: postId, userId, emojiId');
  });

  it('P2002 — 규칙 밖의 제약 이름은 그대로', () => {
    const res = run(
      knownError('P2002', {
        driverAdapterError: {
          cause: { constraint: { index: 'custom_idx' }, table: 'boards' },
        },
      }),
    );
    expect(res.message).toBe('Duplicate field: custom_idx');
  });

  it('P2002 — 어댑터가 칸 목록을 주면 칸 이름으로', () => {
    const res = run(
      knownError('P2002', {
        driverAdapterError: {
          cause: { constraint: { fields: ['email'] } },
        },
      }),
    );
    expect(res.message).toBe('Duplicate field: email');
  });

  it('P2002 — 예전 meta.target 도 그대로 읽는다', () => {
    expect(run(knownError('P2002', { target: ['a', 'b'] })).message).toBe(
      'Duplicate field: a, b',
    );
  });

  it('P2025 → 404', () => {
    expect(run(knownError('P2025', { modelName: 'Board' })).status).toBe(
      HttpStatus.NOT_FOUND,
    );
  });
});
