# Reddit Clone Application

## Overview

This is a full-stack Reddit clone built with React, Express.js, and TypeScript. The application features a modern social media interface with posts, comments, voting, and subreddit communities. It uses shadcn/ui components for a polished user interface and implements real-time interactions through React Query.

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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```