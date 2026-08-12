import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react',
              message: 'Use @phosphor-icons/react for the shared frontend icon system.',
            },
            {
              name: 'phosphor-react',
              message: 'Use the maintained @phosphor-icons/react package instead.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'dist/**', 'next-env.d.ts']),
]);
