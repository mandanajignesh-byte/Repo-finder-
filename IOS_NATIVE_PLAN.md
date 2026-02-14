# iOS Native Development Plan
## Swift + SwiftUI Implementation

### 📱 Overview
Build a native iOS app using Swift and SwiftUI, providing the best performance and native iOS experience for the GitHub Repository Discovery App.

---

## 🎯 Tech Stack

### Core Technologies
- **Language:** Swift 5.9+
- **UI Framework:** SwiftUI
- **iOS Deployment Target:** iOS 16.0+
- **Architecture:** MVVM (Model-View-ViewModel)
- **Async/Await:** Swift Concurrency

### Key Frameworks
- **SwiftUI:** Modern declarative UI
- **Combine:** Reactive programming
- **URLSession:** Network requests
- **Core Data / SwiftData:** Local caching (optional)
- **UserDefaults:** Simple key-value storage
- **SafariServices:** In-app browser for GitHub links
- **StoreKit:** In-app purchases (if needed)

### Third-Party Dependencies
- **Supabase Swift SDK:** `supabase-swift` (official)
- **Kingfisher:** Image loading and caching
- **Lottie:** Animations (optional)

---

## 📁 Project Structure

```
RepoFinderiOS/
├── RepoFinderiOS/
│   ├── App/
│   │   ├── RepoFinderApp.swift          # App entry point
│   │   └── AppDelegate.swift            # App lifecycle (if needed)
│   │
│   ├── Models/
│   │   ├── Repository.swift
│   │   ├── UserPreferences.swift
│   │   ├── UserInteraction.swift
│   │   ├── RecommendationScores.swift
│   │   └── NetworkModels.swift          # API response models
│   │
│   ├── Services/
│   │   ├── SupabaseService.swift        # Supabase integration
│   │   ├── GitHubService.swift          # GitHub API
│   │   ├── ClusterService.swift         # Repo clusters
│   │   ├── RecommendationService.swift  # Recommendation engine
│   │   ├── InteractionService.swift    # User interactions
│   │   ├── RepoPoolService.swift        # Repo pool management
│   │   └── NetworkService.swift         # Base networking
│   │
│   ├── ViewModels/
│   │   ├── DiscoveryViewModel.swift
│   │   ├── TrendingViewModel.swift
│   │   ├── ProfileViewModel.swift
│   │   ├── RepoDetailViewModel.swift
│   │   └── OnboardingViewModel.swift
│   │
│   ├── Views/
│   │   ├── Discovery/
│   │   │   ├── DiscoveryView.swift
│   │   │   ├── RepoCardView.swift
│   │   │   └── SwipeGestureView.swift
│   │   │
│   │   ├── Trending/
│   │   │   └── TrendingView.swift
│   │   │
│   │   ├── Profile/
│   │   │   └── ProfileView.swift
│   │   │
│   │   ├── Onboarding/
│   │   │   └── OnboardingView.swift
│   │   │
│   │   ├── Common/
│   │   │   ├── LoadingView.swift
│   │   │   ├── ErrorView.swift
│   │   │   └── EmptyStateView.swift
│   │   │
│   │   └── Navigation/
│   │       └── MainTabView.swift
│   │
│   ├── Utilities/
│   │   ├── Extensions/
│   │   │   ├── Date+Extensions.swift
│   │   │   ├── String+Extensions.swift
│   │   │   └── View+Extensions.swift
│   │   │
│   │   ├── Helpers/
│   │   │   ├── DateFormatter.swift
│   │   │   └── ImageCache.swift
│   │   │
│   │   └── Constants/
│   │       └── AppConstants.swift
│   │
│   └── Resources/
│       ├── Assets.xcassets/
│       ├── Info.plist
│       └── Config.plist                 # API keys, URLs
│
├── RepoFinderiOSTests/                 # Unit tests
├── RepoFinderiOSUITests/                # UI tests
└── Package.swift                        # Swift Package Manager
```

---

## 🏗️ Architecture: MVVM Pattern

### Model Layer
- **Repository:** Core data model
- **UserPreferences:** User settings and preferences
- **NetworkModels:** API response DTOs

### ViewModel Layer
- **ObservableObject:** Published properties for UI binding
- **Async/Await:** Modern concurrency for network calls
- **Error Handling:** User-friendly error states

### View Layer
- **SwiftUI Views:** Declarative UI components
- **State Management:** @State, @StateObject, @ObservedObject
- **Navigation:** NavigationStack (iOS 16+)

---

## 📋 Phase 1: Project Setup (Week 1)

### 1.1 Create Xcode Project
```bash
# Open Xcode
# File > New > Project
# iOS > App
# Name: RepoFinderiOS
# Interface: SwiftUI
# Language: Swift
# Storage: None (or Core Data if needed)
```

### 1.2 Configure Project Settings
- **Bundle Identifier:** `com.yourcompany.repofinder`
- **Deployment Target:** iOS 16.0
- **Swift Version:** 5.9
- **Enable:** SwiftUI, Combine, Async/Await

### 1.3 Add Dependencies

**Swift Package Manager:**
```swift
// Package.swift or Xcode Package Dependencies
dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0"),
    .package(url: "https://github.com/onevcat/Kingfisher", from: "7.0.0"),
]
```

**Or via Xcode:**
1. File > Add Packages...
2. Add: `https://github.com/supabase/supabase-swift`
3. Add: `https://github.com/onevcat/Kingfisher`

### 1.4 Create Configuration File
```swift
// Config.plist
struct AppConfig {
    static let supabaseURL = "YOUR_SUPABASE_URL"
    static let supabaseKey = "YOUR_SUPABASE_ANON_KEY"
    static let githubToken = "YOUR_GITHUB_TOKEN" // Optional
}
```

---

## 📋 Phase 2: Core Models & Services (Week 2)

### 2.1 Model Definitions

**Repository.swift:**
```swift
import Foundation

struct Repository: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let fullName: String
    let description: String
    let tags: [String]
    let stars: Int
    let forks: Int
    let lastUpdated: String
    var fitScore: Double?
    let language: String?
    let url: String
    let owner: Owner
    let license: String?
    let topics: [String]?
    
    struct Owner: Codable, Hashable {
        let login: String
        let avatarUrl: String
    }
}
```

**UserPreferences.swift:**
```swift
import Foundation

struct UserPreferences: Codable {
    var name: String?
    var primaryCluster: String?
    var secondaryClusters: [String]?
    var techStack: [String]
    var interests: [String]
    var experienceLevel: ExperienceLevel
    var projectType: String?
    var goals: [Goal]?
    var onboardingCompleted: Bool
    
    enum ExperienceLevel: String, Codable {
        case beginner, intermediate, advanced
    }
    
    enum Goal: String, Codable {
        case learningNewTech = "learning-new-tech"
        case buildingProject = "building-project"
        case contributing
        case findingSolutions = "finding-solutions"
        case exploring
    }
}
```

### 2.2 Service Layer

**NetworkService.swift (Base):**
```swift
import Foundation

class NetworkService {
    static let shared = NetworkService()
    
    private let session: URLSession
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)
    }
    
    func request<T: Decodable>(
        url: URL,
        method: String = "GET",
        headers: [String: String] = [:],
        body: Data? = nil
    ) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        headers.forEach { request.setValue($1, forHTTPHeaderField: $0) }
        request.httpBody = body
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.invalidResponse
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
}

enum NetworkError: Error {
    case invalidResponse
    case decodingError
    case networkError(Error)
}
```

**SupabaseService.swift:**
```swift
import Foundation
import Supabase

class SupabaseService: ObservableObject {
    static let shared = SupabaseService()
    
    private let client: SupabaseClient
    
    init() {
        self.client = SupabaseClient(
            supabaseURL: URL(string: AppConfig.supabaseURL)!,
            supabaseKey: AppConfig.supabaseKey
        )
    }
    
    // MARK: - User Management
    func getOrCreateUserId(name: String? = nil) async throws -> String {
        // Get from UserDefaults or create new
        if let userId = UserDefaults.standard.string(forKey: "user_id") {
            return userId
        }
        
        let userId = "user_\(Date().timeIntervalSince1970)_\(UUID().uuidString)"
        UserDefaults.standard.set(userId, forKey: "user_id")
        
        // Create user in Supabase
        try await client.database
            .from("users")
            .insert([
                "id": userId,
                "name": name ?? NSNull(),
                "created_at": ISO8601DateFormatter().string(from: Date())
            ])
            .execute()
        
        return userId
    }
    
    // MARK: - User Preferences
    func getUserPreferences(userId: String) async throws -> UserPreferences? {
        let response: [UserPreferencesRow] = try await client.database
            .from("user_preferences")
            .select()
            .eq("user_id", value: userId)
            .execute()
            .value
        
        guard let row = response.first else { return nil }
        return try decodePreferences(from: row.preferences)
    }
    
    func saveUserPreferences(userId: String, preferences: UserPreferences) async throws {
        let encoded = try encodePreferences(preferences)
        
        try await client.database
            .from("user_preferences")
            .upsert([
                "user_id": userId,
                "preferences": encoded,
                "updated_at": ISO8601DateFormatter().string(from: Date())
            ])
            .execute()
    }
    
    // MARK: - Saved Repos
    func getSavedRepos(userId: String) async throws -> [Repository] {
        let response: [SavedRepoRow] = try await client.database
            .from("saved_repos")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return response.compactMap { try? decodeRepository(from: $0.repo_data) }
    }
    
    func saveRepo(userId: String, repo: Repository) async throws {
        let encoded = try encodeRepository(repo)
        
        try await client.database
            .from("saved_repos")
            .upsert([
                "user_id": userId,
                "repo_id": repo.id,
                "repo_data": encoded,
                "created_at": ISO8601DateFormatter().string(from: Date())
            ])
            .execute()
    }
    
    // MARK: - Liked Repos
    func getLikedRepos(userId: String) async throws -> [Repository] {
        let response: [LikedRepoRow] = try await client.database
            .from("liked_repos")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .execute()
            .value
        
        return response.compactMap { try? decodeRepository(from: $0.repo_data) }
    }
    
    func likeRepo(userId: String, repo: Repository) async throws {
        let encoded = try encodeRepository(repo)
        
        try await client.database
            .from("liked_repos")
            .upsert([
                "user_id": userId,
                "repo_id": repo.id,
                "repo_data": encoded,
                "created_at": ISO8601DateFormatter().string(from: Date())
            ])
            .execute()
    }
    
    // MARK: - Repo Clusters
    func getReposFromCluster(
        clusterName: String,
        limit: Int = 50,
        excludeIds: [String] = []
    ) async throws -> [Repository] {
        var query = client.database
            .from("repo_clusters")
            .select()
            .eq("cluster_name", value: clusterName)
            .limit(limit)
        
        if !excludeIds.isEmpty {
            query = query.not("repo_id", operator: .in, value: excludeIds)
        }
        
        let response: [RepoClusterRow] = try await query.execute().value
        
        return response.compactMap { try? decodeRepository(from: $0.repo_data) }
    }
    
    // MARK: - Helper Methods
    private func decodePreferences(from json: [String: Any]) throws -> UserPreferences {
        let data = try JSONSerialization.data(withJSONObject: json)
        return try JSONDecoder().decode(UserPreferences.self, from: data)
    }
    
    private func encodePreferences(_ preferences: UserPreferences) throws -> [String: Any] {
        let data = try JSONEncoder().encode(preferences)
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }
    
    private func decodeRepository(from json: [String: Any]) throws -> Repository {
        let data = try JSONSerialization.data(withJSONObject: json)
        return try JSONDecoder().decode(Repository.self, from: data)
    }
    
    private func encodeRepository(_ repo: Repository) throws -> [String: Any] {
        let data = try JSONEncoder().encode(repo)
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }
}

// MARK: - Database Row Models
private struct UserPreferencesRow: Codable {
    let user_id: String
    let preferences: [String: Any]
}

private struct SavedRepoRow: Codable {
    let user_id: String
    let repo_id: String
    let repo_data: [String: Any]
    let created_at: String
}

private struct LikedRepoRow: Codable {
    let user_id: String
    let repo_id: String
    let repo_data: [String: Any]
    let created_at: String
}

private struct RepoClusterRow: Codable {
    let cluster_name: String
    let repo_id: String
    let repo_data: [String: Any]
}
```

**GitHubService.swift:**
```swift
import Foundation

class GitHubService {
    static let shared = GitHubService()
    
    private let baseURL = "https://api.github.com"
    private var token: String? {
        AppConfig.githubToken.isEmpty ? nil : AppConfig.githubToken
    }
    
    func searchRepositories(
        query: String,
        language: String? = nil,
        sort: String = "stars",
        perPage: Int = 30
    ) async throws -> [Repository] {
        var components = URLComponents(string: "\(baseURL)/search/repositories")!
        var queryItems = [URLQueryItem(name: "q", value: query)]
        
        if let language = language {
            queryItems.append(URLQueryItem(name: "language", value: language))
        }
        queryItems.append(URLQueryItem(name: "sort", value: sort))
        queryItems.append(URLQueryItem(name: "per_page", value: "\(perPage)"))
        
        components.queryItems = queryItems
        
        var request = URLRequest(url: components.url!)
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(GitHubSearchResponse.self, from: data)
        
        return response.items.map { transform($0) }
    }
    
    func getTrendingRepositories(
        language: String? = nil,
        since: String = "daily"
    ) async throws -> [Repository] {
        // Use Supabase trending_repos table or GitHub API
        // Implementation depends on your backend
        return []
    }
    
    private func transform(_ apiRepo: GitHubApiRepo) -> Repository {
        Repository(
            id: "\(apiRepo.id)",
            name: apiRepo.name,
            fullName: apiRepo.full_name,
            description: apiRepo.description ?? "",
            tags: apiRepo.topics ?? [],
            stars: apiRepo.stargazers_count,
            forks: apiRepo.forks_count,
            lastUpdated: formatDate(apiRepo.pushed_at ?? apiRepo.updated_at),
            language: apiRepo.language,
            url: apiRepo.html_url,
            owner: Repository.Owner(
                login: apiRepo.owner.login,
                avatarUrl: apiRepo.owner.avatar_url
            ),
            license: apiRepo.license?.name,
            topics: apiRepo.topics
        )
    }
    
    private func formatDate(_ dateString: String) -> String {
        // Format date to "time ago" format
        // Implementation...
        return dateString
    }
}

struct GitHubSearchResponse: Codable {
    let items: [GitHubApiRepo]
}

struct GitHubApiRepo: Codable {
    let id: Int
    let name: String
    let full_name: String
    let description: String?
    let stargazers_count: Int
    let forks_count: Int
    let updated_at: String
    let pushed_at: String?
    let language: String?
    let html_url: String
    let owner: Owner
    let license: License?
    let topics: [String]?
    
    struct Owner: Codable {
        let login: String
        let avatar_url: String
    }
    
    struct License: Codable {
        let name: String
    }
}
```

---

## 📋 Phase 3: ViewModels (Week 3)

### 3.1 DiscoveryViewModel

```swift
import Foundation
import Combine

@MainActor
class DiscoveryViewModel: ObservableObject {
    @Published var repos: [Repository] = []
    @Published var currentIndex: Int = 0
    @Published var isLoading: Bool = false
    @Published var error: Error?
    @Published var hasMore: Bool = true
    
    private let supabaseService = SupabaseService.shared
    private let recommendationService = RecommendationService.shared
    private let interactionService = InteractionService.shared
    private var userId: String?
    private var seenRepoIds: Set<String> = []
    
    func loadInitialRepos() async {
        isLoading = true
        error = nil
        
        do {
            userId = try await supabaseService.getOrCreateUserId()
            guard let userId = userId else { return }
            
            // Load user preferences
            let preferences = try await supabaseService.getUserPreferences(userId: userId)
            
            // Get recommended repos
            let newRepos = try await recommendationService.getRecommendedRepos(
                userId: userId,
                preferences: preferences,
                excludeIds: Array(seenRepoIds),
                limit: 20
            )
            
            repos.append(contentsOf: newRepos)
            seenRepoIds.formUnion(newRepos.map { $0.id })
            currentIndex = 0
            hasMore = !newRepos.isEmpty
            
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    func loadMoreRepos() async {
        guard !isLoading && hasMore else { return }
        await loadInitialRepos()
    }
    
    func likeRepo(_ repo: Repository) async {
        guard let userId = userId else { return }
        
        do {
            try await supabaseService.likeRepo(userId: userId, repo: repo)
            try await interactionService.trackInteraction(
                userId: userId,
                repoId: repo.id,
                action: .like
            )
            
            // Move to next repo
            currentIndex += 1
            if currentIndex >= repos.count {
                await loadMoreRepos()
            }
        } catch {
            self.error = error
        }
    }
    
    func saveRepo(_ repo: Repository) async {
        guard let userId = userId else { return }
        
        do {
            try await supabaseService.saveRepo(userId: userId, repo: repo)
            try await interactionService.trackInteraction(
                userId: userId,
                repoId: repo.id,
                action: .save
            )
        } catch {
            self.error = error
        }
    }
    
    func skipRepo() {
        guard let userId = userId else { return }
        
        Task {
            if let repo = currentRepo {
                try? await interactionService.trackInteraction(
                    userId: userId,
                    repoId: repo.id,
                    action: .skip
                )
            }
        }
        
        currentIndex += 1
        if currentIndex >= repos.count {
            Task { await loadMoreRepos() }
        }
    }
    
    var currentRepo: Repository? {
        guard currentIndex < repos.count else { return nil }
        return repos[currentIndex]
    }
}
```

---

## 📋 Phase 4: SwiftUI Views (Week 4-5)

### 4.1 Main App Structure

**RepoFinderApp.swift:**
```swift
import SwiftUI

@main
struct RepoFinderApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

class AppState: ObservableObject {
    @Published var userId: String?
    @Published var hasCompletedOnboarding: Bool = false
    
    init() {
        Task {
            await loadUserState()
        }
    }
    
    private func loadUserState() async {
        // Load user ID and onboarding status
    }
}
```

**ContentView.swift:**
```swift
import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        Group {
            if appState.hasCompletedOnboarding {
                MainTabView()
            } else {
                OnboardingView()
            }
        }
    }
}
```

**MainTabView.swift:**
```swift
import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DiscoveryView()
                .tabItem {
                    Label("Discover", systemImage: "sparkles")
                }
                .tag(0)
            
            TrendingView()
                .tabItem {
                    Label("Trending", systemImage: "flame.fill")
                }
                .tag(1)
            
            SavedReposView()
                .tabItem {
                    Label("Saved", systemImage: "bookmark.fill")
                }
                .tag(2)
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(3)
        }
    }
}
```

### 4.2 Discovery View with Swipe Gestures

**DiscoveryView.swift:**
```swift
import SwiftUI

struct DiscoveryView: View {
    @StateObject private var viewModel = DiscoveryViewModel()
    
    var body: some View {
        NavigationStack {
            ZStack {
                if viewModel.isLoading && viewModel.repos.isEmpty {
                    LoadingView()
                } else if let error = viewModel.error {
                    ErrorView(error: error) {
                        Task { await viewModel.loadInitialRepos() }
                    }
                } else if let currentRepo = viewModel.currentRepo {
                    SwipeableRepoCardView(
                        repo: currentRepo,
                        onLike: {
                            await viewModel.likeRepo(currentRepo)
                        },
                        onSave: {
                            await viewModel.saveRepo(currentRepo)
                        },
                        onSkip: {
                            viewModel.skipRepo()
                        }
                    )
                } else {
                    EmptyStateView(message: "No more repositories to discover")
                }
            }
            .navigationTitle("Discover")
            .task {
                await viewModel.loadInitialRepos()
            }
        }
    }
}
```

**SwipeableRepoCardView.swift:**
```swift
import SwiftUI

struct SwipeableRepoCardView: View {
    let repo: Repository
    let onLike: () async -> Void
    let onSave: () async -> Void
    let onSkip: () -> Void
    
    @State private var dragOffset = CGSize.zero
    @State private var rotation: Double = 0
    
    private let swipeThreshold: CGFloat = 100
    
    var body: some View {
        ZStack {
            // Background cards (for depth effect)
            ForEach(0..<3) { index in
                if index < 3 {
                    RepoCardView(repo: repo)
                        .scaleEffect(1.0 - CGFloat(index) * 0.05)
                        .offset(y: CGFloat(index) * 4)
                        .opacity(1.0 - Double(index) * 0.3)
                }
            }
            
            // Main card
            RepoCardView(repo: repo)
                .offset(dragOffset)
                .rotationEffect(.degrees(rotation))
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            dragOffset = value.translation
                            rotation = Double(value.translation.width / 10)
                        }
                        .onEnded { value in
                            if abs(value.translation.width) > swipeThreshold {
                                // Swipe right = like
                                if value.translation.width > 0 {
                                    Task { await onLike() }
                                } else {
                                    // Swipe left = skip
                                    onSkip()
                                }
                            } else {
                                // Spring back
                                withAnimation(.spring()) {
                                    dragOffset = .zero
                                    rotation = 0
                                }
                            }
                        }
                )
        }
        .padding()
    }
}
```

**RepoCardView.swift:**
```swift
import SwiftUI
import Kingfisher

struct RepoCardView: View {
    let repo: Repository
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                KFImage(URL(string: repo.owner.avatarUrl))
                    .resizable()
                    .frame(width: 40, height: 40)
                    .clipShape(Circle())
                
                VStack(alignment: .leading) {
                    Text(repo.owner.login)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(repo.name)
                        .font(.title2)
                        .fontWeight(.bold)
                }
                
                Spacer()
            }
            
            // Description
            Text(repo.description)
                .font(.body)
                .lineLimit(3)
            
            // Tags
            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(repo.tags, id: \.self) { tag in
                        Text(tag)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.2))
                            .cornerRadius(8)
                    }
                }
            }
            
            // Stats
            HStack {
                Label("\(repo.stars)", systemImage: "star.fill")
                Label("\(repo.forks)", systemImage: "tuningfork")
                if let language = repo.language {
                    Label(language, systemImage: "circle.fill")
                }
                Spacer()
                Text(repo.lastUpdated)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .font(.caption)
            
            // Actions
            HStack {
                Button(action: {}) {
                    Label("Save", systemImage: "bookmark")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                
                Button(action: {}) {
                    Label("Like", systemImage: "heart")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(radius: 8)
    }
}
```

---

## 📋 Phase 5: Additional Features (Week 6-7)

### 5.1 Onboarding Flow
- Multi-step questionnaire
- Preference selection
- Save to Supabase

### 5.2 Trending View
- List of trending repositories
- Filter by language/time range
- Pull-to-refresh

### 5.3 Profile View
- User preferences
- Saved repos
- Liked repos
- Settings

### 5.4 Deep Linking
- Handle `repoverse://` URLs
- Open specific repos
- Navigate to screens

---

## 📋 Phase 6: Polish & Testing (Week 8)

### 6.1 Performance Optimization
- Image caching with Kingfisher
- Lazy loading
- Background data prefetching

### 6.2 Error Handling
- User-friendly error messages
- Retry mechanisms
- Offline support

### 6.3 Testing
- Unit tests for ViewModels
- UI tests for critical flows
- Integration tests for services

### 6.4 App Store Preparation
- App icon (1024x1024)
- Screenshots (all sizes)
- App Store description
- Privacy policy

---

## 🔧 Implementation Checklist

### Setup
- [ ] Create Xcode project
- [ ] Configure bundle identifier
- [ ] Add Swift Package dependencies
- [ ] Set up configuration file

### Models
- [ ] Repository model
- [ ] UserPreferences model
- [ ] Network models
- [ ] Database row models

### Services
- [ ] NetworkService (base)
- [ ] SupabaseService
- [ ] GitHubService
- [ ] ClusterService
- [ ] RecommendationService
- [ ] InteractionService

### ViewModels
- [ ] DiscoveryViewModel
- [ ] TrendingViewModel
- [ ] ProfileViewModel
- [ ] OnboardingViewModel

### Views
- [ ] MainTabView
- [ ] DiscoveryView
- [ ] SwipeableRepoCardView
- [ ] RepoCardView
- [ ] TrendingView
- [ ] ProfileView
- [ ] OnboardingView
- [ ] LoadingView
- [ ] ErrorView

### Features
- [ ] Swipe gestures
- [ ] Like/Save functionality
- [ ] Onboarding flow
- [ ] Deep linking
- [ ] Image loading
- [ ] Pull-to-refresh

### Testing & Deployment
- [ ] Unit tests
- [ ] UI tests
- [ ] App Store assets
- [ ] TestFlight beta
- [ ] Production release

---

## 📚 Resources

### Documentation
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)
- [Supabase Swift SDK](https://github.com/supabase/supabase-swift)
- [Swift Concurrency](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)

### Tutorials
- [Apple's SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)
- [Hacking with Swift](https://www.hackingwithswift.com)

### Tools
- Xcode 15+
- iOS Simulator
- TestFlight (beta testing)

---

## 🚀 Next Steps

1. **Set up Xcode project** (Week 1)
2. **Implement core models and services** (Week 2)
3. **Build ViewModels** (Week 3)
4. **Create SwiftUI views** (Week 4-5)
5. **Add additional features** (Week 6-7)
6. **Test and polish** (Week 8)
7. **Submit to App Store** (Week 9)

---

**Ready to start building! 🎉**
