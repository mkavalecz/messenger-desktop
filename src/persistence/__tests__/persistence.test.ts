import fs from 'fs';
import os from 'os';
import path from 'path';
import { readJsonFile } from '../persistence';

describe('readJsonFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'messenger-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns missing when file does not exist', () => {
    const result = readJsonFile(path.join(tmpDir, 'nonexistent.json'));
    expect(result.status).toBe('missing');
  });

  it('returns loaded with parsed data when file contains valid JSON', () => {
    const filePath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(filePath, JSON.stringify({ foo: 'bar', num: 42 }));

    const result = readJsonFile<{ foo: string; num: number }>(filePath);
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.data.foo).toBe('bar');
      expect(result.data.num).toBe(42);
    }
  });

  it('returns corrupt with rawContent when file contains invalid JSON', () => {
    const filePath = path.join(tmpDir, 'broken.json');
    const badContent = '{not valid json}';
    fs.writeFileSync(filePath, badContent);

    const result = readJsonFile(filePath);
    expect(result.status).toBe('corrupt');
    if (result.status === 'corrupt') {
      expect(result.rawContent).toBe(badContent);
    }
  });

  it('returns loaded with empty object when file contains empty JSON object', () => {
    const filePath = path.join(tmpDir, 'empty.json');
    fs.writeFileSync(filePath, '{}');

    const result = readJsonFile(filePath);
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.data).toEqual({});
    }
  });

  it('returns corrupt when file is empty', () => {
    const filePath = path.join(tmpDir, 'empty-file.json');
    fs.writeFileSync(filePath, '');

    const result = readJsonFile(filePath);
    expect(result.status).toBe('corrupt');
  });
});
