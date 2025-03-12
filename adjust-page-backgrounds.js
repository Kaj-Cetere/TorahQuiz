const fs = require('fs');
const path = require('path');

// Define the root directory to search in
const rootDir = path.join(__dirname, 'src', 'app');

// Function to recursively find all .tsx and .jsx files
function findFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        files.push(...findFiles(fullPath));
      }
    } else if ((entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) && 
               !entry.name.includes('.d.ts') && 
               entry.name !== 'layout.tsx') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to adjust page background handling
function adjustPageBackground(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Remove background div elements since they're now in the root layout
    const patterns = [
      /<div className="bg-subtle-blue-gradient"><\/div>/g,
      /<div className="fixed inset-0 overflow-hidden pointer-events-none z-0">[\s\S]*?<div className="bg-subtle-blue-gradient"><\/div>[\s\S]*?<\/div>/g
    ];
    
    let updatedContent = content;
    let changed = false;
    
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        // For the second pattern (container with multiple elements),
        // we want to keep the decorative elements but remove the background div
        if (pattern === patterns[1]) {
          updatedContent = updatedContent.replace(pattern, (match) => {
            // Keep the container and other child elements, but remove the background div
            return match.replace(/<div className="bg-subtle-blue-gradient"><\/div>/, '');
          });
        } else {
          // For the first pattern, just remove the background div completely
          updatedContent = updatedContent.replace(pattern, '');
        }
        changed = true;
      }
    });
    
    // If the page has a min-h-screen div that has a background color, keep the min-h-screen but remove the bg
    const minHeightPattern = /className="min-h-screen bg-gray-900/g;
    if (minHeightPattern.test(updatedContent)) {
      updatedContent = updatedContent.replace(minHeightPattern, 'className="min-h-screen');
      changed = true;
    }
    
    // Only save if we made changes
    if (changed) {
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
  console.log('🔍 Searching for page components to adjust background handling...');
  const files = findFiles(rootDir);
  console.log(`📁 Found ${files.length} files to scan.`);
  
  let adjustedCount = 0;
  
  for (const file of files) {
    if (adjustPageBackground(file)) {
      adjustedCount++;
    }
  }
  
  console.log(`\n✨ Done! Adjusted background handling in ${adjustedCount} files.`);
}

main(); 