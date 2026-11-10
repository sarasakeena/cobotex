import { prisma } from "@/lib/prisma";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a citizen tracking code like "ERP-7K8M2X"
 * Excludes confusing characters like 0/O and 1/I.
 */
export function generateTrackingCode(): string {
  let result = "ERP-";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_ALPHABET.length);
    result += CODE_ALPHABET[randomIndex];
  }
  return result;
}

export type IncidentEventType =
  | "REPORTED"
  | "ASSIGNED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "BACKUP_REQUESTED"
  | "BACKUP_ASSIGNED"
  | "RESOLVED"
  | "REOPENED";

/**
 * Log an incident event to the database.
 * Never throws — catches and logs errors gracefully so calling operations are never interrupted.
 */
export async function logEvent(
  incidentId: string,
  type: IncidentEventType | string,
  publicMessage: string | null,
  internalMessage: string
) {
  try {
    return await prisma.incidentEvent.create({
      data: {
        incidentId,
        type,
        publicMessage,
        internalMessage,
      },
    });
  } catch (error) {
    console.error(`[logEvent] Failed to log event for incident ${incidentId}:`, error);
    return null;
  }
}

export interface TimelineEvent {
  id: string;
  type: string;
  publicMessage: string | null;
  internalMessage: string;
  createdAt: Date;
  isSynthetic?: boolean;
}

/**
 * Build timeline events for an incident.
 * If logged events exist, they are returned.
 * If no logged events exist (or for legacy incidents), a timeline is synthesized
 * from timestamps (createdAt, assignedAt, enRouteAt, arrivedAt, resolvedAt).
 */
export function buildTimelineEvents(incident: any): TimelineEvent[] {
  const existingEvents: TimelineEvent[] = (incident.events || []).map((e: any) => ({
    id: e.id,
    type: e.type,
    publicMessage: e.publicMessage,
    internalMessage: e.internalMessage,
    createdAt: new Date(e.createdAt),
    isSynthetic: false,
  }));

  if (existingEvents.length > 0) {
    return existingEvents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Fallback: synthesize timeline from timestamps
  const synthetic: TimelineEvent[] = [];

  if (incident.createdAt) {
    synthetic.push({
      id: `syn-rep-${incident.id}`,
      type: "REPORTED",
      publicMessage: "Your report was received.",
      internalMessage: `Incident reported. Category: ${incident.category || "GENERAL"}, Severity: ${incident.severity || "UNKNOWN"}.`,
      createdAt: new Date(incident.createdAt),
      isSynthetic: true,
    });
  }

  if (incident.assignedAt) {
    const team = incident.assignedTeam;
    const cat = team?.category || incident.category || "Emergency";
    const code = team?.code || "Response Team";
    const eta = incident.etaMinutes ?? 12;
    synthetic.push({
      id: `syn-ass-${incident.id}`,
      type: "ASSIGNED",
      publicMessage: `A ${cat} team (${code}) has been assigned. Estimated arrival: ${eta} min.`,
      internalMessage: `Assigned primary team ${code} (${cat}). Distance: ${incident.distanceKm ?? "?"} km, ETA: ${eta} min.`,
      createdAt: new Date(incident.assignedAt),
      isSynthetic: true,
    });
  }

  if (incident.enRouteAt) {
    synthetic.push({
      id: `syn-enr-${incident.id}`,
      type: "EN_ROUTE",
      publicMessage: "The team is on the way.",
      internalMessage: "Primary team departed staging location and is en route to incident coordinates.",
      createdAt: new Date(incident.enRouteAt),
      isSynthetic: true,
    });
  }

  if (incident.arrivedAt) {
    synthetic.push({
      id: `syn-arr-${incident.id}`,
      type: "ARRIVED",
      publicMessage: "The team has arrived and is working at the location.",
      internalMessage: "Primary response team arrived on site and initiated operations.",
      createdAt: new Date(incident.arrivedAt),
      isSynthetic: true,
    });
  }

  if (incident.resolvedAt || incident.status === "RESOLVED") {
    synthetic.push({
      id: `syn-res-${incident.id}`,
      type: "RESOLVED",
      publicMessage: "This emergency has been marked resolved by the response team.",
      internalMessage: `Incident marked RESOLVED.${incident.resolutionNote ? ` Note: ${incident.resolutionNote}` : ""}`,
      createdAt: incident.resolvedAt ? new Date(incident.resolvedAt) : new Date(incident.updatedAt || incident.createdAt),
      isSynthetic: true,
    });
  }

  return synthetic.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
