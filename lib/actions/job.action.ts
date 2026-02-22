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


// ======================================================
// ============ EXTERNAL JOBS ACTIONS ====================
// ======================================================

export async function saveExternalJobs(
  jobs: Job[]
): Promise<{ success: boolean; saved: number; skipped: number; errors: string[] }> {
  try {
    let saved = 0;
    let skipped = 0;
    const errors: string[] = [];

    const batch = adminDb().batch();
    let batchCount = 0;
    const MAX_BATCH = 500; // Firestore batch limit

    for (const job of jobs) {
      try {
        // Check if job already exists by external URL
        if (job.externalUrl) {
          const existing = await adminDb()
            .collection("jobs")
            .where("externalUrl", "==", job.externalUrl)
            .limit(1)
            .get();

          if (!existing.empty) {
            skipped++;
            continue;
          }
        }
        // Remove undefined values to avoid Firestore errors
        const cleanedJob: Record<string, any> = {};
        for (const [key, value] of Object.entries(job)) {
          if (value !== undefined) {
            cleanedJob[key] = value;
          }
        }


        // Add to batch
        const docRef = adminDb().collection("jobs").doc(job.id);
       batch.set(docRef, cleanedJob);
        batchCount++;
        saved++;

        // Commit batch if we hit the limit
        if (batchCount >= MAX_BATCH) {
          await batch.commit();
          batchCount = 0;
        }
      } catch (error: any) {
        errors.push(`Failed to save job ${job.id}: ${error.message}`);
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`External jobs saved: ${saved}, skipped: ${skipped}`);
    return { success: true, saved, skipped, errors };
  } catch (error: any) {
    console.error("Save external jobs error:", error);
    return { success: false, saved: 0, skipped: 0, errors: [error.message] };
  }
}

export async function getAllJobsMerged(filters?: {
  status?: string;
  location?: string;
  search?: string;
  source?: "recruiter" | "external" | "all";
}): Promise<Job[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb()
      .collection("jobs")
      .orderBy("createdAt", "desc");

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }

    // Filter by source if specified
    if (filters?.source && filters.source !== "all") {
      query = query.where("source", "==", filters.source);
    }

    const snapshot = await query.limit(200).get();
    let jobs = serializeCollection<Job>(snapshot);

    // Set default source for legacy jobs without source field
    jobs = jobs.map((job) => ({
      ...job,
      source: job.source || "recruiter",
    }));

    // Client-side search filtering
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          job.title?.toLowerCase().includes(s) ||
          job.description?.toLowerCase().includes(s) ||
          job.role?.toLowerCase().includes(s) ||
          job.externalCompany?.toLowerCase().includes(s) ||
          job.companyName?.toLowerCase().includes(s)
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
    console.error("Get merged jobs error:", error);
    return [];
  }
}

export async function getExternalJobsCount(): Promise<number> {
  try {
    const snapshot = await adminDb()
      .collection("jobs")
      .where("source", "==", "external")
      .count()
      .get();

    return snapshot.data().count;
  } catch (error) {
    console.error("Get external jobs count error:", error);
    return 0;
  }
}