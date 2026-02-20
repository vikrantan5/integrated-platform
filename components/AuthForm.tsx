"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { signUp, signIn } from "@/lib/actions/auth.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function AuthForm({ type }: { type: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "jobseeker" as "jobseeker" | "recruiter",
    phoneNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === "sign-up") {
        // Create Firebase auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // Create Firestore user document
        const result = await signUp({
          uid: userCredential.user.uid,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phoneNumber: formData.phoneNumber,
        });

        if (result.success) {
          toast.success("Account created successfully!");
          // Redirect based on role
          if (formData.role === "recruiter") {
            router.push("/recruiter/dashboard");
          } else {
            router.push("/jobseeker/jobs");
          }
        } else {
          toast.error(result.error || "Failed to create account");
        }
      } else {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        const idToken = await userCredential.user.getIdToken();

        const result = await signIn({
          email: formData.email,
          idToken,
        });

        if (result.success && result.user) {
          toast.success("Signed in successfully!");
          // Redirect based on role
          if (result.user.role === "recruiter") {
            router.push("/recruiter/dashboard");
          } else {
            router.push("/jobseeker/jobs");
          }
        } else {
          toast.error(result.error || "Failed to sign in");
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {type === "sign-in" ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-center">
            {type === "sign-in"
              ? "Sign in to your account"
              : "Join HireAI - Find jobs and complete AI interviews"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "sign-up" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">I am a</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "jobseeker" | "recruiter") =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jobseeker">Job Seeker</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Please wait..."
                : type === "sign-in"
                ? "Sign In"
                : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {type === "sign-in" ? (
              <p>
                Don't have an account?{" "}
                <a href="/sign-up" className="text-blue-600 hover:underline">
                  Sign up
                </a>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <a href="/sign-in" className="text-blue-600 hover:underline">
                  Sign in
                </a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
