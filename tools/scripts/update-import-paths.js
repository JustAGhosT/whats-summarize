import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '..', '..', 'apps', 'web', 'src').replace(/\\/g, '/');

// Define the import mappings
const IMPORT_MAPPINGS = [
  { 
    pattern: /^@\/components\/ui\/(.*)/, 
    replacement: '@convolens/ui/components/$1',
    description: 'UI components'
  },
  { 
    pattern: /^@\/lib\/utils/, 
    replacement: '@convolens/ui/lib/utils',
    description: 'Utility functions'
  },
  { 
    pattern: /^@\/hooks\/use-toast/, 
    replacement: '@convolens/ui/hooks/use-toast',
    description: 'Toast hook'
  },
  { 
    pattern: /^@\/hooks\/use-click-outside/, 
    replacement: '@convolens/ui/hooks/use-click-outside',
    description: 'Click outside hook'
  },
  { 
    pattern: /^@\/hooks\/use-dark-mode/, 
    replacement: '@convolens/ui/hooks/use-dark-mode',
    description: 'Dark mode hook'
  }
];

async function updateImportsInFile(filePath) {
  let content = await fs.readFile(filePath, 'utf-8');
  let updated = false;
  const changes = [];

  // Process each import mapping
  for (const { pattern, replacement, description } of IMPORT_MAPPINGS) {
    // Handle different import styles:
    // 1. import x from '@/path'
    // 2. import { x } from '@/path'
    // 3. from '@/path'
    const importPatterns = [
      // import x from '@/path'
      `(import\\s+[^'"\s]+\\s+from\\s+['\"])${pattern.source}(['\"])`,
      // import { x } from '@/path'
      `(import\\s*\\{[^}]*\\}\\s+from\\s+['\"])${pattern.source}(['\"])`,
      // from '@/path'
      `(from\\s+['\"])${pattern.source}(['\"])`
    ];

    for (const patternStr of importPatterns) {
      const regex = new RegExp(patternStr, 'g');
      
      const newContent = content.replace(regex, (match, prefix, quote) => {
        updated = true;
        changes.push(`  - ${match} → ${prefix}${replacement}${quote} (${description})`);
        return `${prefix}${replacement}${quote}`;
      });

      if (newContent !== content) {
        content = newContent;
      }
    }
  }

  if (updated) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`\n📝 Updated imports in ${path.relative(process.cwd(), filePath)}:`);
    changes.forEach(change => console.log(change));
    return true;
  }
  return false;
}

async function main() {
  console.log('Starting to update import paths...');
  
  console.log(`Source directory: ${SOURCE_DIR}`);
  
  // Find all TypeScript and JavaScript files
  const files = await glob([
    `${SOURCE_DIR}/**/*.{ts,tsx,js,jsx}`,
    `!${SOURCE_DIR}/**/node_modules/**`,
    `!${SOURCE_DIR}/**/dist/**`,
    `!${SOURCE_DIR}/**/.next/**`
  ], { windowsPathsNoEscape: true });
  
  console.log(`Found ${files.length} files to process in ${SOURCE_DIR}`);

  console.log(`Found ${files.length} files to process`);
  
  let updatedCount = 0;
  
  for (const file of files) {
    const updated = await updateImportsInFile(file);
    if (updated) {
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Import path update complete!`);
  console.log(`- Processed ${files.length} files`);
  console.log(`- Updated ${updatedCount} files`);
}

main().catch(console.error);
