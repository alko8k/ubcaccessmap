-- Building height in metres, from UBC's open data (BLDG_HEIGHT, or MAX_FLOORS
-- as a fallback). Nullable and additive, so code that predates it keeps working.
ALTER TABLE "Building" ADD COLUMN "heightM" DOUBLE PRECISION;
