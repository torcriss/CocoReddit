import { useState } from "react";
import { Search, Plus, Moon, Sun, Home, Bookmark, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "./ThemeProvider";
import CreatePostDialog from "./CreatePostDialog";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

interface HeaderProps {
  onSearch: (query: string) => void;
  viewMode?: "home" | "popular";
  onViewModeChange?: (mode: "home" | "popular") => void;
}

export default function Header({ onSearch, viewMode = "home", onViewModeChange }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <>
      <header className="bg-white dark:bg-reddit-darker border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-4">
              <div 
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onViewModeChange?.("home")}
              >
                <div className="w-8 h-8 bg-reddit-orange rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">reddit</span>
              </div>
              
              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onViewModeChange?.("home")}
                  className={`flex items-center space-x-1 ${
                    viewMode === "home" 
                      ? "text-reddit-blue bg-blue-50 dark:bg-blue-900/20" 
                      : "text-gray-700 dark:text-gray-300 hover:text-reddit-blue"
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onViewModeChange?.("popular")}
                  className={`flex items-center space-x-1 ${
                    viewMode === "popular" 
                      ? "text-reddit-blue bg-blue-50 dark:bg-blue-900/20" 
                      : "text-gray-700 dark:text-gray-300 hover:text-reddit-blue"
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  <span>Popular</span>
                </Button>
              </nav>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-4">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search Reddit"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-gray-100 dark:bg-reddit-dark border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-reddit-blue focus:border-transparent"
                />
                <div className="absolute left-3 top-2.5">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              </form>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreatePostOpen(true)}
                  className="text-gray-500 dark:text-gray-400 hover:text-reddit-blue"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              )}
              
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="text-gray-500 dark:text-gray-400 hover:text-reddit-blue"
              >
                {theme === "dark" ? (
                  <Sun className="h-6 w-6" />
                ) : (
                  <Moon className="h-6 w-6" />
                )}
              </Button>
              
              {/* Auth Section */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  {user?.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-reddit-blue rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user?.firstName?.[0] || user?.email?.[0] || "U"}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = "/api/logout"}
                    className="text-gray-500 dark:text-gray-400 hover:text-reddit-blue"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = "/api/login"}
                  className="text-gray-500 dark:text-gray-400 hover:text-reddit-blue flex items-center space-x-1"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <CreatePostDialog 
        open={isCreatePostOpen} 
        onOpenChange={setIsCreatePostOpen} 
      />
    </>
  );
}
