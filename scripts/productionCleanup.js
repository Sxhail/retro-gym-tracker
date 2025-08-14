#!/usr/bin/env node

/**
 * Production Cleanup Script
 * Removes or replaces development-only console statements with proper logging
 */

const fs = require('fs');
const path = require('path');

// Directories to clean
const dirsToClean = [
  'app',
  'components', 
  'services',
  'hooks',
  'context'
];

// Patterns to clean up
const cleanupPatterns = [
  // Remove debug console.log statements
  {
    pattern: /console\.log\(['"].*debug.*['"][^)]*\);?\s*\n?/gi,
    replacement: '',
    description: 'Remove debug console.log statements'
  },
  // Remove console.log with simple string messages
  {
    pattern: /console\.log\(['"][^'"]*['"][^)]*\);?\s*\n?/gi,
    replacement: '',
    description: 'Remove simple console.log statements'
  },
  // Replace interval: any with proper type
  {
    pattern: /let interval: any;/g,
    replacement: 'let interval: NodeJS.Timeout | null = null;',
    description: 'Fix interval type from any to proper NodeJS.Timeout'
  }
];

// File extensions to process
const fileExtensions = ['.ts', '.tsx'];

/**
 * Get all files recursively
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function(file) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      if (fileExtensions.some(ext => file.endsWith(ext))) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

/**
 * Clean up a single file
 */
function cleanupFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  cleanupPatterns.forEach(({ pattern, replacement, description }) => {
    const originalContent = content;
    content = content.replace(pattern, replacement);
    
    if (originalContent !== content) {
      changed = true;
      console.log(`  ✓ ${description} in ${path.basename(filePath)}`);
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

/**
 * Main cleanup function
 */
function runCleanup() {
  console.log('🧹 Starting production cleanup...\n');
  
  let totalFilesProcessed = 0;
  let totalFilesChanged = 0;
  
  dirsToClean.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    
    if (!fs.existsSync(dirPath)) {
      console.log(`⚠️  Directory ${dir} doesn't exist, skipping...`);
      return;
    }
    
    console.log(`📁 Cleaning ${dir}/`);
    
    const files = getAllFiles(dirPath);
    
    files.forEach(filePath => {
      totalFilesProcessed++;
      if (cleanupFile(filePath)) {
        totalFilesChanged++;
      }
    });
  });
  
  console.log(`\n✅ Cleanup complete!`);
  console.log(`📊 Files processed: ${totalFilesProcessed}`);
  console.log(`🔧 Files changed: ${totalFilesChanged}`);
  
  if (totalFilesChanged === 0) {
    console.log('🎉 Codebase is already clean!');
  }
}

// Run cleanup if called directly
if (require.main === module) {
  runCleanup();
}

module.exports = { runCleanup };
