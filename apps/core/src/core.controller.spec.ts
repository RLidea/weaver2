import { Test, TestingModule } from '@nestjs/testing';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';

describe('CoreController', () => {
  let coreController: CoreController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CoreController],
      providers: [CoreService],
    }).compile();

    coreController = app.get<CoreController>(CoreController);
  });

  describe('root', () => {
    it('should return "Hello Weaver2!"', () => {
      expect(coreController.getHello()).toBe('Hello Weaver2!');
    });
  });
});
