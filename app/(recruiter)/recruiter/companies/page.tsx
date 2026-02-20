"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { createCompany, getCompaniesByOwner } from "@/lib/actions/job.action";
import { Company } from "@/types";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    logo: "",
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        setCurrentUserId(user.uid);
        await loadCompanies(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadCompanies = async (userId: string) => {
    setLoading(true);
    const comps = await getCompaniesByOwner(userId);
    setCompanies(comps);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    setCreating(true);
    try {
      const result = await createCompany({
        ...formData,
        ownerId: currentUserId,
      });

      if (result.success) {
        toast.success("Company created successfully!");
        setShowDialog(false);
        setFormData({ name: "", description: "", website: "", logo: "" });
        await loadCompanies(currentUserId);
      } else {
        toast.error(result.error || "Failed to create company");
      }
    } catch (error) {
      toast.error("Failed to create company");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              My Companies
            </h1>
            <p className="text-gray-600 mt-2">Manage your company profiles</p>
          </div>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="create-company-button">
                <Plus className="h-4 w-4" />
                Create Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="company-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                    data-testid="company-description-input"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                    data-testid="company-website-input"
                  />
                </div>

                <div>
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    type="url"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    data-testid="company-logo-input"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={creating} data-testid="submit-company-button">
                  {creating ? "Creating..." : "Create Company"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : companies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No companies yet</p>
              <Button onClick={() => setShowDialog(true)}>Create Your First Company</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Card key={company.id} data-testid={`company-card-${company.id}`}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Visit Website
                        </a>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">{company.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
