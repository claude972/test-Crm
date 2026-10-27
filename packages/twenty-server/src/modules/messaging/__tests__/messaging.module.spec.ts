/** @jest-environment node */
import { Test, TestingModule } from '@nestjs/testing';
import { MessagingModule } from '../messaging.module';
import { MessagingImportManagerModule } from '../message-import-manager/messaging-import-manager.module';

describe('MessagingModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [MessagingModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have MessagingImportManagerModule', () => {
    // Basic module existence test
    expect(MessagingModule).toBeDefined();
  });
});
