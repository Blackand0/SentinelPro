import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  adminId: varchar("admin_id"),
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
  companyId: varchar("company_id"),
  departmentId: varchar("department_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Departments table - NEW
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  companyId: varchar("company_id").notNull(),
  managerId: varchar("manager_id"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Paper Types table - NEW
export const paperTypes = pgTable("paper_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  size: text("size").notNull(),
  weight: integer("weight").notNull(),
  color: text("color").notNull().default("white"),
  pricePerSheet: decimal("price_per_sheet", { precision: 10, scale: 4 }),
  stock: integer("stock").notNull().default(0),
  companyId: varchar("company_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Toner Inventory table - NEW
export const tonerInventory = pgTable("toner_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  color: text("color").notNull(),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
  printerId: varchar("printer_id"),
  companyId: varchar("company_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Maintenance Logs table - NEW
export const maintenanceLogs = pgTable("maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  printerId: varchar("printer_id").notNull(),
  technicianId: varchar("technician_id"),
  maintenanceType: text("maintenance_type").notNull(),
  description: text("description").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pending"),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Alerts table - NEW
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("info"),
  read: boolean("read").notNull().default(false),
  resourceId: varchar("resource_id"),
  resourceType: text("resource_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Printers table
export const printers = pgTable("printers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull(),
  model: text("model").notNull(),
  ipAddress: text("ip_address"),
  companyId: varchar("company_id"),
  departmentId: varchar("department_id"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Print Jobs table
export const printJobs = pgTable("print_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  printerId: varchar("printer_id").notNull(),
  documentName: text("document_name").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  pageCount: integer("page_count").notNull(),
  copies: integer("copies").notNull().default(1),
  colorMode: text("color_mode").notNull().default("bw"),
  paperSize: text("paper_size").notNull().default("letter"),
  paperTypeId: varchar("paper_type_id"),
  status: text("status").notNull().default("completed"),
  printedAt: timestamp("printed_at").notNull().defaultNow(),
});

// Insert Schemas
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
  departmentId: z.string().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  companyId: z.string(),
  managerId: z.string().optional(),
  budget: z.string().optional(),
});

export const insertPaperTypeSchema = createInsertSchema(paperTypes).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "El nombre es requerido"),
  size: z.enum(["letter", "legal", "a4", "a3", "a5"]),
  weight: z.number().int().positive(),
  color: z.string().default("white"),
  pricePerSheet: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  companyId: z.string().optional(),
});

export const insertTonerInventorySchema = createInsertSchema(tonerInventory).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "El nombre es requerido"),
  brand: z.string().min(1, "La marca es requerida"),
  model: z.string().min(1, "El modelo es requerido"),
  color: z.enum(["black", "cyan", "magenta", "yellow", "tricolor"]),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  pricePerUnit: z.string().optional(),
  printerId: z.string().optional(),
  companyId: z.string().optional(),
});

export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  printerId: z.string().min(1, "La impresora es requerida"),
  technicianId: z.string().optional(),
  maintenanceType: z.enum(["preventive", "corrective", "emergency"]),
  description: z.string().min(1, "La descripción es requerida"),
  cost: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(["printer_offline", "low_stock", "quota_exceeded", "maintenance_due", "system"]),
  title: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["info", "warning", "error"]).default("info"),
  read: z.boolean().default(false),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
});

export const insertPrinterSchema = createInsertSchema(printers).omit({
  id: true,
  createdAt: true,
}).extend({
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
  companyId: z.string().optional(),
  departmentId: z.string().optional(),
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
  paperTypeId: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

// Types
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = "super-admin" | "admin" | "operator" | "viewer";

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertPaperType = z.infer<typeof insertPaperTypeSchema>;
export type PaperType = typeof paperTypes.$inferSelect;

export type InsertTonerInventory = z.infer<typeof insertTonerInventorySchema>;
export type TonerInventory = typeof tonerInventory.$inferSelect;

export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertPrinter = z.infer<typeof insertPrinterSchema>;
export type Printer = typeof printers.$inferSelect;

export type InsertPrintJob = z.infer<typeof insertPrintJobSchema>;
export type PrintJob = typeof printJobs.$inferSelect;

// Extended print job type with joined user and printer info
export type PrintJobWithDetails = PrintJob & {
  user: Pick<User, "id" | "username" | "fullName">;
  printer: Pick<Printer, "id" | "name" | "location">;
};

// Maintenance log with details
export type MaintenanceLogWithDetails = MaintenanceLog & {
  printer: Pick<Printer, "id" | "name" | "location" | "model">;
  technician?: Pick<User, "id" | "fullName">;
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
  totalCompanies?: number;
  totalPrinters: number;
  totalPagesThisMonth: number;
  recentJobs: PrintJobWithDetails[];
  topUsers: Array<{ userId: string; username: string; jobCount: number }>;
  topPrinters: Array<{ printerId: string; printerName: string; jobCount: number }>;
};
