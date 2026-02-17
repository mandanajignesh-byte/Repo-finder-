# Database Setup - Fix Missing `repos` Table

## Issue
Error: `Could not find the table 'public.repos' in the schema cache`

The `repos` table hasn't been created in Supabase yet.

## Solution

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Schema
1. Open the file: `supabase-repos-schema.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Table Created
1. Go to **Table Editor** in Supabase
2. You should see the `repos` table
3. Check that all columns are present

## Quick SQL to Run

Just copy and paste this entire file content into Supabase SQL Editor:

**File:** `supabase-repos-schema.sql`

After running, the ingestion script will work!
