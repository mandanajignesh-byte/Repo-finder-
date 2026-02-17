# Parallel Ingestion Guide

## 🚀 Overview

The parallel ingestion system uses **10 GitHub API tokens** to process repositories **10x faster** than single-token ingestion.

## ⚡ Speed Improvement

- **Single Token**: ~10-15 repos/minute
- **10 Tokens (Parallel)**: ~100-150 repos/minute
- **Expected Time for 20,000 repos**: ~2-3 hours (vs 20+ hours with single token)

## 📋 Setup

### 1. Tokens Configured

All 10 tokens are already configured in your `.env` file:
```
GITHUB_TOKENS=token1,token2,token3,...,token10
```

### 2. Verify Tokens

Test that tokens are loaded:
```bash
node test-tokens.js
```

## 🎯 Usage

### Run Parallel Ingestion

**Option 1: Using batch file (Windows)**
```bash
run-parallel-ingestion.bat
```

**Option 2: Direct command**
```bash
node ingest-balanced-parallel.js --cluster=all
```

**Option 3: Specific cluster**
```bash
node ingest-balanced-parallel.js --cluster=ai_ml
```

## 🔧 How It Works

1. **Token Pool**: Rotates through 10 tokens automatically
2. **Parallel Search**: Multiple tokens search GitHub simultaneously
3. **Parallel Processing**: Repos are processed in batches across workers
4. **Rate Limit Handling**: Automatically switches tokens when rate limited
5. **Smart Distribution**: Maintains balanced distribution across all quotas

## 📊 Features

- ✅ **10 parallel workers** (one per token)
- ✅ **Automatic token rotation**
- ✅ **Rate limit detection and handling**
- ✅ **Parallel search queries**
- ✅ **Batch processing** for database operations
- ✅ **Same quota tracking** as original script
- ✅ **Full enrichment** (clusters, tech stack, complexity, activity, health, badges, gems)

## 🎛️ Configuration

The script automatically:
- Detects number of tokens from `GITHUB_TOKENS`
- Uses up to 10 workers (one per token)
- Distributes work evenly across tokens
- Handles rate limits per token

## 📈 Monitoring

The script shows progress every 50 repos:
```
✅ Ingested 50 repos | Total: 150/2000
```

## ⚠️ Notes

1. **Rate Limits**: Each token has 5,000 requests/hour
   - With 10 tokens: 50,000 requests/hour total
   - Much higher throughput than single token

2. **Database**: Same Supabase database, thread-safe operations

3. **Idempotency**: Safe to restart - won't create duplicates

4. **Enrichment**: All repos are fully enriched (same as original script)

## 🐛 Troubleshooting

**No tokens found?**
- Check `.env` file has `GITHUB_TOKENS=...`
- Run `node test-tokens.js` to verify

**Rate limited?**
- Script automatically switches tokens
- If all tokens are rate limited, it will wait

**Slow performance?**
- Check network connection
- Verify tokens are valid
- Check Supabase connection

## 🎉 Expected Results

With 10 tokens, you should see:
- **10x faster ingestion** than single token
- **~100-150 repos/minute** processing speed
- **Complete enrichment** for all repos
- **Balanced distribution** across all quotas

## 📝 Next Steps

1. Run the parallel ingestion: `run-parallel-ingestion.bat`
2. Monitor progress in the terminal
3. Check status: `node check-status.js`
4. Let it run overnight to complete all 20,000 repos!
