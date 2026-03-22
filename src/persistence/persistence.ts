import fs from 'fs';

export type ReadResult<T> =
  | { status: 'loaded'; data: Partial<T> }
  | { status: 'missing' }
  | { status: 'corrupt'; rawContent: string };

export function readJsonFile<T>(filePath: string): ReadResult<T> {
  if (!fs.existsSync(filePath)) {
    return { status: 'missing' };
  }
  const rawContent = fs.readFileSync(filePath, 'utf8');
  try {
    return { status: 'loaded', data: JSON.parse(rawContent) as Partial<T> };
  } catch {
    return { status: 'corrupt', rawContent };
  }
}
