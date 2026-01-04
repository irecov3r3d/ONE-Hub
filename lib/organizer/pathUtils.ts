import path from 'path';

export const getOrganizerRoot = () => {
  return process.env.ORGANIZER_ROOT
    ? path.resolve(process.env.ORGANIZER_ROOT)
    : path.resolve(process.cwd());
};

export const resolveSafePath = (inputPath: string) => {
  const root = getOrganizerRoot();
  const resolved = path.resolve(root, inputPath || '.');

  if (!resolved.startsWith(root)) {
    throw new Error('Path is outside of organizer root');
  }

  return { root, resolved };
};

export const toRelativePath = (absolutePath: string) => {
  const root = getOrganizerRoot();
  return path.relative(root, absolutePath);
};
