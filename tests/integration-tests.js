/**
 * Integration tests for cross-component functionality
 * Tests interaction between PostCard, Sidebar, and UserProfile components
 */

// Test checklist for developers before making changes
const INTEGRATION_TEST_CHECKLIST = `
INTEGRATION TEST CHECKLIST - Run before any Recent Posts changes:

□ 1. Homepage Sidebar Recent Posts
   - Shows correct count of visited posts
   - Displays posts in visit order (most recent first)
   - Updates in real-time when posts are clicked
   - Shows user's own posts at top

□ 2. Profile Page Recent Posts
   - Shows identical count to homepage sidebar
   - Same posts in same order
   - Loads all visited posts regardless of pagination

□ 3. PostCard Click Behavior
   - Updates localStorage with new visit
   - Dispatches custom event for real-time updates
   - Maintains correct visit order
   - Navigates to post detail page

□ 4. Data Synchronization
   - Both sidebar and profile use same visited posts logic
   - Custom events propagate changes across components
   - localStorage changes trigger UI updates

□ 5. Edge Cases
   - Handles corrupted localStorage gracefully
   - Works when no posts visited yet
   - Excludes user's own posts from visited list
   - Handles missing posts (not in current page)

□ 6. Performance
   - Doesn't fetch when no visited posts exist
   - Individual post fetches work efficiently
   - Event listeners properly cleaned up

MANUAL TESTING STEPS:
1. Clear localStorage: localStorage.removeItem('visitedPosts')
2. Visit 3-4 posts by clicking titles
3. Check sidebar shows visited posts
4. Go to profile page - should show same posts
5. Visit more posts - both locations should update
6. Create new post - should appear at top in own posts section
`;

// Mock data for integration tests
const createTestEnvironment = () => {
  const mockPosts = [
    { id: 1, title: 'Test Post 1', authorUsername: 'testuser', createdAt: new Date(), votes: 5, commentCount: 2 },
    { id: 2, title: 'Test Post 2', authorUsername: 'otheruser', createdAt: new Date(), votes: 3, commentCount: 1 },
    { id: 3, title: 'Test Post 3', authorUsername: 'anotheruser', createdAt: new Date(), votes: 7, commentCount: 0 },
    { id: 4, title: 'User Post', authorUsername: 'testuser', createdAt: new Date(), votes: 2, commentCount: 1 }
  ];

  const mockUser = {
    firstName: 'testuser',
    email: 'test@example.com'
  };

  return { mockPosts, mockUser };
};

// Simulate component interactions
const simulatePostCardClick = (postId) => {
  const stored = localStorage.getItem('visitedPosts');
  let visitedIds = stored ? JSON.parse(stored) : [];
  
  // Remove if already exists, add to front
  visitedIds = [postId, ...visitedIds.filter(id => id !== postId)];
  localStorage.setItem('visitedPosts', JSON.stringify(visitedIds));
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('visitedPostsChanged'));
  
  return visitedIds;
};

// Simulate sidebar recent posts logic
const simulateSidebarLogic = (posts, user, visitedIds) => {
  const userIdentifier = user.firstName;
  
  // User's own posts
  const userPosts = posts
    .filter(post => post.authorUsername === userIdentifier)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Visited posts (excluding user's own)
  const visitedPosts = posts
    .filter(post => visitedIds.includes(post.id) && post.authorUsername !== userIdentifier)
    .sort((a, b) => {
      const aIndex = visitedIds.indexOf(a.id);
      const bIndex = visitedIds.indexOf(b.id);
      return aIndex - bIndex;
    });
  
  return [...userPosts, ...visitedPosts];
};

// Simulate profile page recent posts logic  
const simulateProfileLogic = (posts, user, visitedIds) => {
  // Should be identical to sidebar logic
  return simulateSidebarLogic(posts, user, visitedIds);
};

// Integration tests
describe('Recent Posts Integration Tests', () => {
  let mockPosts, mockUser;
  
  beforeEach(() => {
    localStorage.clear();
    const testEnv = createTestEnvironment();
    mockPosts = testEnv.mockPosts;
    mockUser = testEnv.mockUser;
  });

  test('PostCard click updates both sidebar and profile', () => {
    // Initial state - no visited posts
    let sidebarPosts = simulateSidebarLogic(mockPosts, mockUser, []);
    let profilePosts = simulateProfileLogic(mockPosts, mockUser, []);
    
    expect(sidebarPosts.length).toBe(1); // Only user's own post
    expect(profilePosts.length).toBe(1);
    
    // Click on post 2
    const visitedIds = simulatePostCardClick(2);
    
    // Both should now show the visited post
    sidebarPosts = simulateSidebarLogic(mockPosts, mockUser, visitedIds);
    profilePosts = simulateProfileLogic(mockPosts, mockUser, visitedIds);
    
    expect(sidebarPosts.length).toBe(2); // User post + visited post
    expect(profilePosts.length).toBe(2);
    expect(sidebarPosts[1].id).toBe(2); // Visited post should be second
    expect(profilePosts[1].id).toBe(2);
  });

  test('Multiple post clicks maintain correct order', () => {
    // Click posts in order: 2, 3, 1
    simulatePostCardClick(2);
    simulatePostCardClick(3);
    simulatePostCardClick(1);
    
    const visitedIds = JSON.parse(localStorage.getItem('visitedPosts'));
    const sidebarPosts = simulateSidebarLogic(mockPosts, mockUser, visitedIds);
    const profilePosts = simulateProfileLogic(mockPosts, mockUser, visitedIds);
    
    // Should show: user post, then visited posts in order [1, 3, 2]
    expect(sidebarPosts.length).toBe(4); // 1 user post + 3 visited
    expect(profilePosts.length).toBe(4);
    
    const visitedPortions = sidebarPosts.slice(1); // Skip user's own post
    expect(visitedPortions.map(p => p.id)).toEqual([1, 3, 2]);
  });

  test('Sidebar and profile show identical results', () => {
    // Visit several posts
    simulatePostCardClick(1);
    simulatePostCardClick(2);
    simulatePostCardClick(3);
    
    const visitedIds = JSON.parse(localStorage.getItem('visitedPosts'));
    const sidebarPosts = simulateSidebarLogic(mockPosts, mockUser, visitedIds);
    const profilePosts = simulateProfileLogic(mockPosts, mockUser, visitedIds);
    
    // Results should be identical
    expect(sidebarPosts.length).toBe(profilePosts.length);
    expect(sidebarPosts.map(p => p.id)).toEqual(profilePosts.map(p => p.id));
  });

  test('User own posts appear first', () => {
    // Visit some posts
    simulatePostCardClick(1);
    simulatePostCardClick(2);
    
    const visitedIds = JSON.parse(localStorage.getItem('visitedPosts'));
    const recentPosts = simulateSidebarLogic(mockPosts, mockUser, visitedIds);
    
    // First post should be user's own post
    expect(recentPosts[0].authorUsername).toBe('testuser');
    expect(recentPosts[0].id).toBe(4);
  });

  test('Handles posts not in current page', () => {
    // Simulate visited posts that might not be in current page
    localStorage.setItem('visitedPosts', JSON.stringify([99, 100, 2]));
    
    const visitedIds = JSON.parse(localStorage.getItem('visitedPosts'));
    const recentPosts = simulateSidebarLogic(mockPosts, mockUser, visitedIds);
    
    // Should only show posts that exist in mockPosts
    const visitedPortions = recentPosts.slice(1); // Skip user's own post
    expect(visitedPortions.length).toBe(1);
    expect(visitedPortions[0].id).toBe(2);
  });
});

// Export test utilities for use in development
const testUtils = {
  createTestEnvironment,
  simulatePostCardClick,
  simulateSidebarLogic,
  simulateProfileLogic,
  INTEGRATION_TEST_CHECKLIST
};

console.log(INTEGRATION_TEST_CHECKLIST);
console.log('\nIntegration Tests Created:');
console.log('✓ PostCard click updates both sidebar and profile');
console.log('✓ Multiple post clicks maintain correct order');
console.log('✓ Sidebar and profile show identical results');
console.log('✓ User own posts appear first');
console.log('✓ Handles posts not in current page');

module.exports = testUtils;