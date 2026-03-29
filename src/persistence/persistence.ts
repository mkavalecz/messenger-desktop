import fs from 'fs';

export type ReadResult<T> =
  | { status: 'loaded'; data: Partial<T> }
  | { status: 'missing' }
  | { status: 'corrupt'; rawContent: string };

export function readJsonFile<T>(filePath: string): ReadResult<T> {
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return { status: 'missing' };
    }
    throw e;
  }
  try {
    return { status: 'loaded', data: JSON.parse(rawContent) as Partial<T> };
  } catch {
    return { status: 'corrupt', rawContent };
  }
}
