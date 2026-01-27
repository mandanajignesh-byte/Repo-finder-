/**
 * Category Service
 * Categorizes repositories into different categories based on topics, tags, and description
 */

import { Repository } from '@/lib/types';

export type RepoCategory = 
  | 'repos-all-should-know' 
  | 'frontend' 
  | 'backend' 
  | 'mobile'
  | 'desktop'
  | 'data-science'
  | 'devops'
  | 'ai' 
  | 'game-dev' 
  | 'generic';

export interface CategorizedRepos {
  category: RepoCategory;
  repos: Repository[];
}

class CategoryService {
  /**
   * Check if repo is a "Repos All Should Know" - useful local AI tools, free apps that run locally
   * Criteria: free, runs locally, does AI tasks (image generation, LLM-like tasks) or very useful tools
   */
  private isReposAllShouldKnow(repo: Repository): boolean {
    const text = `${repo.name} ${repo.fullName} ${repo.description} ${(repo.topics || []).join(' ')} ${(repo.tags || []).join(' ')}`.toLowerCase();
    
    // Check for specific well-known AI tool repository names/patterns
    const wellKnownAITools = [
      // Image generation
      'stable-diffusion',
      'stablediffusion',
      'comfyui',
      'automatic1111',
      'invoke-ai',
      'invokeai',
      'controlnet',
      'sd-webui',
      'stable-diffusion-webui',
      
      // LLM tools
      'ollama',
      'llama.cpp',
      'llamacpp',
      'gpt4all',
      'localai',
      'text-generation-webui',
      'lmstudio',
      'lm-studio',
      'koboldcpp',
      'llm-studio',
      'open-webui',
      'anything-llm',
      'privategpt',
      'localgpt',
      
      // AI frameworks
      'langchain',
      'llamaindex',
      'llama-index',
      'autogpt',
      'agentgpt',
      'babyagi',
      'crewai',
      'autogen',
      'memgpt',
      
      // Speech/audio
      'whisper',
      'faster-whisper',
      'insanely-fast-whisper',
      'whisper.cpp',
      'whisperx',
      'coqui-tts',
      'piper',
      'bark',
      
      // Video
      'animatediff',
      'stable-video',
      
      // Vector DBs for AI
      'chromadb',
      'chroma',
      'qdrant',
      'weaviate',
      'milvus',
    ];
    
    // Check if repo name matches well-known AI tools
    const matchesWellKnownTool = wellKnownAITools.some(tool => 
      text.includes(tool) || repo.fullName.toLowerCase().includes(tool)
    );
    
    if (matchesWellKnownTool) {
      return true; // Always include well-known AI tools
    }
    
    // Keywords that indicate local/offline tools
    const localIndicators = [
      'runs locally',
      'local',
      'offline',
      'on-device',
      'on device',
      'cpu only',
      'no gpu',
      'no internet',
      'privacy',
      'self-hosted',
      'self hosted',
    ];
    
    // AI task indicators - expanded list of popular open source AI tools
    const aiTaskIndicators = [
      // Image generation
      'image generation',
      'text generation',
      'stable diffusion',
      'diffusion',
      'image-to-image',
      'text-to-image',
      'text to image',
      'image to image',
      'comfyui',
      'automatic1111',
      'invokeai',
      'midjourney',
      'dalle',
      'imagen',
      'latent diffusion',
      'controlnet',
      'lora',
      'dreambooth',
      
      // LLM and text generation
      'llm',
      'large language model',
      'local llm',
      'local model',
      'ollama',
      'llama',
      'llama.cpp',
      'llamacpp',
      'mistral',
      'gemma',
      'phi',
      'qwen',
      'yi',
      'falcon',
      'codellama',
      'vicuna',
      'alpaca',
      'wizard',
      'orca',
      'neural-chat',
      'openchat',
      'zephyr',
      'solar',
      'deepseek',
      'chatglm',
      'baichuan',
      'internlm',
      
      // AI frameworks and tools
      'gpt4all',
      'localai',
      'text-generation-webui',
      'lm studio',
      'koboldcpp',
      'llm studio',
      'langchain',
      'llamaindex',
      'autogpt',
      'agentgpt',
      'babyagi',
      'huggingface',
      'transformers',
      'diffusers',
      'accelerate',
      'peft',
      'bitsandbytes',
      'awq',
      'gptq',
      'exllama',
      'vllm',
      'tensorrt-llm',
      'llama-index',
      'haystack',
      'semantic-kernel',
      'guidance',
      'outlines',
      'lmql',
      'vllm',
      'triton',
      
      // Speech and audio
      'whisper',
      'speech recognition',
      'voice',
      'transcription',
      'tts',
      'text to speech',
      'coqui',
      'piper',
      'bark',
      'musicgen',
      'audiocraft',
      
      // Video generation
      'video generation',
      'text to video',
      'animatediff',
      'stable video',
      'runway',
      'pika',
      
      // AI assistants and agents
      'ai assistant',
      'ai agent',
      'autonomous agent',
      'ai chatbot',
      'rag',
      'retrieval augmented',
      'vector database',
      'embeddings',
      'chroma',
      'pinecone',
      'weaviate',
      'qdrant',
      'milvus',
      'faiss',
      
      // Other popular AI tools
      'stable-voice',
      'funasr',
      'insanely-fast-whisper',
      'faster-whisper',
      'whisper.cpp',
      'whisperx',
      'open-webui',
      'anything-llm',
      'privategpt',
      'localgpt',
      'gpt-researcher',
      'crewai',
      'autogen',
      'mem0',
      'memgpt',
    ];
    
    // Very useful tool indicators
    const usefulToolIndicators = [
      'productivity',
      'automation',
      'utility',
      'tool',
      'helper',
      'assistant',
      'cli',
      'command line',
      'desktop app',
      'desktop application',
    ];
    
    const freeIndicators = [
      'free',
      'open source',
      'opensource',
      'mit',
      'apache',
      'gpl',
      'bsd',
    ];
    
    // Check for AI tools - more lenient matching for popular AI repos
    const hasAITask = aiTaskIndicators.some(indicator => text.includes(indicator));
    const hasLocal = localIndicators.some(indicator => text.includes(indicator));
    const hasUsefulTool = usefulToolIndicators.some(indicator => text.includes(indicator));
    const isFree = freeIndicators.some(indicator => text.includes(indicator)) || 
                   !repo.license || // No license info might mean free
                   repo.license.toLowerCase().includes('mit') ||
                   repo.license.toLowerCase().includes('apache') ||
                   repo.license.toLowerCase().includes('bsd') ||
                   repo.license.toLowerCase().includes('gpl') ||
                   repo.license.toLowerCase().includes('lgpl');
    
    // Popular AI tools should be included even without explicit "local" keyword
    // if they're well-known open source AI generation tools
    const isPopularAITool = hasAITask && isFree;
    
    // Traditional check: local + (AI task OR useful tool) + free
    const isLocalAITool = hasLocal && (hasAITask || hasUsefulTool) && isFree;
    
    // Also include repos with high stars that are clearly AI generation tools
    const isHighStarAITool = hasAITask && isFree && repo.stars > 1000;
    
    return isLocalAITool || isPopularAITool || isHighStarAITool;
  }

  /**
   * Categorize a single repository
   */
  categorizeRepo(repo: Repository): RepoCategory {
    // Check "Repos All Should Know" first (most specific)
    if (this.isReposAllShouldKnow(repo)) {
      return 'repos-all-should-know';
    }
    
    const text = `${repo.name} ${repo.description} ${(repo.topics || []).join(' ')} ${(repo.tags || []).join(' ')} ${repo.language || ''}`.toLowerCase();
    
    // Frontend indicators
    const frontendKeywords = [
      'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'nuxt', 'remix',
      'frontend', 'front-end', 'ui', 'ux', 'component', 'css', 'scss', 'sass',
      'tailwind', 'bootstrap', 'material-ui', 'ant design', 'chakra',
      'webpack', 'vite', 'parcel', 'rollup', 'esbuild',
      'typescript', 'javascript', 'html', 'css',
    ];
    
    // Backend indicators
    const backendKeywords = [
      'backend', 'back-end', 'server', 'api', 'rest', 'graphql', 'grpc',
      'express', 'fastapi', 'django', 'flask', 'rails', 'spring', 'laravel',
      'node.js', 'nodejs', 'deno', 'bun',
      'database', 'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite',
      'microservice', 'micro-service', 'serverless', 'lambda',
      'authentication', 'authorization', 'jwt', 'oauth',
    ];
    
    // AI/ML indicators (but not local AI tools)
    const aiKeywords = [
      'machine learning', 'ml', 'deep learning', 'neural network', 'tensorflow',
      'pytorch', 'keras', 'scikit-learn', 'sklearn', 'opencv',
      'nlp', 'natural language', 'computer vision', 'cv',
      'transformer', 'bert', 'gpt', 'openai', 'anthropic',
      'ai', 'artificial intelligence', 'model', 'training', 'inference',
    ];
    
    // Mobile indicators
    const mobileKeywords = [
      'mobile', 'ios', 'android', 'react native', 'react-native', 'reactnative',
      'flutter', 'ionic', 'xamarin', 'cordova', 'phonegap',
      'swift', 'kotlin', 'dart', 'mobile app', 'mobile application',
      'app store', 'play store', 'mobile development', 'mobiledev',
    ];
    
    // Desktop indicators
    const desktopKeywords = [
      'desktop', 'electron', 'tauri', 'qt', 'gtk', 'wxwidgets',
      'desktop app', 'desktop application', 'native app',
      'windows', 'macos', 'linux desktop', 'gui', 'gui framework',
    ];
    
    // Data Science indicators
    const dataScienceKeywords = [
      'data science', 'datascience', 'data analysis', 'data analytics',
      'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn', 'plotly',
      'jupyter', 'notebook', 'data visualization', 'data viz',
      'statistics', 'statistical', 'data processing', 'etl',
      'r language', 'r programming', 'scikit-learn', 'sklearn',
    ];
    
    // DevOps indicators
    const devopsKeywords = [
      'devops', 'ci/cd', 'cicd', 'continuous integration', 'continuous deployment',
      'docker', 'kubernetes', 'k8s', 'container', 'containerization',
      'terraform', 'ansible', 'puppet', 'chef', 'jenkins', 'github actions',
      'gitlab ci', 'circleci', 'travis', 'infrastructure', 'infra',
      'monitoring', 'logging', 'prometheus', 'grafana', 'elk',
      'deployment', 'orchestration', 'helm', 'argo',
    ];
    
    // Game Dev indicators
    const gameDevKeywords = [
      'game', 'gaming', 'unity', 'unreal', 'godot', 'phaser',
      'game engine', 'game development', 'gamedev',
      '2d', '3d', 'pixel', 'sprite', 'physics engine',
    ];
    
    // Check categories in order of specificity
    const hasFrontend = frontendKeywords.some(keyword => text.includes(keyword));
    const hasBackend = backendKeywords.some(keyword => text.includes(keyword));
    const hasMobile = mobileKeywords.some(keyword => text.includes(keyword));
    const hasDesktop = desktopKeywords.some(keyword => text.includes(keyword));
    const hasDataScience = dataScienceKeywords.some(keyword => text.includes(keyword));
    const hasDevOps = devopsKeywords.some(keyword => text.includes(keyword));
    const hasAI = aiKeywords.some(keyword => text.includes(keyword));
    const hasGameDev = gameDevKeywords.some(keyword => text.includes(keyword));
    
    // Prioritize: if it has both frontend and backend, check which is stronger
    if (hasFrontend && hasBackend) {
      // Count matches for each
      const frontendMatches = frontendKeywords.filter(k => text.includes(k)).length;
      const backendMatches = backendKeywords.filter(k => text.includes(k)).length;
      if (frontendMatches >= backendMatches) return 'frontend';
      return 'backend';
    }
    
    // Check categories in priority order
    if (hasMobile) return 'mobile';
    if (hasDesktop) return 'desktop';
    if (hasDataScience) return 'data-science';
    if (hasDevOps) return 'devops';
    if (hasFrontend) return 'frontend';
    if (hasBackend) return 'backend';
    if (hasAI) return 'ai';
    if (hasGameDev) return 'game-dev';
    
    return 'generic';
  }

  /**
   * Categorize multiple repositories
   */
  categorizeRepos(repos: Repository[]): Map<RepoCategory, Repository[]> {
    const categorized = new Map<RepoCategory, Repository[]>();
    
    // Initialize all categories
    const categories: RepoCategory[] = [
      'repos-all-should-know', 
      'frontend', 
      'backend', 
      'mobile',
      'desktop',
      'data-science',
      'devops',
      'ai', 
      'game-dev', 
      'generic'
    ];
    categories.forEach(cat => categorized.set(cat, []));
    
    // Categorize each repo
    repos.forEach(repo => {
      const category = this.categorizeRepo(repo);
      const current = categorized.get(category) || [];
      categorized.set(category, [...current, repo]);
    });
    
    return categorized;
  }

  /**
   * Get category display name
   */
  getCategoryName(category: RepoCategory): string {
    const names: Record<RepoCategory, string> = {
      'repos-all-should-know': 'Repos All Should Know',
      'frontend': 'Frontend',
      'backend': 'Backend',
      'mobile': 'Mobile',
      'desktop': 'Desktop',
      'data-science': 'Data Science',
      'devops': 'DevOps',
      'ai': 'AI & ML',
      'game-dev': 'Game Development',
      'generic': 'Other',
    };
    return names[category];
  }

  /**
   * Get category description
   */
  getCategoryDescription(category: RepoCategory): string {
    const descriptions: Record<RepoCategory, string> = {
      'repos-all-should-know': 'Free AI tools and useful apps that run locally - image generation, LLMs, and productivity tools',
      'frontend': 'Frontend frameworks, libraries, and tools',
      'backend': 'Backend services, APIs, and server technologies',
      'mobile': 'Mobile app development frameworks and tools',
      'desktop': 'Desktop application frameworks and tools',
      'data-science': 'Data analysis, visualization, and scientific computing tools',
      'devops': 'CI/CD, containerization, infrastructure, and deployment tools',
      'ai': 'AI and Machine Learning projects',
      'game-dev': 'Game engines and game development tools',
      'generic': 'Other trending repositories',
    };
    return descriptions[category];
  }
}

export const categoryService = new CategoryService();
