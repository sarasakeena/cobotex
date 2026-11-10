import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSeverity, formatCategoryName, CategoryType } from "@/lib/severity";
import { calculatePriority } from "@/lib/priority";
import { generateTrackingCode, logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: CategoryType[] = [
  "FIRE",
  "ROAD_ACCIDENT",
  "MEDICAL",
  "FLOOD",
  "BUILDING_COLLAPSE",
  "OTHER",
];

// GET /api/incidents - List all incidents with read-time priority and assigned team
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
      include: {
        assignedTeam: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            status: true,
          },
        },
      },
    });

    // Compute read-time dynamic priority for each incident
    const withPriority = incidents.map((inc) => {
      const prio = calculatePriority({
        severity: inc.severity,
        peopleAffected: inc.peopleAffected,
        category: inc.category,
        createdAt: inc.createdAt,
        status: inc.status,
      });

      return {
        ...inc,
        priority: prio,
      };
    });

    // Default sort: Unresolved by priority descending, resolved at the bottom
    withPriority.sort((a, b) => {
      const aResolved = a.status === "RESOLVED";
      const bResolved = b.status === "RESOLVED";

      if (!aResolved && bResolved) return -1;
      if (aResolved && !bResolved) return 1;

      // Both unresolved or both resolved -> sort by priority score descending
      if (b.priority.score !== a.priority.score) {
        return b.priority.score - a.priority.score;
      }

      // Tie breaker: older created time first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Assign rank number to unresolved incidents
    let currentRank = 1;
    const finalResult = withPriority.map((inc) => {
      if (inc.status !== "RESOLVED") {
        return { ...inc, priorityRank: currentRank++ };
      }
      return { ...inc, priorityRank: null };
    });

    return NextResponse.json(finalResult);
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
    const hasCoordinates =
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      !isNaN(latitude) &&
      !isNaN(longitude);

    const cleanAddress = address && typeof address === "string" ? address.trim() : "";
    const cleanDesc = description && typeof description === "string" ? description.trim() : "";

    // Check if address is junk or transcript text
    const isAddressJunk =
      !cleanAddress ||
      cleanAddress.length < 3 ||
      /\b(?:please|use\s+my|current\s+location|my\s+location)\b/i.test(cleanAddress) ||
      (cleanDesc.length > 0 && cleanAddress.toLowerCase() === cleanDesc.toLowerCase());

    let resolvedLocation = "";
    if (cleanAddress && !isAddressJunk) {
      resolvedLocation = cleanAddress;
    } else if (hasCoordinates) {
      resolvedLocation = `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
    } else if (location && typeof location === "string" && location.trim().length > 0) {
      const cleanLoc = location.trim();
      const isLocJunk =
        cleanLoc.length < 3 ||
        /\b(?:please|use\s+my|current\s+location|my\s+location)\b/i.test(cleanLoc) ||
        (cleanDesc.length > 0 && cleanLoc.toLowerCase() === cleanDesc.toLowerCase());

      resolvedLocation = isLocJunk ? "Location Pending" : cleanLoc;
    } else {
      errors.location = "Incident location or coordinates are required.";
    }

    // Validate Title
    let finalTitle = title;
    if (!finalTitle || typeof finalTitle !== "string" || !finalTitle.trim()) {
      const catName = formatCategoryName(category || "OTHER");
      const placeSnippet = resolvedLocation && resolvedLocation !== "Location Pending" ? ` at ${resolvedLocation}` : "";
      finalTitle = `${catName} Incident${placeSnippet}`;
    }

    // Validate Description
    if (!description || typeof description !== "string" || !description.trim()) {
      errors.description = "Incident description is required.";
    }

    // Validate People Affected
    const numPeople = parseInt(String(peopleAffected), 10);
    if (isNaN(numPeople) || numPeople < 0) {
      errors.peopleAffected = "Number of people affected must be 0 or greater.";
    }

    // Return 400 if validation fails
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          fields: errors,
        },
        { status: 400 }
      );
    }

    // Process Tags
    const parsedTags = Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [];

    // Calculate dynamic severity
    const severityResult = calculateSeverity({
      category: category as CategoryType,
      peopleAffected: numPeople,
      tags: parsedTags,
      title: finalTitle,
      description: description.trim(),
    });

    // Generate citizen tracking code
    let trackingCode = generateTrackingCode();
    // Ensure uniqueness
    const existingCode = await prisma.incident.findUnique({ where: { trackingCode } });
    if (existingCode) {
      trackingCode = generateTrackingCode();
    }

    // Save to Database
    const newIncident = await prisma.incident.create({
      data: {
        trackingCode,
        title: finalTitle.trim(),
        description: description.trim(),
        category,
        location: resolvedLocation,
        latitude: hasCoordinates ? latitude : null,
        longitude: hasCoordinates ? longitude : null,
        address: cleanAddress && !isAddressJunk ? cleanAddress : null,
        tags: JSON.stringify(parsedTags),
        photo: photo && typeof photo === "string" ? photo : null,
        peopleAffected: numPeople,
        contactInfo: contactInfo && typeof contactInfo === "string" ? contactInfo.trim() : null,
        severity: severityResult.severity,
        status: "REPORTED",
      },
      include: {
        assignedTeam: true,
      },
    });

    // Log REPORTED event
    await logEvent(
      newIncident.id,
      "REPORTED",
      "Your report was received.",
      `Incident reported: ${newIncident.title}. Category: ${newIncident.category}, Severity: ${newIncident.severity}.`
    );

    const priorityResult = calculatePriority({
      severity: newIncident.severity,
      peopleAffected: newIncident.peopleAffected,
      category: newIncident.category,
      createdAt: newIncident.createdAt,
      status: newIncident.status,
    });

    return NextResponse.json(
      {
        ...newIncident,
        tags: parsedTags,
        severityScore: severityResult.score,
        severityReasons: severityResult.reasons,
        priority: priorityResult,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create incident:", error);
    return NextResponse.json(
      { error: "Internal server error creating incident report" },
      { status: 500 }
    );
  }
}
