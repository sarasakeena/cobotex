import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSeverity, formatCategoryName, CategoryType } from "@/lib/severity";

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
    const {
      title,
      description,
      category,
      location,
      latitude,
      longitude,
      address,
      tags = [],
      peopleAffected = 0,
      contactInfo,
      photo,
    } = body;

    const errors: Record<string, string> = {};

    // Validate Category
    if (!category || !VALID_CATEGORIES.includes(category as CategoryType)) {
      errors.category = "Please select a valid emergency category.";
    }

    // Validate and resolve Location string
    let resolvedLocation = "";
    const hasCoordinates =
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      !isNaN(latitude) &&
      !isNaN(longitude);

    const cleanAddress = address && typeof address === "string" ? address.trim() : "";

    if (cleanAddress) {
      resolvedLocation = cleanAddress;
    } else if (hasCoordinates) {
      resolvedLocation = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } else if (location && typeof location === "string" && location.trim()) {
      resolvedLocation = location.trim();
    } else {
      errors.location = "Location is required (device coordinates, map pin, or address).";
    }

    // Validate People Affected
    const parsedPeople = parseInt(String(peopleAffected), 10);
    if (isNaN(parsedPeople) || parsedPeople < 0) {
      errors.peopleAffected = "Number of people affected must be a positive number (minimum 0).";
    }

    // Normalize tags
    const cleanTags: string[] = Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors },
        { status: 400 }
      );
    }

    // Auto-generate Title if not provided
    const categoryLabel = formatCategoryName(category as CategoryType);
    let resolvedTitle = title && typeof title === "string" && title.trim() ? title.trim() : "";
    if (!resolvedTitle) {
      resolvedTitle = cleanAddress
        ? `${categoryLabel} reported - ${cleanAddress}`
        : `${categoryLabel} reported`;
    }

    // Auto-generate Description if not provided
    let resolvedDesc =
      description && typeof description === "string" && description.trim()
        ? description.trim()
        : "";

    if (!resolvedDesc) {
      const tagSnippet = cleanTags.length > 0 ? ` ${cleanTags.join(", ")}.` : "";
      resolvedDesc = `${categoryLabel} reported. ${parsedPeople} people affected.${tagSnippet}`;
    }

    // Compute Severity with pure function
    const severityResult = calculateSeverity({
      category: category as CategoryType,
      peopleAffected: parsedPeople,
      tags: cleanTags,
      title: resolvedTitle,
      description: resolvedDesc,
    });

    const incident = await prisma.incident.create({
      data: {
        title: resolvedTitle,
        description: resolvedDesc,
        category: category as any,
        location: resolvedLocation,
        latitude: hasCoordinates ? latitude : null,
        longitude: hasCoordinates ? longitude : null,
        address: cleanAddress || null,
        tags: JSON.stringify(cleanTags),
        photo: photo && typeof photo === "string" ? photo : null,
        peopleAffected: parsedPeople,
        contactInfo: contactInfo ? String(contactInfo).trim() : null,
        severity: severityResult.severity as any,
        status: "REPORTED",
      },
    });

    return NextResponse.json(
      {
        ...incident,
        tags: cleanTags,
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
