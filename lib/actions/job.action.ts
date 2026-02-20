"use server";

import { adminDb } from "@/lib/firebase/admin";
import { Job, Company } from "@/types";
import { generateId } from "@/lib/utils";

// ======================================================
// 🔥 FIRESTORE SERIALIZER (VERY IMPORTANT)
// Converts Firestore Timestamp -> ISO string
// Ensures only plain JSON objects go to client
// ======================================================

function serializeDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;

  // Ignore dummy initialization docs
  if (doc.id === "_init") return null;

  const serialized: Record<string, any> = {
    id: doc.id,
  };

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "toDate" in value) {
      serialized[key] = value.toDate().toISOString();
    } else {
      serialized[key] = value;
    }
  }

  return serialized;
}

function serializeCollection<T>(snapshot: FirebaseFirestore.QuerySnapshot): T[] {
  return snapshot.docs
    .map((doc) => serializeDoc(doc))
    .filter(Boolean) as T[];
}

// ======================================================
// ============ COMPANY ACTIONS ==========================
// ======================================================

export async function createCompany(
  companyData: Omit<Company, "id" | "createdAt">
): Promise<{ success: boolean; companyId?: string; error?: string }> {
  try {
    const companyId = generateId();

    const company: Company = {
      ...companyData,
      id: companyId,
      createdAt: new Date().toISOString(),
    };

    await adminDb().collection("companies").doc(companyId).set(company);

    return { success: true, companyId };
  } catch (error: any) {
    console.error("Create company error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCompaniesByOwner(ownerId: string): Promise<Company[]> {
  try {
    const snapshot = await adminDb()
      .collection("companies")
      .where("ownerId", "==", ownerId)
      .orderBy("createdAt", "desc")
      .get();

    return serializeCollection<Company>(snapshot);
  } catch (error) {
    console.error("Get companies error:", error);
    return [];
  }
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  try {
    const doc = await adminDb().collection("companies").doc(companyId).get();
    return doc.exists ? (serializeDoc(doc) as Company) : null;
  } catch (error) {
    console.error("Get company error:", error);
    return null;
  }
}

// ======================================================
// ============ JOB ACTIONS ==============================
// ======================================================

export async function createJob(
  jobData: Omit<Job, "id" | "createdAt">
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const jobId = generateId();

    const job: Job = {
      ...jobData,
      id: jobId,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    await adminDb().collection("jobs").doc(jobId).set(job);

    return { success: true, jobId };
  } catch (error: any) {
    console.error("Create job error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAllJobs(filters?: {
  status?: string;
  location?: string;
  search?: string;
}): Promise<Job[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb()
      .collection("jobs")
      .orderBy("createdAt", "desc");

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }

    const snapshot = await query.limit(100).get();
    let jobs = serializeCollection<Job>(snapshot);

    // Client-side search filtering
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          job.title?.toLowerCase().includes(s) ||
          job.description?.toLowerCase().includes(s) ||
          job.role?.toLowerCase().includes(s)
      );
    }

    if (filters?.location) {
      const loc = filters.location.toLowerCase();
      jobs = jobs.filter((job) =>
        job.location?.toLowerCase().includes(loc)
      );
    }

    return jobs;
  } catch (error) {
    console.error("Get jobs error:", error);
    return [];
  }
}

export async function getJobById(jobId: string): Promise<Job | null> {
  try {
    const doc = await adminDb().collection("jobs").doc(jobId).get();
    return doc.exists ? (serializeDoc(doc) as Job) : null;
  } catch (error) {
    console.error("Get job error:", error);
    return null;
  }
}

export async function getJobsByRecruiter(recruiterId: string): Promise<Job[]> {
  try {
    const snapshot = await adminDb()
      .collection("jobs")
      .where("recruiterId", "==", recruiterId)
      .orderBy("createdAt", "desc")
      .get();

    return serializeCollection<Job>(snapshot);
  } catch (error) {
    console.error("Get recruiter jobs error:", error);
    return [];
  }
}

export async function updateJob(
  jobId: string,
  updates: Partial<Job>
): Promise<{ success: boolean; error?: string }> {
  try {
    await adminDb().collection("jobs").doc(jobId).update(updates);
    return { success: true };
  } catch (error: any) {
    console.error("Update job error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await adminDb().collection("jobs").doc(jobId).delete();
    return { success: true };
  } catch (error: any) {
    console.error("Delete job error:", error);
    return { success: false, error: error.message };
  }
}