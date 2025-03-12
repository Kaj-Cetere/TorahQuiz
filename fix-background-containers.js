const fs = require('fs');
const path = require('path');

// Define the root directory to search in
const rootDir = path.join(__dirname, 'src');

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

// Function to fix background container in layout files
function fixBackgroundContainer(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern 1: Fix absolute positioning to fixed
    const absolutePattern = /<div className="absolute inset-0 bg-subtle-blue-gradient"><\/div>/g;
    let updatedContent = content.replace(absolutePattern, '<div className="bg-subtle-blue-gradient"></div>');
    
    // Pattern 2: Fix overflow and positioning in parent containers
    const overflowPattern = /<div className="absolute inset-0 overflow-hidden pointer-events-none">/g;
    updatedContent = updatedContent.replace(overflowPattern, '<div className="fixed inset-0 overflow-hidden pointer-events-none z-0">');
    
    // Only save if we made changes
    if (content !== updatedContent) {
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
  console.log('🔍 Searching for layout files with background containers...');
  const files = findFiles(rootDir);
  console.log(`📁 Found ${files.length} files to scan.`);
  
  let fixedCount = 0;
  
  for (const file of files) {
    if (fixBackgroundContainer(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✨ Done! Fixed background containers in ${fixedCount} files.`);
}

main(); 