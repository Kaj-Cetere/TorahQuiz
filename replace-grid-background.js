const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the root directory to search in
const rootDir = path.join(__dirname, 'src');

// The pattern to search for and replace
const searchPattern = /<div className="absolute inset-0 bg-\[url\('\/grid-pattern\.svg'\)\] opacity-3"><\/div>/g;
const replacement = '<div className="absolute inset-0 bg-subtle-blue-gradient"></div>';

// Function to recursively find all .tsx and .jsx files
function findFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath));
    } else if ((entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) && !entry.name.includes('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to replace content in a file
function replaceInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (searchPattern.test(content)) {
      const updatedContent = content.replace(searchPattern, replacement);
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  console.log('🔍 Searching for files with grid background...');
  const files = findFiles(rootDir);
  console.log(`📁 Found ${files.length} files to scan.`);
  
  let replacedCount = 0;
  
  for (const file of files) {
    if (replaceInFile(file)) {
      replacedCount++;
    }
  }
  
  console.log(`\n✨ Done! Replaced grid background in ${replacedCount} files.`);
}

main(); 