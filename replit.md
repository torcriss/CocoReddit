# Coco Social Platform

## Overview

This is a full-stack social platform called "Coco" built with React, Express.js, and TypeScript. The application features a modern social media interface with posts, comments, voting, and community features. It uses shadcn/ui components for a polished user interface and implements real-time interactions through React Query.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Reddit-themed color variables
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL via Neon Database (serverless)
- **ORM**: Drizzle ORM with schema-first approach
- **Validation**: Zod schemas shared between client and server
- **Development**: Hot reloading with Vite integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured for Neon Database)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: Drizzle Kit for migrations
- **Fallback**: In-memory storage implementation for development

## Key Components

### Database Schema
The application uses a relational database structure with four main entities:

1. **Subreddits**: Communities with name, description, and member count
2. **Posts**: Content items with title, content, images/links, and metadata
3. **Comments**: Threaded discussions with parent-child relationships
4. **Votes**: User voting system for posts and comments

### API Structure
RESTful API endpoints organized by resource:

- `/api/subreddits` - Community management
- `/api/posts` - Post creation, retrieval, and search
- `/api/comments` - Comment threads and replies
- `/api/votes` - Voting system

### Frontend Components
- **Header**: Navigation, search, and theme toggle
- **PostCard**: Individual post display with voting and comments
- **CommentThread**: Nested comment system with voting
- **Sidebar**: Community listing and post creation
- **CreatePostDialog**: Modal for creating new posts

## Data Flow

1. **User Interactions**: Components trigger React Query mutations
2. **API Requests**: Validated requests sent to Express endpoints
3. **Data Processing**: Drizzle ORM handles database operations
4. **Response Handling**: React Query manages cache invalidation and updates
5. **UI Updates**: Components re-render with fresh data

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for Neon Database
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components for accessibility
- **react-hook-form**: Form validation and handling
- **date-fns**: Date formatting utilities

### Development Tools
- **drizzle-kit**: Database schema management and migrations
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production builds
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Deployment Strategy

### Development Environment
- **Hot Reloading**: Vite middleware integrated with Express server
- **Database**: Requires DATABASE_URL environment variable for PostgreSQL connection
- **Port Configuration**: Single server handling both API and static file serving

### Production Build
1. **Frontend**: Vite builds optimized React application to `dist/public`
2. **Backend**: esbuild bundles Express server to `dist/index.js`
3. **Static Serving**: Express serves built frontend files in production
4. **Database**: Drizzle migrations applied via `npm run db:push`

### Environment Setup
- Requires `DATABASE_URL` environment variable for PostgreSQL connection
- Automatic fallback to in-memory storage for development without database
- Theme persistence via localStorage for user preferences

## Changelog

```
Changelog:
- July 06, 2025. Initial setup
- July 06, 2025. Integrated PostgreSQL database with persistent storage
- July 06, 2025. Implemented Popular/Home navigation with visual indicators
- July 06, 2025. Made logo clickable to navigate to home view
- July 06, 2025. Enhanced Create button with visible orange styling and "Create" text label
- July 06, 2025. Replaced sidebar Create Post section with Recent Posts display
- July 06, 2025. Added User Profile page accessible by clicking username in header
- July 06, 2025. Moved About section from sidebar to User Profile page
- July 06, 2025. Improved voting UI with Reddit-style orange/purple color scheme
- July 06, 2025. Added back button to User Profile page for easy homepage navigation
- July 06, 2025. Removed About section from User Profile page for cleaner interface
- July 06, 2025. Updated comment button behavior to navigate to post detail pages
- July 06, 2025. Implemented Save button functionality for posts with database storage
- July 06, 2025. Added Saved Posts section to User Profile page showing saved content
- July 06, 2025. Save button shows orange color when saved and toggles save/unsave
- July 06, 2025. Enhanced save button with optimistic updates for immediate UI response
- July 06, 2025. Updated Share button to copy link directly with toast notifications instead of modal dialog
- July 06, 2025. Added highlighted orange state to Share button when link is copied (resets on page reload)
- July 06, 2025. Fixed Share button highlighting to only show one highlighted post at a time globally
- July 06, 2025. Reordered User Profile page sections from left to right: Recent Posts, Saved Posts, Recent Comments
- July 06, 2025. Fixed Recent Posts section on User Profile page to show all platform posts instead of user-specific posts
- July 06, 2025. Implemented infinite scrolling on homepage with pagination (10 posts per page)
- July 06, 2025. Made Recent Posts section in sidebar truly infinite - shows all visited posts without limit
- July 06, 2025. Fixed Recent Posts ordering consistency between homepage sidebar and profile page using visited posts logic
- July 06, 2025. Made all User Profile page sections infinite: Recent Posts, Saved Posts, and Recent Comments (removed 5-item limits)
- July 06, 2025. Added community information and clickable functionality to Recent Posts and Saved Posts sections on profile page
- July 06, 2025. Reordered profile page posts to show community first, then title
- July 06, 2025. Applied consistent light blue styling (text-blue-600/text-blue-400) for community names across homepage and profile page
- July 06, 2025. Enhanced Recent Comments section on profile page to show community, post title, and made clickable to navigate to post details
- July 06, 2025. Made Recent Comments section styling consistent with Recent Posts and Saved Posts sections by removing "Commented on:" prefix
- July 06, 2025. Fixed Recent Comments styling to exactly match Recent Posts: post titles now use h3 element with proper font weight and comment text is smaller (text-xs)
- July 06, 2025. Added comment focusing: clicking Recent Comments navigates to post and scrolls to specific comment with temporary blue ring highlight
- July 06, 2025. Improved navigation UX: posts/comments accessed from User Profile now show "Back to Profile" instead of "Back to Home" button
- July 06, 2025. Changed Saved button styling from orange to red for better visual distinction
- July 06, 2025. Performed database cleanup: removed all posts, comments, votes, and saved posts for fresh start
- July 06, 2025. Restored sample data: 6 posts, 5 comments, and 4 votes to repopulate the platform
- July 06, 2025. Fixed Recent Comments regression: automatic refresh when new comments added and restored comment focusing functionality
- July 06, 2025. Added comment counts to Recent Comments section on Profile page to match Recent Posts and Saved Posts formatting
- July 06, 2025. Fixed search functionality: proper search clearing when switching views/filters and added search results indicator with clear button
- July 06, 2025. Improved search to be case-insensitive and search both post titles and content for better results
- July 07, 2025. Added green comment icon visual indicator for posts where the user has commented
- July 07, 2025. Updated Recent Posts section to automatically show newly created posts at the top
- July 07, 2025. Rebranded platform from "Reddit" to "Coco" with new gradient logo design and updated content
- July 07, 2025. Loaded comprehensive test dataset: 3,011 posts, 1,010 comments, and 1,000 votes for performance testing
- July 07, 2025. Removed karma/scoring system from user profiles for cleaner interface
- July 07, 2025. Fixed comment count bug: updated all 3,011 posts to display correct comment counts throughout platform
- July 07, 2025. Fixed search functionality on post detail pages: search now properly navigates to homepage with search results
- July 07, 2025. Fixed Recent Posts section not loading visited posts: implemented localStorage change detection and custom events for real-time updates
- July 07, 2025. Fixed Recent Posts count inconsistency between homepage and profile page: both now use dedicated queries to fetch all visited posts regardless of pagination
- July 07, 2025. Implemented comprehensive testing strategy: created unit tests, integration tests, and testing documentation to prevent Recent Posts regressions
- July 07, 2025. Expanded testing framework to cover ALL platform features: 68+ tests across post functionality, UI, authentication, and performance
- July 07, 2025. Fixed React key duplication warnings: added unique prefixes to distinguish posts in sidebar, profile sections, and comments
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```