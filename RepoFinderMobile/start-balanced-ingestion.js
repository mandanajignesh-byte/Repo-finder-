/**
 * Fast Background Ingestion Starter
 * Runs the balanced ingestion in the background with optimized settings
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'ingestion.log');
const errorLogFile = path.join(__dirname, 'ingestion-errors.log');

console.log('🚀 Starting Fast Balanced Ingestion...');
console.log(`📝 Logs: ${logFile}`);
console.log(`❌ Errors: ${errorLogFile}`);
console.log('⏰ This will run until 20,000 repos are ingested.\n');

// Create log streams
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
const errorStream = fs.createWriteStream(errorLogFile, { flags: 'a' });

// Start the ingestion process
const child = spawn('node', ['ingest-balanced.js', '--cluster=all'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true
});

// Log stdout
child.stdout.on('data', (data) => {
  const message = data.toString();
  process.stdout.write(message);
  logStream.write(message);
});

// Log stderr
child.stderr.on('data', (data) => {
  const message = data.toString();
  process.stderr.write(message);
  errorStream.write(message);
});

// Handle completion
child.on('close', (code) => {
  const message = `\n\n✅ Ingestion process completed with code ${code}\n`;
  console.log(message);
  logStream.write(message);
  logStream.end();
  errorStream.end();
  
  if (code === 0) {
    console.log('🎉 All repos successfully ingested!');
  } else {
    console.log('⚠️  Process exited with errors. Check logs for details.');
  }
});

// Handle errors
child.on('error', (error) => {
  const message = `\n❌ Failed to start ingestion: ${error.message}\n`;
  console.error(message);
  errorStream.write(message);
  errorStream.end();
  logStream.end();
});

// Keep process running
child.unref();

console.log('✅ Ingestion started in background!');
console.log('💤 You can close this window - the process will continue running.');
console.log('📊 Check progress: tail -f ingestion.log');
