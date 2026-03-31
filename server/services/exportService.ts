import fs from 'fs';
import path from 'path';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  BorderStyle, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType 
} from 'docx';

const IGNORE_PATTERNS = [
  "node_modules",
  ".env",
  ".git",
  "dist",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".DS_Store",
  ".vscode",
  "build",
  "sw.js",
  "exportService.ts",
  "exportRoutes.ts",
  "DownloadProjectButton.tsx",
  "test.txt",
  "untitled.tsx",
  "untitled-1.tsx",
  "untitled",
  "temp",
  "tmp",
  ".cache",
  "coverage",
  ".nyc_output",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".webm",
  ".wav",
  ".mp3",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".rar",
  ".7z"
];

const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit for individual files in doc
const MAX_TOTAL_FILES = 500; // Increased limit for total files

function sanitizeText(text: string): string {
  // Remove non-printable characters except common whitespace
  return text.replace(/[^\x20-\x7E\t\n\r]/g, '');
}

function isBinary(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot',
    '.mp4', '.webm', '.wav', '.mp3',
    '.pdf', '.zip', '.gz', '.tar', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib', '.bin'
  ];
  return binaryExtensions.includes(ext);
}

function shouldIgnore(filePath: string): boolean {
  const relativePath = path.relative(process.cwd(), filePath);
  const fileName = path.basename(filePath);
  
  if (isBinary(filePath)) return true;
  
  // Check if any part of the path or the filename matches the ignore patterns
  const isIgnored = IGNORE_PATTERNS.some(pattern => {
    const lowerPattern = pattern.toLowerCase();
    // Match exact filename or directory name, or if it's contained in the path
    const parts = relativePath.split(path.sep);
    return (
      parts.some(part => part.toLowerCase() === lowerPattern) ||
      fileName.toLowerCase().includes(lowerPattern) ||
      (lowerPattern.includes('.') && fileName.toLowerCase() === lowerPattern)
    );
  });

  if (isIgnored) {
    return true;
  }

  return false;
}

function fileNameMatches(fileName: string, pattern: string): boolean {
  return fileName.toLowerCase().includes(pattern.toLowerCase());
}

async function getFiles(dir: string, allFiles: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    const stats = fs.statSync(name);
    
    if (stats.isDirectory()) {
      if (!shouldIgnore(name)) {
        await getFiles(name, allFiles);
      }
    } else {
      if (!shouldIgnore(name)) {
        allFiles.push(name);
      }
    }
  }
  return allFiles;
}

function generateTree(dir: string, prefix = ''): string {
  let tree = '';
  const files = fs.readdirSync(dir);
  
  const filteredFiles = files
    .filter(file => !shouldIgnore(path.join(dir, file)))
    .sort((a, b) => {
      const aPath = path.join(dir, a);
      const bPath = path.join(dir, b);
      const aIsDir = fs.statSync(aPath).isDirectory();
      const bIsDir = fs.statSync(bPath).isDirectory();
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
  
  filteredFiles.forEach((file, index) => {
    const isLast = index === filteredFiles.length - 1;
    const name = path.join(dir, file);
    const isDir = fs.statSync(name).isDirectory();
    
    tree += `${prefix}${isLast ? '└── ' : '├── '}${isDir ? '📁 ' : '📄 '}${file}${isDir ? '/' : ''}\n`;
    
    if (isDir) {
      tree += generateTree(name, `${prefix}${isLast ? '    ' : '│   '}`);
    }
  });
  
  return tree;
}

function getFileExplanation(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath);
  const fileName = path.basename(filePath);
  
  if (fileName === 'package.json') return 'This file defines the project dependencies, scripts, and metadata. It is the heart of the Node.js project configuration.';
  if (fileName === 'vite.config.ts') return 'Configuration for Vite, handling the frontend build process, plugins, and development server settings.';
  if (fileName === 'server.ts') return 'The main entry point for the backend server. It initializes Express, sets up middleware, and connects routes.';
  if (fileName === 'tsconfig.json') return 'TypeScript configuration file defining compiler options and project boundaries.';
  if (fileName === 'tailwind.config.js') return 'Configuration for Tailwind CSS, defining themes, variants, and content paths.';
  
  if (relativePath.startsWith('src/components')) {
    return `A reusable React component for ${fileName.split('.')[0]}. It handles specific UI logic and rendering for this part of the application.`;
  }
  if (relativePath.startsWith('src/pages')) {
    return `A main page component for ${fileName.split('.')[0]}. It represents a specific route or view in the application.`;
  }
  if (relativePath.startsWith('src/contexts')) {
    return `A React Context provider for ${fileName.split('.')[0]}. It manages global state and provides it to the component tree.`;
  }
  if (relativePath.startsWith('src/services')) {
    return `Service layer for ${fileName.split('.')[0]}. It handles API calls, data transformations, or complex business logic.`;
  }
  if (relativePath.startsWith('src/lib')) {
    return `Library initialization or utility functions for ${fileName.split('.')[0]}. It provides shared logic across the frontend.`;
  }
  if (relativePath.startsWith('server/routes')) {
    return `Express route definitions for ${fileName.split('.')[0]}. It maps HTTP endpoints to specific controller logic.`;
  }
  
  return `Source code for ${relativePath}. This file contributes to the overall functionality of the project.`;
}

export async function generateProjectDoc() {
  const rootDir = process.cwd();
  // Ensure we get a unique list of files
  const rawFiles = await getFiles(rootDir);
  let files = Array.from(new Set(rawFiles)).sort((a, b) => a.localeCompare(b));
  
  if (files.length > MAX_TOTAL_FILES) {
    console.warn(`[Export] Too many files (${files.length}), limiting to ${MAX_TOTAL_FILES}`);
    files = files.slice(0, MAX_TOTAL_FILES);
  }

  const tree = `📁 project-root/\n${generateTree(rootDir)}`;

  const sections = [];

  // Project Structure Section
  sections.push({
    children: [
      new Paragraph({
        text: "Project Structure",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: tree,
            font: "Consolas",
            size: 20, // 10pt
          }),
        ],
        spacing: { before: 200, after: 400 },
      }),
    ],
  });

  // Source Code Section
  const sourceCodeChildren: any[] = [
    new Paragraph({
      text: "Source Code",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 800, after: 400 },
    }),
  ];

  let processedCount = 0;
  for (const file of files) {
    const relativePath = path.relative(rootDir, file);
    
    // SAFE FILE READING
    let content: string;
    try {
      const stats = fs.statSync(file);
      if (stats.size > MAX_FILE_SIZE) {
        console.log(`[Export] Skipping file (too large): ${relativePath} (${stats.size} bytes)`);
        continue;
      }

      // Use readFileSync for reliable, synchronous reading as requested
      content = fs.readFileSync(file, 'utf-8');
    } catch (err) {
      console.error(`[Export] Failed to read file: ${relativePath}`, err);
      continue;
    }
    
    // VALIDATION STEP
    if (!content || content.trim().length === 0) {
      console.log(`[Export] Skipping empty or unreadable file: ${relativePath}`);
      continue;
    }

    // Log for verification
    console.log(`[Export] Processing: ${relativePath} | Chars: ${content.length}`);
    
    processedCount++;
    
    sourceCodeChildren.push(
      new Paragraph({
        text: `📄 ${relativePath}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 600, after: 200 },
      })
    );

    // Source Code Block
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    
    // No line limit for "COMPLETE and ACCURATE" code
    lines.forEach(line => {
      const sanitizedLine = sanitizeText(line).replace(/\t/g, '    ');
      
      sourceCodeChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: sanitizedLine, 
              font: "Consolas",
              size: 21, // ~10.5pt
            }),
          ],
          spacing: { before: 0, after: 0 },
        })
      );
    });
  }

  if (processedCount === 0) {
    sourceCodeChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "No source files were found or processed.",
            italics: true,
          }),
        ],
      })
    );
  }

  sections.push({ children: sourceCodeChildren });

  try {
    console.log(`[Export] Creating Document with ${sections.length} sections...`);
    const doc = new Document({
      sections: sections,
    });

    console.log(`[Export] Packing document to buffer...`);
    const buffer = await Packer.toBuffer(doc);
    console.log(`[Export] Successfully generated documentation (${buffer.length} bytes).`);
    return buffer;
  } catch (err) {
    console.error(`[Export] Failed to pack document:`, err);
    throw err;
  }
}
