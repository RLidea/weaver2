/**
 * 이메일 템플릿 목록의 activeOnly — 쿼리 값은 문자열로 온다.
 *
 * 관리 화면은 꺼진 템플릿도 보여야 다시 켤 수 있다. 그래서 `?activeOnly=false` 일 때는
 * 꺼진 템플릿까지 주고, 값이 없으면 지금처럼 켜진 것만 준다.
 *
 * 컨트롤러가 전역 ValidationPipe 의 원시값 변환(`boolean` 타입 → 'true' 비교)에 기대지
 * 않도록, 그 파이프를 끈 채와 켠 채 모두 HTTP 로 쏘아 잰다. DB 는 타지 않는다 —
 * 서비스는 받은 인자만 기록한다.
 */
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setPipe } from '@weaver2/common/global/pipe';
import { EmailController } from './email.controller';
import { EmailBusinessService } from '../services/email-business.service';
import { EmailLogService } from '../services/email-log.service';
import { EmailTemplateService } from '../services/email-template.service';

describe.each([
  ['전역 파이프 없이', false],
  ['전역 ValidationPipe 와 함께', true],
])(
  'EmailController GET /v1/email/templates activeOnly (%s)',
  (_label, withPipe) => {
    let app: INestApplication;
    const findAllTemplates = jest.fn().mockResolvedValue([]);

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [EmailController],
        providers: [
          { provide: EmailBusinessService, useValue: {} },
          { provide: EmailLogService, useValue: {} },
          { provide: EmailTemplateService, useValue: { findAllTemplates } },
        ],
      }).compile();
      app = moduleRef.createNestApplication();
      app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
      if (withPipe) setPipe(app);
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => findAllTemplates.mockClear());

    it.each([
      ['', true],
      ['?activeOnly=true', true],
      ['?activeOnly=false', false],
    ])('%s → findAllTemplates(%s)', async (query, expected) => {
      await request(app.getHttpServer())
        .get(`/v1/email/templates${query}`)
        .expect(200);

      expect(findAllTemplates).toHaveBeenCalledWith(expected);
    });
  },
);
