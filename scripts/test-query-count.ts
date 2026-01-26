/**
 * Test script to count how many queries will be generated
 */

// All languages from onboarding form
const ALL_LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'R', 'Scala', 'Elixir'
];

// All frameworks from onboarding form
const ALL_FRAMEWORKS = [
  'React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte',
  'Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Laravel',
  'Flutter', 'React Native', 'Ionic', 'Electron',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy'
];

// All project types from onboarding form
// Prioritizing tutorials (user's main focus) with more keywords
const PROJECT_TYPE_KEYWORDS = {
  'tutorial': ['tutorial', 'course', 'learn', 'guide', 'example'], // 5 keywords for tutorials
  'boilerplate': ['boilerplate', 'starter', 'template'], // 3 keywords
  'library': ['library', 'package'], // 2 keywords
  'framework': ['framework'], // 1 keyword
  'full-app': ['app', 'application'], // 2 keywords
  'tool': ['tool', 'utility'] // 2 keywords
};

function generateClusterQueries(clusterName: string, baseKeywords: string[]): string[] {
  const queries: string[] = [];
  
  // Base queries for the cluster
  queries.push(...baseKeywords);
  
  // For each language + each project type
  ALL_LANGUAGES.forEach(lang => {
    Object.entries(PROJECT_TYPE_KEYWORDS).forEach(([type, keywords]) => {
      keywords.forEach(keyword => {
        queries.push(`${lang.toLowerCase()} ${keyword}`);
      });
    });
  });
  
  // For each framework + each project type (only relevant frameworks for this cluster)
  const relevantFrameworks = getRelevantFrameworks(clusterName);
  relevantFrameworks.forEach(framework => {
    const frameworkQuery = framework.toLowerCase().replace(/\s+/g, '-');
    Object.entries(PROJECT_TYPE_KEYWORDS).forEach(([type, keywords]) => {
      keywords.forEach(keyword => {
        queries.push(`${frameworkQuery} ${keyword}`);
      });
    });
  });
  
  // Domain-specific queries
  queries.push(`${clusterName} tutorial`, `${clusterName} course`, `${clusterName} boilerplate`);
  
  return queries;
}

function getRelevantFrameworks(clusterName: string): string[] {
  switch (clusterName) {
    case 'frontend':
      return ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte'];
    case 'backend':
      return ['Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Laravel'];
    case 'mobile':
      return ['Flutter', 'React Native', 'Ionic', 'Electron'];
    case 'ai-ml':
      return ['TensorFlow', 'PyTorch', 'Pandas', 'NumPy'];
    case 'data-science':
      return ['Pandas', 'NumPy', 'TensorFlow', 'PyTorch'];
    default:
      return [];
  }
}

// Count queries for each cluster
const clusters = ['frontend', 'backend', 'mobile', 'ai-ml', 'data-science', 'devops', 'game-dev', 'desktop'];
const baseKeywords = {
  'frontend': ['react', 'vue', 'angular', 'ui-components', 'css-framework', 'frontend-framework', 'web-frontend'],
  'backend': ['nodejs', 'express', 'django', 'flask', 'api-framework', 'backend-framework', 'web-backend', 'rest-api', 'graphql'],
  'mobile': ['react-native', 'flutter', 'mobile-app', 'ios-framework', 'android-framework', 'mobile-development'],
  'ai-ml': ['machine-learning', 'tensorflow', 'pytorch', 'ai', 'deep-learning', 'neural-network', 'nlp'],
  'data-science': ['data-science', 'pandas', 'analytics', 'jupyter', 'data-visualization', 'data-analysis'],
  'devops': ['docker', 'kubernetes', 'devops-tools', 'ci-cd', 'infrastructure', 'terraform', 'ansible'],
  'game-dev': ['game-development', 'unity', 'unreal-engine', 'game-engine', 'gamedev'],
  'desktop': ['desktop-application', 'electron', 'tauri', 'desktop-app']
};

console.log('Query Count Analysis:\n');
let totalQueries = 0;

clusters.forEach(cluster => {
  const queries = generateClusterQueries(cluster, baseKeywords[cluster as keyof typeof baseKeywords]);
  totalQueries += queries.length;
  console.log(`${cluster}: ${queries.length} queries`);
});

console.log(`\nTotal queries across all clusters: ${totalQueries}`);
console.log(`\nEstimated time: ${Math.ceil(totalQueries * 1.5 / 60)} minutes (at 1.5s per query)`);
