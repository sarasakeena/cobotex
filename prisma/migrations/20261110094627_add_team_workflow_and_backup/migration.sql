-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "arrivedAt" DATETIME;
ALTER TABLE "Incident" ADD COLUMN "enRouteAt" DATETIME;
ALTER TABLE "Incident" ADD COLUMN "resolutionNote" TEXT;
ALTER TABLE "Incident" ADD COLUMN "resolvedAt" DATETIME;

-- CreateTable
CREATE TABLE "IncidentTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "requestId" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enRouteAt" DATETIME,
    "arrivedAt" DATETIME,
    "releasedAt" DATETIME,
    "distanceKm" REAL,
    "etaMinutes" INTEGER,
    CONSTRAINT "IncidentTeam_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncidentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncidentTeam_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BackupRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "peopleNeeded" INTEGER NOT NULL,
    "teamType" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "fulfilledTeamIds" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "BackupRequest_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BackupRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "currentIncidentId" TEXT,
    "pin" TEXT NOT NULL DEFAULT '1234',
    "memberCount" INTEGER NOT NULL DEFAULT 4,
    "lastLocationAt" DATETIME,
    "speedKmh" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Team" ("address", "category", "code", "createdAt", "currentIncidentId", "id", "latitude", "longitude", "name", "status", "updatedAt") SELECT "address", "category", "code", "createdAt", "currentIncidentId", "id", "latitude", "longitude", "name", "status", "updatedAt" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
