"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { getUserById } from "@/lib/actions/auth.action";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Building2,
  LogOut,
  FileText,
  Home,
  FileCheck,
  MessageSquare,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUserById(firebaseUser.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully");
      router.push("/sign-in");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (loading) {
    return (
      <nav className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="text-2xl font-bold text-blue-600">HireAI</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href={user?.role === "recruiter" ? "/recruiter/dashboard" : "/jobseeker/jobs"}>
            <div className="text-2xl font-bold text-blue-600 cursor-pointer">
              HireAI
            </div>
          </Link>

          {user && (
            <>
              {/* Desktop Menu */}
              <div className="hidden lg:flex items-center gap-4">
                {user.role === "jobseeker" ? (
                  <>
                    <Link href="/jobseeker/jobs">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Browse Jobs
                      </Button>
                    </Link>
                    <Link href="/jobseeker/applications">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <FileText className="h-4 w-4" />
                        My Applications
                      </Button>
                    </Link>
                    <Link href="/jobseeker/resume">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <FileCheck className="h-4 w-4" />
                        Resume Analyzer
                      </Button>
                    </Link>
                    <Link href="/mock-interview/setup">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        AI Mock Interview
                      </Button>
                    </Link>
                    <Link href="/jobseeker/dashboard">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Home className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/recruiter/dashboard">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Home className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/recruiter/companies">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Companies
                      </Button>
                    </Link>
                    <Link href="/recruiter/jobs">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Jobs
                      </Button>
                    </Link>
                  </>
                )}

                <div className="flex items-center gap-2 border-l pl-4 ml-2">
                  <div className="text-sm">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileMenu}
                  aria-label="Toggle menu"
                  data-testid="mobile-menu-button"
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        {user && mobileMenuOpen && (
          <div className="lg:hidden pb-4 pt-2" data-testid="mobile-menu">
            <div className="flex flex-col space-y-2">
              {user.role === "jobseeker" ? (
                <>
                  <Link href="/jobseeker/jobs" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Briefcase className="h-4 w-4" />
                      Browse Jobs
                    </Button>
                  </Link>
                  <Link href="/jobseeker/applications" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <FileText className="h-4 w-4" />
                      My Applications
                    </Button>
                  </Link>
                  <Link href="/jobseeker/resume" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <FileCheck className="h-4 w-4" />
                      Resume Analyzer
                    </Button>
                  </Link>
                  <Link href="/mock-interview/setup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <MessageSquare className="h-4 w-4" />
                      AI Mock Interview
                    </Button>
                  </Link>
                  <Link href="/jobseeker/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Home className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/recruiter/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Home className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/recruiter/companies" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Building2 className="h-4 w-4" />
                      Companies
                    </Button>
                  </Link>
                  <Link href="/recruiter/jobs" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Briefcase className="h-4 w-4" />
                      Jobs
                    </Button>
                  </Link>
                </>
              )}

              <div className="border-t pt-2 mt-2">
                <div className="px-3 py-2">
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}