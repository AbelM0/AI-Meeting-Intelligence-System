import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { NotionTokenCipherService } from './notion-token-cipher.service';

function cipher(): NotionTokenCipherService {
  return new NotionTokenCipherService(
    new ConfigService({ NOTION_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 11).toString('base64') }),
  );
}

void test('encrypts Notion tokens with randomized authenticated ciphertext', () => {
  const tokenCipher = cipher();
  const first = tokenCipher.encrypt('secret-access-token');
  const second = tokenCipher.encrypt('secret-access-token');

  assert.notEqual(first, second);
  assert.equal(tokenCipher.decrypt(first), 'secret-access-token');
  assert.equal(first.includes('secret-access-token'), false);
});

void test('rejects tampered Notion token ciphertext', () => {
  const tokenCipher = cipher();
  const encrypted = tokenCipher.encrypt('secret-access-token');
  const parts = encrypted.split('.');
  parts[3] = `${parts[3][0] === 'A' ? 'B' : 'A'}${parts[3].slice(1)}`;
  assert.throws(() => tokenCipher.decrypt(parts.join('.')));
});
