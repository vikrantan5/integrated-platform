"use server";

import { adminDb } from "@/lib/firebase/admin";
import { Application } from "@/types";
import { generateId } from "@/lib/utils";

export async function createApplication(
  applicationData: Omit<Application, "id" | "createdAt" | "status">
): Promise<{ success: boolean; applicationId?: string; error?: string }> {
  try {
    const applicationId = generateId();
    const application: Application = {
      ...applicationData,
      id: applicationId,
      status: "pending",
      interviewStatus: "pending",
      createdAt: new Date().toISOString(),
    };

    await adminDb().collection("applications").doc(applicationId).set(application);

    return { success: true, applicationId };
  } catch (error: any) {
    console.error("Create application error:", error);
    return { success: false, error: error.message };
  }
}

export async function getApplicationsByApplicant(applicantId: string): Promise<Application[]> {
  try {
    const snapshot = await adminDb()
      .collection("applications")
      .where("applicantId", "==", applicantId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => doc.data() as Application);
  } catch (error) {
    console.error("Get applicant applications error:", error);
    return [];
  }
}

export async function getApplicationsByJob(jobId: string): Promise<Application[]> {
  try {
    const snapshot = await adminDb()
      .collection("applications")
      .where("jobId", "==", jobId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => doc.data() as Application);
  } catch (error) {
    console.error("Get job applications error:", error);
    return [];
  }
}

export async function getApplicationById(applicationId: string): Promise<Application | null> {
  try {
    const doc = await adminDb().collection("applications").doc(applicationId).get();
    return doc.exists ? (doc.data() as Application) : null;
  } catch (error) {
    console.error("Get application error:", error);
    return null;
  }
}

export async function updateApplication(
  applicationId: string,
  updates: Partial<Application>
): Promise<{ success: boolean; error?: string }> {
  try {
    await adminDb().collection("applications").doc(applicationId).update(updates);
    return { success: true };
  } catch (error: any) {
    console.error("Update application error:", error);
    return { success: false, error: error.message };
  }
}

export async function checkExistingApplication(
  applicantId: string,
  jobId: string
): Promise<boolean> {
  try {
    const snapshot = await adminDb()
      .collection("applications")
      .where("applicantId", "==", applicantId)
      .where("jobId", "==", jobId)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error("Check application error:", error);
    return false;
  }
}
