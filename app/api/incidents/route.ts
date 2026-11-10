import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSeverity, CategoryType } from "@/lib/severity";

const VALID_CATEGORIES: CategoryType[] = [
  "FIRE",
  "ROAD_ACCIDENT",
  "MEDICAL",
  "FLOOD",
  "BUILDING_COLLAPSE",
  "OTHER",
];

// GET /api/incidents - List all incidents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    const where: any = {};
    if (category && VALID_CATEGORIES.includes(category as CategoryType)) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }
    if (severity) {
      where.severity = severity;
    }

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Custom sorting: Critical incidents visually prioritized to top, then newest first
    const sorted = [...incidents].sort((a, b) => {
      if (a.severity === "CRITICAL" && b.severity !== "CRITICAL") return -1;
      if (a.severity !== "CRITICAL" && b.severity === "CRITICAL") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Failed to fetch incidents:", error);
    return NextResponse.json(
      { error: "Internal server error fetching incidents" },
      { status: 500 }
    );
  }
}

// POST /api/incidents - Create a new emergency incident report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, location, peopleAffected, contactInfo } = body;

    const errors: Record<string, string> = {};

    // Validate Title
    if (!title || typeof title !== "string" || !title.trim()) {
      errors.title = "Incident title is required.";
    }

    // Validate Description
    if (!description || typeof description !== "string" || !description.trim()) {
      errors.description = "Detailed incident description is required.";
    }

    // Validate Category
    if (!category || !VALID_CATEGORIES.includes(category as CategoryType)) {
      errors.category = "Please select a valid emergency category.";
    }

    // Validate Location
    if (!location || typeof location !== "string" || !location.trim()) {
      errors.location = "Incident location is required.";
    }

    // Validate People Affected
    const parsedPeople = parseInt(peopleAffected, 10);
    if (isNaN(parsedPeople) || parsedPeople < 0) {
      errors.peopleAffected = "Number of people affected must be a positive number (minimum 0).";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors },
        { status: 400 }
      );
    }

    // Compute Severity with pure function
    const severityResult = calculateSeverity(
      category as CategoryType,
      parsedPeople,
      title.trim(),
      description.trim()
    );

    const incident = await prisma.incident.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category as any,
        location: location.trim(),
        peopleAffected: parsedPeople,
        contactInfo: contactInfo ? String(contactInfo).trim() : null,
        severity: severityResult.severity as any,
        status: "REPORTED",
      },
    });

    return NextResponse.json(
      {
        ...incident,
        severityScore: severityResult.score,
        severityReasons: severityResult.reasons,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create incident:", error);
    return NextResponse.json(
      { error: "Failed to record incident report" },
      { status: 500 }
    );
  }
}
