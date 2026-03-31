import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, TableOfContents, AlignmentType } from "docx";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

const EXCLUDE_DIRS = ["node_modules", ".git", "dist", ".next", "coverage", "build"];
const EXCLUDE_FILES = [".DS_Store", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".env"];
const INCLUDE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md", ".html", ".rules"];

async function getFileTree(dir: string, prefix = ""): Promise<string> {
  let tree = "";
  const files = await fs.readdir(dir, { withFileTypes: true });
  
  const filteredFiles = files.filter(f => !EXCLUDE_DIRS.includes(f.name) && !EXCLUDE_FILES.includes(f.name));

  for (let i = 0; i < filteredFiles.length; i++) {
    const file = filteredFiles[i];
    const isLast = i === filteredFiles.length - 1;
    const connector = isLast ? "└── " : "├── ";
    
    tree += `${prefix}${connector}${file.name}\n`;
    
    if (file.isDirectory()) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      tree += await getFileTree(path.join(dir, file.name), newPrefix);
    }
  }
  return tree;
}

async function getAllFiles(dir: string, allFiles: { path: string; name: string }[] = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file.name)) {
        await getAllFiles(fullPath, allFiles);
      }
    } else {
      if (!EXCLUDE_FILES.includes(file.name) && INCLUDE_EXTENSIONS.includes(path.extname(file.name))) {
        allFiles.push({ path: fullPath, name: path.relative(rootDir, fullPath) });
      }
    }
  }
  return allFiles;
}

function getFileExplanation(filePath: string): string {
  const name = path.basename(filePath);
  const ext = path.extname(filePath);
  
  if (filePath.includes("src/components")) {
    return `This is a React component located in the components directory. It handles a specific part of the user interface, promoting reusability and modularity. It connects with other components and pages by being imported and rendered where needed.`;
  }
  if (filePath.includes("src/pages")) {
    return `This file represents a page in the application. It typically composes multiple components to form a complete view and handles page-level logic and state. It is integrated into the application's routing system.`;
  }
  if (filePath.includes("src/store") || filePath.includes("src/contexts")) {
    return `This file manages global state or provides context to the application. It allows different parts of the app to share data and logic without prop drilling.`;
  }
  if (filePath.includes("src/utils") || filePath.includes("src/lib")) {
    return `This file contains utility functions or library initializations (like Firebase or API clients) used throughout the project to keep the code DRY and organized.`;
  }
  if (filePath.includes("server/")) {
    return `This is a backend file part of the Express server. It handles API requests, database interactions, or server-side logic.`;
  }
  if (name === "package.json") {
    return `The manifest file for the project, defining dependencies, scripts, and project metadata.`;
  }
  if (name === "vite.config.ts") {
    return `Configuration file for Vite, the build tool and development server used for the frontend.`;
  }
  if (name === "firestore.rules") {
    return `Security rules for Firebase Firestore, defining who can read and write data.`;
  }
  
  return `A source file contributing to the project's functionality or configuration.`;
}

router.get("/generate", async (req, res) => {
  try {
    const tree = await getFileTree(rootDir);
    const files = await getAllFiles(rootDir);
    
    const sections = [];

    // Title Page
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          text: "SkillStudio Project Documentation",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: "Generated on: " + new Date().toLocaleString(),
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "", spacing: { before: 400 } }),
        new Paragraph({
          text: "Project Overview",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: "SkillStudio is a comprehensive Learning Management System (LMS) designed to help users organize, import, and consume educational content from various sources including local files, Google Drive, and YouTube. It features a modern React-based workspace, an administrative dashboard for user management, and a robust course player.",
        }),
        new Paragraph({ text: "", spacing: { before: 400 } }),
        new Paragraph({
          text: "Folder Structure",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: tree,
              font: "Courier New",
              size: 20,
            }),
          ],
        }),
      ],
    });

    // Setup Guide
    const setupGuide = [
      new Paragraph({ text: "Step-by-Step Setup Guide", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "1. Clone the repository to your local machine." }),
      new Paragraph({ text: "2. Install dependencies by running 'npm install'." }),
      new Paragraph({ text: "3. Set up your environment variables in a .env file (refer to .env.example)." }),
      new Paragraph({ text: "4. Configure your Firebase project and update firebase-applet-config.json." }),
      new Paragraph({ text: "5. Start the development server using 'npm run dev'." }),
      new Paragraph({ text: "6. Build for production using 'npm run build' and start with 'npm start'." }),
    ];

    // Features Breakdown
    const features = [
      new Paragraph({ text: "Features Breakdown", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "• Authentication: Secure user login and registration using Firebase Authentication.", bullet: { level: 0 } }),
      new Paragraph({ text: "• Workspace: A centralized hub for users to view and manage their imported courses.", bullet: { level: 0 } }),
      new Paragraph({ text: "• Course Import: Multi-source import system supporting local folders, Google Drive, and YouTube playlists.", bullet: { level: 0 } }),
      new Paragraph({ text: "• Course Player: Advanced player supporting video playback and PDF viewing with progress tracking.", bullet: { level: 0 } }),
      new Paragraph({ text: "• Admin Panel: Dashboard for administrators to manage users and monitor platform activity.", bullet: { level: 0 } }),
    ];

    // Source Code Files
    const codeSections = [new Paragraph({ text: "Source Code Files", heading: HeadingLevel.HEADING_1 })];
    
    for (const file of files) {
      const content = await fs.readFile(file.path, "utf-8");
      const explanation = getFileExplanation(file.name);
      
      codeSections.push(
        new Paragraph({
          text: `File: ${file.name}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400 },
        }),
        new Paragraph({
          text: "Explanation:",
          heading: HeadingLevel.HEADING_3,
        }),
        new Paragraph({
          text: explanation,
        }),
        new Paragraph({
          text: "Source Code:",
          heading: HeadingLevel.HEADING_3,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: content,
              font: "Courier New",
              size: 16,
            }),
          ],
          shading: {
            fill: "F4F4F4",
          },
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            ...sections[0].children,
            ...setupGuide,
            ...features,
            ...codeSections,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=SkillStudio_Documentation.docx");
    res.send(buffer);

  } catch (error) {
    console.error("Error generating doc:", error);
    res.status(500).json({ error: "Failed to generate documentation" });
  }
});

export default router;
