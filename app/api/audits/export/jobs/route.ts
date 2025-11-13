import { NextRequest, NextResponse } from "next/server";
import { exportJobManager } from "@/lib/jobs/export-job-manager";

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all jobs for the user
    const jobs = exportJobManager.getUserJobs(session.user.id);

    // Convert to JSON-serializable format
    const serializableJobs = jobs.map(job => ({
      ...job,
      startTime: job.startTime.toISOString(),
      endTime: job.endTime ? job.endTime.toISOString() : undefined,
    }));

    return NextResponse.json({
      jobs: serializableJobs
    });
  } catch (error) {
    console.error("Error fetching export jobs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get server session (simplified)
async function getServerSession() {
  try {
    // This should be replaced with actual session management
    // For now, return a mock session for testing
    return { user: { id: "mock-user-id" } };
  } catch (error) {
    return null;
  }
}