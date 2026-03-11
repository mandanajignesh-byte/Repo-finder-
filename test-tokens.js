/**
 * Quick test to verify tokens are loaded correctly
 */
require('dotenv').config();

const tokenString = process.env.GITHUB_TOKENS || process.env.GITHUB_TOKEN || '';
const tokens = tokenString.split(',').map(t => t.trim()).filter(Boolean);

console.log('🔑 Token Status:');
console.log(`   Total tokens: ${tokens.length}`);
console.log(`   Tokens loaded: ${tokens.length > 0 ? '✅' : '❌'}`);

if (tokens.length > 0) {
  console.log(`\n   First token: ${tokens[0].substring(0, 10)}...`);
  console.log(`   Last token: ${tokens[tokens.length - 1].substring(0, 10)}...`);
  console.log(`\n✅ Ready for parallel ingestion!`);
} else {
  console.log('\n❌ No tokens found. Check your .env file.');
  process.exit(1);
}
