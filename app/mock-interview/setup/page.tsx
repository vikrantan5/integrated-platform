"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { createMockInterview } from "@/lib/actions/mock-interview.action";
import { checkInterviewAccess, recordInterviewUsage } from "@/lib/actions/subscription.action";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
// import { Sparkles, Brain, Code, X } from "lucide-react";
import { Sparkles, Brain, Code, X, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Product Manager",
  "UI/UX Designer",
  "QA Engineer",
];

const LEVELS = [
  { value: "Junior", label: "Junior (0-2 years)", experience: 1 },
  { value: "Mid-Level", label: "Mid-Level (3-5 years)", experience: 4 },
  { value: "Senior", label: "Senior (6-10 years)", experience: 8 },
  { value: "Lead", label: "Lead (10+ years)", experience: 12 },
];

const TECH_STACK_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Django",
  "FastAPI",
  "Java",
  "Spring Boot",
  "AWS",
  "Docker",
  "Kubernetes",
  "MongoDB",
  "PostgreSQL",
  "Redis",
  "GraphQL",
  "REST API",
];

export default function MockInterviewSetup() {





  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [level, setLevel] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessReason, setAccessReason] = useState<"subscription" | "free-trial" | "no-access">("no-access");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        setUserId(user.uid);
        setUserName(user.displayName || "User");
        await checkAccess(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const checkAccess = async (uid: string) => {
    try {
      const accessResult = await checkInterviewAccess(uid);
      setHasAccess(accessResult.hasAccess);
      setAccessReason(accessResult.reason);

      if (!accessResult.hasAccess) {
        toast.error("You need a subscription to access AI Mock Interviews");
      } else if (accessResult.reason === "free-trial") {
        toast.info("🎉 You have 1 free interview available!");
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleAddTech = (tech: string) => {
    if (tech && !techStack.includes(tech)) {
      setTechStack([...techStack, tech]);
    }
  };

  const handleRemoveTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const handleAddCustomTech = () => {
    if (customTech.trim() && !techStack.includes(customTech.trim())) {
      setTechStack([...techStack, customTech.trim()]);
      setCustomTech("");
    }
  };

  const handleStartInterview = async () => {
    const finalRole = role === "Custom" ? customRole : role;

    if (!finalRole || !level || techStack.length === 0) {
      toast.error("Please fill in all fields and select at least one technology");
      return;
    }

    if (!hasAccess) {
      toast.error("You need a subscription to start an interview");
      router.push("/subscription");
      return;
    }

    setLoading(true);
    try {
      const selectedLevel = LEVELS.find((l) => l.value === level);
      const result = await createMockInterview({
        userId,
        userName,
        role: finalRole,
        level,
        techstack: techStack,
        experience: selectedLevel?.experience || 1,
      });

      if (result.success && result.interviewId) {
        // Record interview usage
        if (accessReason === "free-trial") {
          await recordInterviewUsage(userId);
          toast.success("Starting your free interview!");
        } else {
          toast.success("Mock interview created! Starting...");
        }
        router.push(`/mock-interview/session/${result.interviewId}`);
      } else {
        toast.error(result.error || "Failed to create interview");
      }
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="border-2 border-red-200 shadow-xl">
            <CardContent className="pt-6 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Subscription Required
                </h2>
                <p className="text-gray-600">
                  You've used your free trial. Subscribe to continue accessing AI Mock Interviews.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm text-blue-900 font-semibold mb-2">
                      What you get with a subscription:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Unlimited AI Mock Interviews</li>
                      <li>• Detailed Performance Analytics</li>
                      <li>• Interview Feedback Reports</li>
                      <li>• Practice Question Bank</li>
                    </ul>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => router.push("/subscription")}
                className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                View Subscription Plans
              </Button>
              <Button
                variant="link"
                onClick={() => router.push("/jobseeker/dashboard")}
              >
                ← Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              AI Mock Interview Setup
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Practice your interview skills with our AI interviewer. Choose your role, experience level,
            and tech stack to get personalized questions.
          </p>
          
          {/* Access Status */}
          {accessReason === "free-trial" && (
            <div className="mt-4 inline-block">
              <Badge className="bg-green-600 text-white px-4 py-2">
                🎉 Using Free Trial (1 interview)
              </Badge>
            </div>
          )}
          {accessReason === "subscription" && (
            <div className="mt-4 inline-block">
              <Badge className="bg-purple-600 text-white px-4 py-2">
                ✨ Active Subscription
              </Badge>
            </div>
          )}
        </div>

        {/* Setup Form */}
        <Card className="shadow-xl border-2 border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Configure Your Interview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-base font-semibold">
                Select Role
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role" data-testid="role-select">
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                  <SelectItem value="Custom">Custom Role</SelectItem>
                </SelectContent>
              </Select>
              {role === "Custom" && (
                <Input
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="Enter custom role..."
                  className="mt-2"
                  data-testid="custom-role-input"
                />
              )}
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <Label htmlFor="level" className="text-base font-semibold">
                Experience Level
              </Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger id="level" data-testid="level-select">
                  <SelectValue placeholder="Choose experience level..." />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tech Stack */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Code className="h-4 w-4" />
                Tech Stack (Select at least one)
              </Label>

              {/* Selected Technologies */}
              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech) => (
                    <Badge
                      key={tech}
                      variant="secondary"
                      className="px-3 py-1 text-sm"
                      data-testid={`tech-badge-${tech}`}
                    >
                      {tech}
                      <button
                        onClick={() => handleRemoveTech(tech)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Tech Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {TECH_STACK_OPTIONS.map((tech) => (
                  <Button
                    key={tech}
                    type="button"
                    variant={techStack.includes(tech) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleAddTech(tech)}
                    className="text-xs"
                    data-testid={`tech-option-${tech}`}
                  >
                    {tech}
                  </Button>
                ))}
              </div>

              {/* Custom Tech */}
              <div className="flex gap-2">
                <Input
                  value={customTech}
                  onChange={(e) => setCustomTech(e.target.value)}
                  placeholder="Add custom technology..."
                  onKeyPress={(e) => e.key === "Enter" && handleAddCustomTech()}
                  data-testid="custom-tech-input"
                />
                <Button type="button" variant="outline" onClick={handleAddCustomTech}>
                  Add
                </Button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 What to expect:</strong> You'll go through a 5-question technical interview
                tailored to your role and experience. You can choose between voice or text mode, and
                receive detailed AI-powered feedback at the end.
              </p>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartInterview}
              disabled={loading || !role || !level || techStack.length === 0}
              className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              data-testid="start-interview-button"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Interview...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Start Mock Interview
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Button variant="link" onClick={() => router.push("/jobseeker/dashboard")}>
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}








//   const router = useRouter();
//   const [userId, setUserId] = useState("");
//   const [userName, setUserName] = useState("");
//   const [role, setRole] = useState("");
//   const [customRole, setCustomRole] = useState("");
//   const [level, setLevel] = useState("");
//   const [techStack, setTechStack] = useState<string[]>([]);
//   const [customTech, setCustomTech] = useState("");
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       if (!user) {
//         router.push("/sign-in");
//       } else {
//         setUserId(user.uid);
//         setUserName(user.displayName || "User");
//       }
//     });
//     return () => unsubscribe();
//   }, [router]);

//   const handleAddTech = (tech: string) => {
//     if (tech && !techStack.includes(tech)) {
//       setTechStack([...techStack, tech]);
//     }
//   };

//   const handleRemoveTech = (tech: string) => {
//     setTechStack(techStack.filter((t) => t !== tech));
//   };

//   const handleAddCustomTech = () => {
//     if (customTech.trim() && !techStack.includes(customTech.trim())) {
//       setTechStack([...techStack, customTech.trim()]);
//       setCustomTech("");
//     }
//   };

//   const handleStartInterview = async () => {
//     const finalRole = role === "Custom" ? customRole : role;

//     if (!finalRole || !level || techStack.length === 0) {
//       toast.error("Please fill in all fields and select at least one technology");
//       return;
//     }

//     setLoading(true);
//     try {
//       const selectedLevel = LEVELS.find((l) => l.value === level);
//       const result = await createMockInterview({
//         userId,
//         userName,
//         role: finalRole,
//         level,
//         techstack: techStack,
//         experience: selectedLevel?.experience || 1,
//       });

//       if (result.success && result.interviewId) {
//         toast.success("Mock interview created! Starting...");
//         router.push(`/mock-interview/session/${result.interviewId}`);
//       } else {
//         toast.error(result.error || "Failed to create interview");
//       }
//     } catch (error) {
//       console.error("Setup error:", error);
//       toast.error("Failed to start interview");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
//       <Navbar />

//       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <div className="flex items-center justify-center gap-3 mb-4">
//             <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
//               <Sparkles className="h-6 w-6 text-white" />
//             </div>
//             <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
//               AI Mock Interview Setup
//             </h1>
//           </div>
//           <p className="text-gray-600 max-w-2xl mx-auto">
//             Practice your interview skills with our AI interviewer. Choose your role, experience level,
//             and tech stack to get personalized questions.
//           </p>
//         </div>

//         {/* Setup Form */}
//         <Card className="shadow-xl border-2 border-blue-100">
//           <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
//             <CardTitle className="flex items-center gap-2">
//               <Brain className="h-5 w-5 text-blue-600" />
//               Configure Your Interview
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-6 pt-6">
//             {/* Role Selection */}
//             <div className="space-y-2">
//               <Label htmlFor="role" className="text-base font-semibold">
//                 Select Role
//               </Label>
//               <Select value={role} onValueChange={setRole}>
//                 <SelectTrigger id="role" data-testid="role-select">
//                   <SelectValue placeholder="Choose a role..." />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {ROLES.map((r) => (
//                     <SelectItem key={r} value={r}>
//                       {r}
//                     </SelectItem>
//                   ))}
//                   <SelectItem value="Custom">Custom Role</SelectItem>
//                 </SelectContent>
//               </Select>
//               {role === "Custom" && (
//                 <Input
//                   value={customRole}
//                   onChange={(e) => setCustomRole(e.target.value)}
//                   placeholder="Enter custom role..."
//                   className="mt-2"
//                   data-testid="custom-role-input"
//                 />
//               )}
//             </div>

//             {/* Experience Level */}
//             <div className="space-y-2">
//               <Label htmlFor="level" className="text-base font-semibold">
//                 Experience Level
//               </Label>
//               <Select value={level} onValueChange={setLevel}>
//                 <SelectTrigger id="level" data-testid="level-select">
//                   <SelectValue placeholder="Choose experience level..." />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {LEVELS.map((l) => (
//                     <SelectItem key={l.value} value={l.value}>
//                       {l.label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Tech Stack */}
//             <div className="space-y-3">
//               <Label className="text-base font-semibold flex items-center gap-2">
//                 <Code className="h-4 w-4" />
//                 Tech Stack (Select at least one)
//               </Label>

//               {/* Selected Technologies */}
//               {techStack.length > 0 && (
//                 <div className="flex flex-wrap gap-2">
//                   {techStack.map((tech) => (
//                     <Badge
//                       key={tech}
//                       variant="secondary"
//                       className="px-3 py-1 text-sm"
//                       data-testid={`tech-badge-${tech}`}
//                     >
//                       {tech}
//                       <button
//                         onClick={() => handleRemoveTech(tech)}
//                         className="ml-2 hover:text-red-600"
//                       >
//                         <X className="h-3 w-3" />
//                       </button>
//                     </Badge>
//                   ))}
//                 </div>
//               )}

//               {/* Tech Selection Grid */}
//               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
//                 {TECH_STACK_OPTIONS.map((tech) => (
//                   <Button
//                     key={tech}
//                     type="button"
//                     variant={techStack.includes(tech) ? "default" : "outline"}
//                     size="sm"
//                     onClick={() => handleAddTech(tech)}
//                     className="text-xs"
//                     data-testid={`tech-option-${tech}`}
//                   >
//                     {tech}
//                   </Button>
//                 ))}
//               </div>

//               {/* Custom Tech */}
//               <div className="flex gap-2">
//                 <Input
//                   value={customTech}
//                   onChange={(e) => setCustomTech(e.target.value)}
//                   placeholder="Add custom technology..."
//                   onKeyPress={(e) => e.key === "Enter" && handleAddCustomTech()}
//                   data-testid="custom-tech-input"
//                 />
//                 <Button type="button" variant="outline" onClick={handleAddCustomTech}>
//                   Add
//                 </Button>
//               </div>
//             </div>

//             {/* Info Box */}
//             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//               <p className="text-sm text-blue-900">
//                 <strong>💡 What to expect:</strong> You'll go through a 5-question technical interview
//                 tailored to your role and experience. You can choose between voice or text mode, and
//                 receive detailed AI-powered feedback at the end.
//               </p>
//             </div>

//             {/* Start Button */}
//             <Button
//               onClick={handleStartInterview}
//               disabled={loading || !role || !level || techStack.length === 0}
//               className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
//               data-testid="start-interview-button"
//             >
//               {loading ? (
//                 <>
//                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
//                   Creating Interview...
//                 </>
//               ) : (
//                 <>
//                   <Sparkles className="h-5 w-5 mr-2" />
//                   Start Mock Interview
//                 </>
//               )}
//             </Button>
//           </CardContent>
//         </Card>

//         {/* Back Link */}
//         <div className="text-center mt-6">
//           <Button variant="link" onClick={() => router.push("/jobseeker/dashboard")}>
//             ← Back to Dashboard
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }
