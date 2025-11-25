import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  adminId: varchar("admin_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Users table with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("operator"),
  companyId: varchar("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
}).extend({
  adminId: z.string().optional(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(["super-admin", "admin", "operator", "viewer"]).default("operator"),
  companyId: z.string().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = "super-admin" | "admin" | "operator" | "viewer";

// Printers table
export const printers = pgTable("printers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull(),
  model: text("model").notNull(),
  ipAddress: text("ip_address"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrinterSchema = createInsertSchema(printers).omit({
  id: true,
  createdAt: true,
}).extend({
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
});

export type InsertPrinter = z.infer<typeof insertPrinterSchema>;
export type Printer = typeof printers.$inferSelect;

// Print Jobs table
export const printJobs = pgTable("print_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  printerId: varchar("printer_id").notNull().references(() => printers.id),
  documentName: text("document_name").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  pageCount: integer("page_count").notNull(),
  copies: integer("copies").notNull().default(1),
  colorMode: text("color_mode").notNull().default("bw"),
  paperSize: text("paper_size").notNull().default("letter"),
  status: text("status").notNull().default("completed"),
  printedAt: timestamp("printed_at").notNull().defaultNow(),
});

export const insertPrintJobSchema = createInsertSchema(printJobs).omit({
  id: true,
  printedAt: true,
}).extend({
  colorMode: z.enum(["bw", "color"]).default("bw"),
  paperSize: z.enum(["letter", "legal", "a4", "a3"]).default("letter"),
  status: z.enum(["completed", "pending", "failed"]).default("completed"),
  pageCount: z.number().int().positive(),
  copies: z.number().int().positive().default(1),
  fileSize: z.number().int().positive(),
});

export type InsertPrintJob = z.infer<typeof insertPrintJobSchema>;
export type PrintJob = typeof printJobs.$inferSelect;

// Extended print job type with joined user and printer info
export type PrintJobWithDetails = PrintJob & {
  user: Pick<User, "id" | "username" | "fullName">;
  printer: Pick<Printer, "id" | "name" | "location">;
};

// Consumption summary type for analytics
export type ConsumptionStats = {
  totalJobs: number;
  totalPages: number;
  totalBWPages: number;
  totalColorPages: number;
  totalPaperUsed: number;
  estimatedInkUsed: number;
  period: string;
};

// Dashboard stats type
export type DashboardStats = {
  totalPrintJobs: number;
  totalUsers: number;
  totalPrinters: number;
  totalPagesThisMonth: number;
  recentJobs: PrintJobWithDetails[];
  topUsers: Array<{ userId: string; username: string; jobCount: number }>;
  topPrinters: Array<{ printerId: string; printerName: string; jobCount: number }>;
};
