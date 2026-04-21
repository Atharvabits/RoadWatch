import { pgTable, text, real, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const anomalyTypeEnum = pgEnum("anomaly_type", ["pothole", "speedbreaker", "breakdown"]);
export const anomalyStatusEnum = pgEnum("anomaly_status", ["reported", "verified", "repair_assigned", "fixed"]);

export const anomalies = pgTable("anomalies", {
  id:        text("id").primaryKey(),
  lat:       real("lat").notNull(),
  lng:       real("lng").notNull(),
  type:      anomalyTypeEnum("type").notNull(),
  intensity: real("intensity").notNull(),
  location:  text("location"),
  hits:      integer("hits").default(1).notNull(),
  status:    anomalyStatusEnum("status").default("reported").notNull(),
  photoUrl:  text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AnomalyRow = typeof anomalies.$inferSelect;
export type AnomalyInsert = typeof anomalies.$inferInsert;
