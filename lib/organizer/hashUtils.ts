import fs from 'fs';
import crypto from 'crypto';

export const hashFile = (filePath: string) =>
  new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', error => reject(error));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
