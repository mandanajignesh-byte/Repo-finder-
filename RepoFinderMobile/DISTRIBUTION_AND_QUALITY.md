# Distribution & Quality Control Guide

## 📊 How Distribution Works

### 1. **Multi-Dimensional Quota System**

The system ensures balanced distribution across **5 dimensions**:

#### **A. Skill Level Distribution (per cluster)**
- **Beginner**: 25% (500 repos) - Tutorials, starters, learning resources
- **Intermediate**: 35% (700 repos) - Full apps, dashboards, projects
- **Advanced**: 25% (500 repos) - SaaS, engines, platforms
- **Infrastructure**: 15% (300 repos) - Frameworks, orchestration tools

**How it works:**
- Searches include keywords like "tutorial", "starter", "full app", "saas", "framework"
- Classifies repos based on description, topics, stars, and size

#### **B. Star Tier Distribution**
- **Tier 1** (0-100 stars): 10% (200 repos) - Hidden gems
- **Tier 2** (100-1k stars): 35% (700 repos) - Growing projects
- **Tier 3** (1k-10k stars): 35% (700 repos) - Popular repos
- **Tier 4** (10k+ stars): 20% (400 repos) - Very popular

**How it works:**
- Search queries include star filters: `stars:100..1000`
- Tracks current count per tier and prioritizes searches for under-represented tiers

#### **C. Language Distribution**
- **Python**: 30% (600 repos)
- **JavaScript/TypeScript**: 25% (500 repos)
- **Go**: 10% (200 repos)
- **Rust**: 10% (200 repos)
- **Java/Kotlin**: 10% (200 repos)
- **Other**: 15% (300 repos)

**How it works:**
- Searches include language filters: `language:python`, `language:rust`
- Detects primary language from GitHub languages API

#### **D. Repo Type Distribution**
- **Tutorials**: 20% (400 repos)
- **Boilerplates**: 20% (400 repos)
- **Full Apps**: 30% (600 repos)
- **Production SaaS**: 15% (300 repos)
- **Infrastructure**: 15% (300 repos)

**How it works:**
- Classifies based on README keywords and repo structure
- Uses keywords like "tutorial", "boilerplate", "app", "saas", "framework"

#### **E. Gems Distribution**
- **Target**: 5-12% per cluster (100-240 repos)
- **Criteria**: High quality but low visibility

**How it works:**
- Detects repos with: stars < 1000, health > 0.8, freshness > 0.7, docs > 0.7, contributors > 3
- Calculates gem_score and stores in `repo_gems` table

### 2. **Smart Search Strategy**

The system builds **multiple search strategies** and rotates through them:

1. **Skill Level + Topic**: `"machine-learning tutorial"`, `"devops dashboard"`
2. **Star Tier + Topic**: `"devops stars:100..1000"`
3. **Language + Topic**: `"devops language:rust"`
4. **Random combinations** for diversity

**Priority System:**
- Checks which quotas need repos
- Prioritizes searches that fill under-represented categories
- Switches strategies if no results found (prevents getting stuck)

### 3. **Real-Time Tracking**

- Tracks counts for each dimension in real-time
- Updates quotas after each repo is ingested
- Shows progress every 10 repos with full breakdown

---

## 🔍 Quality Filters

### **Current Quality Standards**

All repos must pass these filters:

#### **1. Minimum Stars: 10**
- Rejects repos with < 10 stars
- Ensures some community validation
- **Configurable**: `QUALITY_FILTERS.MIN_STARS`

#### **2. Minimum Forks: 1**
- Rejects repos with 0 forks
- Indicates some interest/usage
- **Configurable**: `QUALITY_FILTERS.MIN_FORKS`

#### **3. Activity Check**
- Rejects repos inactive for > 365 days
- Ensures repos are maintained
- **Configurable**: `QUALITY_FILTERS.MAX_DAYS_INACTIVE`

#### **4. Description Quality**
- Requires description length ≥ 20 characters
- Ensures repos have basic documentation
- **Configurable**: `QUALITY_FILTERS.MIN_DESCRIPTION_LENGTH`

#### **5. Archived Repos**
- Rejects archived repos (default: ON)
- Ensures active projects only
- **Configurable**: `QUALITY_FILTERS.REJECT_ARCHIVED`

#### **6. Fork Repos**
- Can reject forks (default: OFF - allows forks)
- Prevents duplicate content
- **Configurable**: `QUALITY_FILTERS.REJECT_FORKS`

#### **7. Excluded Organizations**
- Automatically skips major orgs:
  - facebook, google, microsoft, apple, amazon, netflix
  - uber, airbnb, twitter, meta, alibaba, tencent
- Focuses on underrated repos

### **Quality Scoring (Post-Ingestion)**

After ingestion, repos are scored:

#### **Health Score** (0-1.0)
- **Activity**: 25% - Based on last commit
- **Maintenance**: 20% - Issue closure rate
- **Community**: 20% - Stars, forks, contributors
- **Code Quality**: 15% - Tests, CI/CD presence
- **Documentation**: 10% - README quality
- **Stability**: 10% - Age and consistency

#### **Freshness Score** (0-1.0)
- Last commit within 30 days: 1.0
- 30-90 days: 0.85
- 90-180 days: 0.65
- 180-365 days: 0.45
- > 365 days: 0.25

#### **Badges**
Repos can earn badges:
- **well_maintained**: Health > 0.85
- **actively_updated**: Freshness > 0.85
- **beginner_friendly**: Tutorial + high docs
- **production_ready**: Health > 0.8 + Freshness > 0.7

---

## 🎯 How It Ensures Quality

### **1. Pre-Filtering (Before API Call)**
- Search queries include minimum star requirements
- Filters out low-quality repos at search time

### **2. Initial Quality Check (After Search)**
- Filters repos before fetching full details
- Saves API calls on obviously low-quality repos

### **3. Full Quality Check (After Fetching Details)**
- Re-checks with complete repo data
- Catches edge cases missed in initial check

### **4. Post-Ingestion Scoring**
- Calculates health, freshness, and quality scores
- Assigns badges for high-quality repos
- Detects "gems" (high quality, low visibility)

### **5. Continuous Monitoring**
- Tracks quality metrics in database
- Can filter/rank by quality scores in recommendations

---

## ⚙️ Customizing Quality Filters

Edit `QUALITY_FILTERS` in `ingest-balanced-parallel.js`:

```javascript
const QUALITY_FILTERS = {
  MIN_STARS: 10,              // Increase for higher quality
  MIN_FORKS: 1,                // Increase for more popular repos
  MAX_DAYS_INACTIVE: 365,      // Decrease for fresher repos
  MIN_DESCRIPTION_LENGTH: 20,  // Increase for better docs
  REJECT_ARCHIVED: true,       // Set false to allow archived
  REJECT_FORKS: false,         // Set true to reject forks
  MIN_SIZE_KB: 0              // Set > 0 to require minimum size
};
```

---

## 📈 Distribution Example

For a cluster with 2000 repos target:

```
Skill Levels:
  Beginner: 500 repos (25%)
  Intermediate: 700 repos (35%)
  Advanced: 500 repos (25%)
  Infrastructure: 300 repos (15%)

Star Tiers:
  Tier 1 (0-100): 200 repos (10%)
  Tier 2 (100-1k): 700 repos (35%)
  Tier 3 (1k-10k): 700 repos (35%)
  Tier 4 (10k+): 400 repos (20%)

Languages:
  Python: 600 repos (30%)
  JavaScript: 500 repos (25%)
  Go: 200 repos (10%)
  Rust: 200 repos (10%)
  Java: 200 repos (10%)
  Other: 300 repos (15%)

Repo Types:
  Tutorials: 400 repos (20%)
  Boilerplates: 400 repos (20%)
  Full Apps: 600 repos (30%)
  SaaS: 300 repos (15%)
  Infrastructure: 300 repos (15%)

Gems: 100-240 repos (5-12%)
```

---

## 🔧 Troubleshooting

**Problem**: Too many low-quality repos
- **Solution**: Increase `MIN_STARS`, `MIN_FORKS`, or `MIN_DESCRIPTION_LENGTH`

**Problem**: Not enough repos found
- **Solution**: Decrease quality filters or increase `MAX_DAYS_INACTIVE`

**Problem**: Getting stuck on same search
- **Solution**: Already fixed - script switches strategies after 10 failures

**Problem**: Distribution not balanced
- **Solution**: Script automatically prioritizes under-represented categories

---

## ✅ Summary

1. **Distribution**: Multi-dimensional quota system ensures balanced representation
2. **Quality**: Multiple filters at different stages ensure only quality repos
3. **Flexibility**: All filters are configurable
4. **Smart**: Automatically prioritizes searches to fill quotas
5. **Transparent**: Shows progress and quality metrics in real-time
