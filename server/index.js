import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Data storage (simple file-based storage for MVP)
const DATA_DIR = join(__dirname, 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const REPOS_FILE = join(DATA_DIR, 'saved-repos.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Initialize data files
async function initData() {
  await ensureDataDir();
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify({}));
  }
  try {
    await fs.access(REPOS_FILE);
  } catch {
    await fs.writeFile(REPOS_FILE, JSON.stringify({}));
  }
}

// GitHub API Configuration
const GITHUB_BASE_URL = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// OpenAI API Configuration
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

// Helper: Get GitHub headers
function getGitHubHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  return headers;
}

// Helper: Format time ago
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

// Helper: Transform GitHub repo to our format
function transformRepo(apiRepo) {
  // Create tags array with language + unique topics (case-insensitive deduplication)
  const tagsSet = new Set();
  const tags = [];
  
  // Add language first if it exists
  if (apiRepo.language) {
    tagsSet.add(apiRepo.language.toLowerCase());
    tags.push(apiRepo.language);
  }
  
  // Add topics, avoiding duplicates (case-insensitive)
  const topics = apiRepo.topics || [];
  for (const topic of topics) {
    const topicLower = topic.toLowerCase();
    if (!tagsSet.has(topicLower) && tags.length < 5) {
      tagsSet.add(topicLower);
      tags.push(topic);
    }
  }
  
  return {
    id: apiRepo.id.toString(),
    name: apiRepo.name,
    fullName: apiRepo.full_name,
    description: apiRepo.description || 'No description available',
    tags,
    stars: apiRepo.stargazers_count,
    forks: apiRepo.forks_count,
    lastUpdated: formatTimeAgo(apiRepo.updated_at),
    language: apiRepo.language || undefined,
    url: apiRepo.html_url,
    owner: {
      login: apiRepo.owner.login,
      avatarUrl: apiRepo.owner.avatar_url,
    },
    license: apiRepo.license?.name,
    topics: apiRepo.topics,
  };
}

// ==================== Routes ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper: Check if Link header has next page
function hasNextPage(linkHeader) {
  if (!linkHeader) return false;
  return linkHeader.includes('rel="next"');
}

// Search repositories with pagination support
app.get('/api/repos/search', async (req, res) => {
  try {
    const { 
      q, 
      language, 
      sort = 'stars', 
      order = 'desc', 
      per_page = 100, // Use 100 like Python script
      use_pagination = 'false',
      max_pages = 10 
    } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    let searchQuery = q;
    if (language) {
      searchQuery += ` language:${language}`;
    }

    const usePagination = use_pagination === 'true';
    const maxPages = parseInt(max_pages) || 10;
    const perPage = parseInt(per_page) || 100;
    const allRepos = [];
    let page = 1;

    // Loop through pages (like Python script)
    while (page <= maxPages) {
      const params = new URLSearchParams({
        q: searchQuery,
        sort,
        order,
        per_page: perPage.toString(),
        page: page.toString(),
      });

      const response = await fetch(
        `${GITHUB_BASE_URL}/search/repositories?${params}`,
        { headers: getGitHubHeaders() }
      );

      // Handle rate limiting
      if (response.status === 403) {
        const rateLimitReset = response.headers.get('x-ratelimit-reset');
        if (rateLimitReset) {
          const resetTime = parseInt(rateLimitReset) * 1000;
          const waitTime = resetTime - Date.now();
          if (waitTime > 0) {
            console.warn(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          }
        }
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const repos = data.items.map(transformRepo);
      
      // Extend list (like Python's extend())
      allRepos.push(...repos);

      // Check for next page using Link header
      const linkHeader = response.headers.get('link');
      const hasNext = hasNextPage(linkHeader);

      // If no next page or got fewer results than perPage, we're done
      if (!usePagination || !hasNext || repos.length < perPage) {
        break;
      }

      page++;

      // Small delay to be respectful of API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({ repos: allRepos, total: allRepos.length });
  } catch (error) {
    console.error('Error searching repos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trending repositories with pagination
app.get('/api/repos/trending', async (req, res) => {
  try {
    const { 
      language, 
      since = 'daily', 
      per_page = 100, // Use 100 like Python script
      use_pagination = 'false',
      max_pages = 10 
    } = req.query;
    
    const date = new Date();
    if (since === 'daily') {
      date.setDate(date.getDate() - 1);
    } else if (since === 'weekly') {
      date.setDate(date.getDate() - 7);
    } else {
      date.setMonth(date.getMonth() - 1);
    }

    const dateStr = date.toISOString().split('T')[0];
    let query = `created:>${dateStr} stars:>10`;

    if (language && language !== 'All') {
      query += ` language:${language.toLowerCase()}`;
    }

    const usePagination = use_pagination === 'true';
    const maxPages = parseInt(max_pages) || 10;
    const perPage = parseInt(per_page) || 100;
    const allRepos = [];
    let page = 1;

    // Loop through pages (like Python script)
    while (page <= maxPages) {
      const params = new URLSearchParams({
        q: query,
        sort: 'stars',
        order: 'desc',
        per_page: perPage.toString(),
        page: page.toString(),
      });

      const response = await fetch(
        `${GITHUB_BASE_URL}/search/repositories?${params}`,
        { headers: getGitHubHeaders() }
      );

      // Handle rate limiting
      if (response.status === 403) {
        const rateLimitReset = response.headers.get('x-ratelimit-reset');
        if (rateLimitReset) {
          const resetTime = parseInt(rateLimitReset) * 1000;
          const waitTime = resetTime - Date.now();
          if (waitTime > 0) {
            console.warn(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          }
        }
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const repos = data.items.map((repo, index) => ({
        ...transformRepo(repo),
        rank: allRepos.length + index + 1,
        trending: calculateTrendingScore(repo.stargazers_count, since),
      }));

      // Extend list (like Python's extend())
      allRepos.push(...repos);

      // Check for next page using Link header
      const linkHeader = response.headers.get('link');
      const hasNext = hasNextPage(linkHeader);

      // If no next page or got fewer results than perPage, we're done
      if (!usePagination || !hasNext || repos.length < perPage) {
        break;
      }

      page++;

      // Small delay to be respectful of API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({ repos: allRepos, total: allRepos.length });
  } catch (error) {
    console.error('Error fetching trending repos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Calculate trending score
function calculateTrendingScore(stars, since) {
  const growth = Math.floor(stars * 0.1);
  if (since === 'daily') return `+${growth} today`;
  if (since === 'weekly') return `+${growth * 7} this week`;
  return `+${growth * 30} this month`;
}

// AI Agent: Get recommendations
app.post('/api/ai/recommendations', async (req, res) => {
  try {
    const { query, preferences } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!OPENAI_API_KEY) {
      // Fallback to rule-based recommendations
      return res.json({ 
        recommendations: await getFallbackRecommendations(query, preferences) 
      });
    }

    // Search GitHub for relevant repos
    const repos = await searchRelevantRepos(query, preferences);

    // Use AI to analyze and rank
    const recommendations = await analyzeWithAI(query, repos, preferences);

    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Search relevant repos
async function searchRelevantRepos(query, preferences) {
  const language = preferences?.techStack?.[0] || extractLanguage(query);
  const params = new URLSearchParams({
    q: query + (language ? ` language:${language}` : ''),
    sort: 'stars',
    order: 'desc',
    per_page: '10',
  });

  const response = await fetch(
    `${GITHUB_BASE_URL}/search/repositories?${params}`,
    { headers: getGitHubHeaders() }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data.items.map(transformRepo);
}

// Helper: Analyze with AI
async function analyzeWithAI(query, repos, preferences) {
  const systemPrompt = buildSystemPrompt(preferences);
  const userPrompt = buildUserPrompt(query, repos);

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  return parseAIResponse(content, repos);
}

// Helper: Build system prompt
function buildSystemPrompt(preferences) {
  let prompt = `You are a helpful GitHub repository discovery assistant. Your job is to recommend the best repositories based on user needs.

Guidelines:
- Recommend repositories that match the user's tech stack and requirements
- Explain why each repository is a good fit
- Prioritize well-maintained, popular repositories
- Consider the user's experience level`;

  if (preferences) {
    prompt += `\n\nUser preferences:
- Tech stack: ${preferences.techStack?.join(', ') || 'Not specified'}
- Experience level: ${preferences.experienceLevel || 'intermediate'}
- Interests: ${preferences.interests?.join(', ') || 'Not specified'}`;
  }

  prompt += `\n\nReturn your recommendations as a JSON array with this format:
[
  {
    "name": "owner/repo-name",
    "description": "Brief description",
    "reason": "Why this fits the user's needs"
  }
]`;

  return prompt;
}

// Helper: Build user prompt
function buildUserPrompt(query, repos) {
  const reposList = repos.slice(0, 5).map((repo, index) => 
    `${index + 1}. ${repo.fullName} (${repo.stars} stars) - ${repo.description}`
  ).join('\n');

  return `User query: "${query}"

Here are some relevant repositories I found:
${reposList}

Please analyze these and recommend the top 3 that best match the user's needs. Explain why each is a good fit.`;
}

// Helper: Parse AI response
function parseAIResponse(content, repos) {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((rec) => {
        const repo = repos.find(r => r.fullName === rec.name);
        return {
          name: rec.name,
          description: rec.description || repo?.description || '',
          reason: rec.reason || '',
          url: repo?.url,
          stars: repo?.stars,
        };
      });
    }
  } catch (error) {
    console.error('Error parsing AI response:', error);
  }

  // Fallback
  return repos.slice(0, 3).map(repo => ({
    name: repo.fullName,
    description: repo.description,
    reason: `Highly rated repository with ${repo.stars} stars and good community support`,
    url: repo.url,
    stars: repo.stars,
  }));
}

// Helper: Get fallback recommendations
async function getFallbackRecommendations(query, preferences) {
  const repos = await searchRelevantRepos(query, preferences);
  return repos.slice(0, 3).map(repo => ({
    name: repo.fullName,
    description: repo.description,
    reason: `Popular repository with ${repo.stars} stars, actively maintained`,
    url: repo.url,
    stars: repo.stars,
  }));
}

// Helper: Extract language from query
function extractLanguage(query) {
  const languages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust'];
  const lowerQuery = query.toLowerCase();
  for (const lang of languages) {
    if (lowerQuery.includes(lang)) return lang;
  }
  return null;
}

// Get user preferences
app.get('/api/user/preferences', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    const preferences = users[userId]?.preferences || {
      techStack: [],
      interests: [],
      experienceLevel: 'intermediate',
    };
    res.json({ preferences });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.json({ preferences: { techStack: [], interests: [], experienceLevel: 'intermediate' } });
  }
});

// Save user preferences
app.post('/api/user/preferences', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const preferences = req.body.preferences;
    
    const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    if (!users[userId]) users[userId] = {};
    users[userId].preferences = preferences;
    
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get saved repos
app.get('/api/user/saved-repos', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const savedRepos = JSON.parse(await fs.readFile(REPOS_FILE, 'utf8'));
    const repos = savedRepos[userId] || [];
    res.json({ repos });
  } catch (error) {
    console.error('Error getting saved repos:', error);
    res.json({ repos: [] });
  }
});

// Save a repo
app.post('/api/user/saved-repos', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const repo = req.body.repo;
    
    const savedRepos = JSON.parse(await fs.readFile(REPOS_FILE, 'utf8'));
    if (!savedRepos[userId]) savedRepos[userId] = [];
    savedRepos[userId].push(repo);
    
    await fs.writeFile(REPOS_FILE, JSON.stringify(savedRepos, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving repo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user credits
app.get('/api/user/credits', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    const credits = users[userId]?.credits || {
      free: 5,
      paid: 0,
      total: 5,
    };
    res.json({ credits });
  } catch (error) {
    console.error('Error getting credits:', error);
    res.json({ credits: { free: 5, paid: 0, total: 5 } });
  }
});

// Use credits
app.post('/api/user/credits/use', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const amount = req.body.amount || 1;
    
    const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    if (!users[userId]) users[userId] = { credits: { free: 5, paid: 0, total: 5 } };
    
    const credits = users[userId].credits || { free: 5, paid: 0, total: 5 };
    
    if (credits.total < amount) {
      return res.status(400).json({ error: 'Insufficient credits', credits });
    }

    // Use paid credits first
    if (credits.paid >= amount) {
      credits.paid -= amount;
    } else {
      const remaining = amount - credits.paid;
      credits.paid = 0;
      credits.free -= remaining;
    }

    credits.total = credits.free + credits.paid;
    users[userId].credits = credits;
    
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ success: true, credits });
  } catch (error) {
    console.error('Error using credits:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize and start server
initData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 GitHub API: ${GITHUB_TOKEN ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`🤖 OpenAI API: ${OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  });
}).catch(error => {
  console.error('Failed to initialize server:', error);
  process.exit(1);
});
