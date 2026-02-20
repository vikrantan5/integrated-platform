"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { SignInParams, SignUpParams, User } from "@/types";

export async function signUp(params: SignUpParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { uid, name, email, role, phoneNumber } = params;

    // Create user document in Firestore
    const userDoc: User = {
      id: uid,
      name,
      email,
      role,
      bio: "",
      skills: [],
      phoneNumber,
      savedJobs: [],
      createdAt: new Date().toISOString(),
    };

    await adminDb().collection("users").doc(uid).set(userDoc);

    return { success: true };
  } catch (error: any) {
    console.error("Sign up error:", error);
    return { success: false, error: error.message };
  }
}

export async function signIn(params: SignInParams): Promise<{ 
  success: boolean; 
  user?: User; 
  error?: string 
}> {
  try {
    const { email, idToken } = params;

    // Verify the ID token
    const decodedToken = await adminAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Get user from Firestore
    const userDoc = await adminDb().collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const user = userDoc.data() as User;

    return { success: true, user };
  } catch (error: any) {
    console.error("Sign in error:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userDoc = await adminDb().collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as User;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<{ success: boolean; error?: string }> {
  try {
    await adminDb().collection("users").doc(userId).update(updates);
    return { success: true };
  } catch (error: any) {
    console.error("Update profile error:", error);
    return { success: false, error: error.message };
  }
}
