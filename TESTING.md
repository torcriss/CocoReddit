# Testing Strategy for Coco Platform

## Overview
This document outlines the comprehensive testing strategy to prevent regressions when making changes to the Recent Posts functionality and other core features.

## Test Categories

### 1. Unit Tests (`tests/recent-posts.test.js`)
Tests individual component logic in isolation:

- **localStorage Management**: Storing/retrieving visited posts, handling corruption
- **Event System**: Custom event dispatching and listening
- **Post Filtering**: User posts vs visited posts, proper ordering
- **Data Consistency**: Combining different post types correctly
- **Error Handling**: API failures, empty states, invalid data
- **Performance**: Efficient queries, preventing unnecessary fetches

### 2. Integration Tests (`tests/integration-tests.js`)
Tests cross-component interactions:

- **Component Synchronization**: Sidebar ↔ Profile page consistency
- **Real-time Updates**: PostCard clicks updating other components
- **Data Flow**: localStorage → Events → UI updates
- **Edge Cases**: Missing posts, pagination issues

## Pre-Change Testing Protocol

Before making ANY changes to Recent Posts functionality:

### Step 1: Run Unit Tests
```bash
# Validate core logic
node tests/recent-posts.test.js
```

### Step 2: Run Integration Tests
```bash
# Validate component interactions
node tests/integration-tests.js
```

### Step 3: Manual Testing Checklist
```
□ Clear localStorage: localStorage.removeItem('visitedPosts')
□ Visit 3-4 posts by clicking titles on homepage
□ Verify sidebar Recent Posts section shows visited posts
□ Navigate to profile page - verify same posts appear
□ Visit 2-3 more posts - verify both locations update immediately
□ Create a new post - verify it appears at top of user's posts section
□ Log out and back in - verify visited posts persist
```

### Step 4: Cross-Browser Testing
Test in at least 2 browsers:
- Chrome/Edge (Chromium)
- Firefox or Safari

## Test Data Requirements

### Mock Posts
```javascript
const mockPosts = [
  { id: 1, title: 'Test Post 1', authorUsername: 'testuser', createdAt: new Date(), votes: 5, commentCount: 2 },
  { id: 2, title: 'Test Post 2', authorUsername: 'otheruser', createdAt: new Date(), votes: 3, commentCount: 1 },
  // ... more posts
];
```

### Mock User
```javascript
const mockUser = {
  firstName: 'testuser',
  email: 'test@example.com'
};
```

## Common Test Scenarios

### Scenario 1: First Time User
- No visited posts in localStorage
- Should show only user's own posts (if any)
- Recent Posts section should handle empty state gracefully

### Scenario 2: Active User
- Multiple visited posts in localStorage
- Should show correct order (most recent first)
- Should exclude user's own posts from visited section

### Scenario 3: Pagination Edge Case
- Visited posts not on current page
- Should fetch individual posts by ID
- Should handle missing/deleted posts gracefully

### Scenario 4: Performance Test
- Large number of visited posts (20+)
- Should not cause UI lag
- Should limit individual API calls appropriately

## Regression Prevention

### Critical Bugs to Prevent
1. **Count Inconsistency**: Different post counts between homepage and profile
2. **Order Issues**: Visited posts not in correct chronological order
3. **Real-time Updates**: Changes not propagating immediately
4. **Data Loss**: localStorage corruption causing crashes
5. **Memory Leaks**: Event listeners not being cleaned up

### Warning Signs
- Console errors related to localStorage or JSON parsing
- Components re-rendering excessively
- Network requests failing silently
- UI not updating after user actions

## Automated Testing Setup (Future)

### Jest Configuration
```json
{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/client/src/$1"
  }
}
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test Recent Posts
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Recent Posts Tests
        run: |
          npm test -- tests/recent-posts.test.js
          npm test -- tests/integration-tests.js
```

## Documentation Updates

When making changes, update:
1. This TESTING.md file with new test scenarios
2. README.md with any new testing commands
3. Component comments with testing notes
4. replit.md with testing-related architectural changes

## Developer Workflow

1. **Before Changes**: Run existing tests
2. **During Development**: Write new tests for new features
3. **After Changes**: Verify all tests pass
4. **Before Commit**: Run full test suite
5. **Documentation**: Update relevant test docs

This comprehensive testing strategy ensures that changes to the Recent Posts functionality don't introduce regressions and maintains the high quality user experience of the Coco platform.