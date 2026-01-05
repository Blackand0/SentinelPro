import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, inArray, desc } from "drizzle-orm";
import postgres from "postgres";
import {
  users, printers, printJobs, companies,
  paperTypes, tonerInventory, maintenanceLogs, alerts, consumptionExpenses, auditLogs
} from "@shared/schema";
import type {
  User,
  InsertUser,
  Printer,
  InsertPrinter,
  PrintJob,
  InsertPrintJob,
  PrintJobWithDetails,
  DashboardStats,
  ConsumptionStats,
  Company,
  InsertCompany,
  PaperType,
  InsertPaperType,
  TonerInventory,
  InsertTonerInventory,
  MaintenanceLog,
  InsertMaintenanceLog,
  MaintenanceLogWithDetails,
  Alert,
  InsertAlert,
} from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(companyId?: string): Promise<UserWithoutPassword[]>;
  getUsersByCompany(companyId?: string): Promise<UserWithoutPassword[]>;
  deleteUser(id: string): Promise<void>;

  getPrinter(id: string): Promise<Printer | undefined>;
  getAllPrinters(companyId?: string): Promise<Printer[]>;
  createPrinter(printer: InsertPrinter): Promise<Printer>;
  updatePrinter(id: string, printer: Partial<InsertPrinter>): Promise<Printer | undefined>;
  deletePrinter(id: string): Promise<void>;

  getPrintJob(id: string): Promise<PrintJobWithDetails | undefined>;
  getAllPrintJobs(companyId?: string): Promise<PrintJobWithDetails[]>;
  createPrintJob(job: InsertPrintJob): Promise<PrintJob>;

  getCompany(id: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  updateCompanyAdmin(id: string, adminId: string | null): Promise<Company | undefined>;

  getPaperType(id: string): Promise<PaperType | undefined>;
  getAllPaperTypes(companyId?: string): Promise<PaperType[]>;
  createPaperType(paperType: InsertPaperType, userId?: string): Promise<PaperType>;
  updatePaperType(id: string, paperType: Partial<InsertPaperType>, userId?: string): Promise<PaperType | undefined>;
  deletePaperType(id: string, userId?: string): Promise<void>;

  getTonerInventory(id: string): Promise<TonerInventory | undefined>;
  getAllTonerInventory(companyId?: string): Promise<TonerInventory[]>;
  createTonerInventory(toner: InsertTonerInventory, userId?: string): Promise<TonerInventory>;
  updateTonerInventory(id: string, toner: Partial<InsertTonerInventory>, userId?: string): Promise<TonerInventory | undefined>;
  deleteTonerInventory(id: string, userId?: string): Promise<void>;

  getMaintenanceLog(id: string): Promise<MaintenanceLogWithDetails | undefined>;
  getAllMaintenanceLogs(companyId?: string): Promise<MaintenanceLogWithDetails[]>;
  createMaintenanceLog(log: InsertMaintenanceLog): Promise<MaintenanceLog>;
  updateMaintenanceLog(id: string, log: Partial<InsertMaintenanceLog>): Promise<MaintenanceLog | undefined>;
  deleteMaintenanceLog(id: string): Promise<void>;

  getAllAlerts(companyId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertRead(id: string): Promise<void>;
  deleteAlert(id: string): Promise<void>;

  getDashboardStats(companyId?: string): Promise<DashboardStats>;
  getConsumptionStats(period: string, companyId?: string): Promise<ConsumptionStats>;
  getAnalyticsData(companyId?: string): Promise<any>;
  createConsumptionExpense(expense: any): Promise<any>;

  createAuditLog(log: any): Promise<any>;
  getAuditLogs(companyId?: string, limit?: number): Promise<any[]>;

  getSupplyProjections(companyId?: string): Promise<any[]>;
  generateSupplyAlerts(companyId?: string): Promise<void>;
}

const getDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return process.env.DATABASE_URL;
};

export const sql = postgres(getDatabaseUrl(), {
  ssl: "require",
});
export const db = drizzle(sql);

export class PostgresStorage implements IStorage {
  // Helper para crear logs de auditoría
  private async createAuditLogEntry(
    companyId: string,
    userId: string,
    action: "CREATE" | "UPDATE" | "DELETE",
    tableName: string,
    recordId: string,
    oldValues?: any,
    newValues?: any,
    fieldChanges?: Array<{field: string, oldValue: any, newValue: any}>
  ) {
    try {
      const logs = [];

      if (fieldChanges && fieldChanges.length > 0) {
        // Crear log individual para cada campo que cambió
        for (const change of fieldChanges) {
          logs.push({
            companyId,
            userId,
            action,
            tableName,
            recordId,
            fieldName: change.field,
            oldValue: change.oldValue?.toString(),
            newValue: change.newValue?.toString(),
          });
        }
      } else {
        // Log general para la operación completa
        logs.push({
          companyId,
          userId,
          action,
          tableName,
          recordId,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
        });
      }

      for (const log of logs) {
        await db.insert(auditLogs).values(log);
      }
    } catch (error) {
      console.error("Error creating audit log entry:", error);
      // No lanzamos error para no interrumpir la operación principal
    }
  }
  private initializationAttempted = false;

  async initializeDatabase() {
    if (this.initializationAttempted) return;
    this.initializationAttempted = true;

    try {
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS companies (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          email text NOT NULL UNIQUE,
          admin_id varchar,
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);


      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS users (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          username text NOT NULL UNIQUE,
          password text NOT NULL,
          email text NOT NULL UNIQUE,
          full_name text NOT NULL,
          role text NOT NULL DEFAULT 'operator',
          company_id varchar,
          department_id varchar,
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS paper_types (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          size text NOT NULL,
          weight integer NOT NULL,
          color text NOT NULL DEFAULT 'white',
          price_per_sheet decimal(10,4),
          stock integer NOT NULL DEFAULT 0,
          company_id varchar,
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS printers (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          location text NOT NULL,
          model text NOT NULL,
          ip_address text,
          company_id varchar,
          department_id varchar,
          status text NOT NULL DEFAULT 'active',
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS toner_inventory (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          brand text NOT NULL,
          model text NOT NULL,
          color text NOT NULL,
          stock integer NOT NULL DEFAULT 0,
          min_stock integer NOT NULL DEFAULT 5,
          price_per_unit decimal(10,2),
          printer_id varchar,
          company_id varchar,
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS maintenance_logs (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          printer_id varchar NOT NULL,
          technician_id varchar,
          maintenance_type text NOT NULL,
          description text NOT NULL,
          cost decimal(10,2),
          status text NOT NULL DEFAULT 'pending',
          scheduled_date timestamp,
          completed_date timestamp,
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS print_jobs (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL,
          printer_id varchar NOT NULL,
          document_name text NOT NULL,
          file_name text NOT NULL,
          file_path text NOT NULL,
          file_size integer NOT NULL,
          page_count integer NOT NULL,
          copies integer NOT NULL DEFAULT 1,
          color_mode text NOT NULL DEFAULT 'bw',
          paper_size text NOT NULL DEFAULT 'letter',
          paper_type_id varchar,
          status text NOT NULL DEFAULT 'completed',
          printed_at timestamp NOT NULL DEFAULT now()
        );
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS session (
          sid varchar PRIMARY KEY,
          sess json NOT NULL,
          expire timestamp NOT NULL
        );
      `);

      // Migration: Add missing columns if they don't exist
      await sql.unsafe(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id varchar;
      `);

      await sql.unsafe(`
        ALTER TABLE printers ADD COLUMN IF NOT EXISTS department_id varchar;
      `);

      await sql.unsafe(`
        ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS paper_type_id varchar;
      `);

      await sql.unsafe(`
        ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS company_id varchar;
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS consumption_expenses (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id varchar NOT NULL,
          expense_type text NOT NULL,
          amount decimal(10,2) NOT NULL,
          description text NOT NULL,
          date timestamp NOT NULL DEFAULT now(),
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS alerts (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id varchar NOT NULL,
          type text NOT NULL,
          title text NOT NULL,
          message text NOT NULL,
          severity text NOT NULL DEFAULT 'info',
          read boolean NOT NULL DEFAULT false,
          resource_id varchar,
          resource_type text,
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id varchar NOT NULL,
          user_id varchar NOT NULL,
          action text NOT NULL,
          table_name text NOT NULL,
          record_id varchar NOT NULL,
          old_values text,
          new_values text,
          field_name text,
          old_value text,
          new_value text,
          ip_address text,
          user_agent text,
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      console.log("Database tables initialized successfully");
    } catch (error) {
      console.error("Error initializing database tables:", error);
    }
  }

  async initializeSuperAdmin() {
    try {
      const bcrypt = await import("bcrypt");
      const superAdminExists = await this.getUserByUsername("sentinelpro");
      
      if (!superAdminExists) {
        const hashedPassword = await bcrypt.default.hash("123456", 10);
        
        const defaultCompanyExists = await this.getCompany("00000000-0000-0000-0000-000000000010");
        if (!defaultCompanyExists) {
          await db.insert(companies).values({
            id: "00000000-0000-0000-0000-000000000010",
            name: "Empresa De Prueba",
            email: "empresa.prueba@sentinel.cl",
          }).onConflictDoNothing();
        }

        await db.insert(users).values({
          id: "00000000-0000-0000-0000-000000000001",
          username: "sentinelpro",
          password: hashedPassword,
          email: "sentinelpro@sentinel.cl",
          fullName: "Sentinel Pro - Super Admin",
          role: "super-admin",
          companyId: undefined,
        }).onConflictDoNothing();
        
        const adminExists = await this.getUserByUsername("admin");
        if (!adminExists) {
          const adminPassword = await bcrypt.default.hash("123456", 10);
          await db.insert(users).values({
            id: "00000000-0000-0000-0000-000000000002",
            username: "admin",
            password: adminPassword,
            email: "admin@empresa.prueba.cl",
            fullName: "Administrador",
            role: "admin",
            companyId: "00000000-0000-0000-0000-000000000010",
          }).onConflictDoNothing();
        }

        await db.insert(paperTypes).values({
          id: "00000000-0000-0000-0000-000000000030",
          name: "Papel Bond Carta",
          size: "letter",
          weight: 75,
          color: "white",
          pricePerSheet: "0.01",
          stock: 5000,
          companyId: "00000000-0000-0000-0000-000000000010",
        }).onConflictDoNothing();

        await db.insert(paperTypes).values({
          id: "00000000-0000-0000-0000-000000000031",
          name: "Papel Bond A4",
          size: "a4",
          weight: 80,
          color: "white",
          pricePerSheet: "0.012",
          stock: 3000,
          companyId: "00000000-0000-0000-0000-000000000010",
        }).onConflictDoNothing();
        
        console.log("Super admin created: sentinelpro / 123456");
        console.log("Test admin created: admin / 123456 (Empresa De Prueba)");
      }
    } catch (error) {
      console.error("Error initializing super admin:", error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    const user = result[0];

    // Registrar auditoría para creación de usuarios (operación administrativa crítica)
    if (user.companyId) {
      await this.createAuditLogEntry(
        user.companyId,
        user.id, // El propio usuario se registra como quien realizó la acción
        "CREATE",
        "users",
        user.id,
        null,
        { username: user.username, fullName: user.fullName, role: user.role, email: user.email }
      );
    }

    return user;
  }

  async getAllUsers(companyId?: string): Promise<UserWithoutPassword[]> {
    let query = db.select().from(users);
    
    if (companyId) {
      query = query.where(eq(users.companyId, companyId)) as typeof query;
    }
    
    const result = await query.orderBy(users.createdAt);
    return result.map(({ password, ...user }) => user).filter((u: any) => u.role !== "super-admin");
  }

  async getUsersByCompany(companyId: string): Promise<UserWithoutPassword[]> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.companyId, companyId))
      .orderBy(users.createdAt);
    
    return result
      .map(({ password, ...user }) => user)
      .filter((u: any) => u.role !== "super-admin");
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getPrinter(id: string): Promise<Printer | undefined> {
    const result = await db.select().from(printers).where(eq(printers.id, id));
    return result[0];
  }

  async getAllPrinters(companyId?: string): Promise<Printer[]> {
    if (companyId) {
      return db.select().from(printers).where(eq(printers.companyId, companyId)).orderBy(printers.createdAt);
    }
    return db.select().from(printers).orderBy(printers.createdAt);
  }

  async createPrinter(insertPrinter: InsertPrinter): Promise<Printer> {
    const result = await db.insert(printers).values(insertPrinter).returning();
    return result[0];
  }

  async updatePrinter(id: string, data: Partial<InsertPrinter>): Promise<Printer | undefined> {
    const result = await db.update(printers).set(data).where(eq(printers.id, id)).returning();
    return result[0];
  }

  async deletePrinter(id: string): Promise<void> {
    await db.delete(printers).where(eq(printers.id, id));
  }

async getPaperType(id: string): Promise<PaperType | undefined> {
    const result = await db.select().from(paperTypes).where(eq(paperTypes.id, id));
    return result[0];
  }

  async getAllPaperTypes(companyId?: string): Promise<PaperType[]> {
    if (companyId) {
      return db.select().from(paperTypes).where(eq(paperTypes.companyId, companyId)).orderBy(paperTypes.createdAt);
    }
    return db.select().from(paperTypes).orderBy(paperTypes.createdAt);
  }

  async createPaperType(insertPaperType: InsertPaperType, userId?: string): Promise<PaperType> {
    const result = await db.insert(paperTypes).values(insertPaperType).returning();
    const paperType = result[0];

    // Registrar auditoría si hay userId
    if (userId && paperType.companyId) {
      await this.createAuditLogEntry(
        paperType.companyId,
        userId,
        "CREATE",
        "paper_types",
        paperType.id,
        null,
        paperType
      );
    }

    return paperType;
  }

  async updatePaperType(id: string, data: Partial<InsertPaperType>, userId?: string): Promise<PaperType | undefined> {
    // Obtener valores anteriores para auditoría
    const oldPaperType = userId ? await this.getPaperType(id) : null;

    const result = await db.update(paperTypes).set(data).where(eq(paperTypes.id, id)).returning();
    const paperType = result[0];

    // Registrar auditoría si hay userId y valores anteriores
    if (userId && oldPaperType && paperType?.companyId) {
      const fieldChanges = [];

      // Detectar cambios en campos relevantes para auditoría
      if (data.stock !== undefined && data.stock !== oldPaperType.stock) {
        fieldChanges.push({
          field: "stock",
          oldValue: oldPaperType.stock,
          newValue: data.stock
        });
      }

      if (data.pricePerSheet !== undefined && data.pricePerSheet !== oldPaperType.pricePerSheet) {
        fieldChanges.push({
          field: "price_per_sheet",
          oldValue: oldPaperType.pricePerSheet,
          newValue: data.pricePerSheet
        });
      }

      if (fieldChanges.length > 0) {
        await this.createAuditLogEntry(
          paperType.companyId,
          userId,
          "UPDATE",
          "paper_types",
          id,
          oldPaperType,
          paperType,
          fieldChanges
        );
      }
    }

    return paperType;
  }

  async deletePaperType(id: string, userId?: string): Promise<void> {
    // Obtener valores antes de eliminar para auditoría
    const paperType = userId ? await this.getPaperType(id) : null;

    await db.delete(paperTypes).where(eq(paperTypes.id, id));

    // Registrar auditoría si hay userId y paperType
    if (userId && paperType?.companyId) {
      await this.createAuditLogEntry(
        paperType.companyId,
        userId,
        "DELETE",
        "paper_types",
        id,
        paperType,
        null
      );
    }
  }

  async getTonerInventory(id: string): Promise<TonerInventory | undefined> {
    const result = await db.select().from(tonerInventory).where(eq(tonerInventory.id, id));
    return result[0];
  }

  async getAllTonerInventory(companyId?: string): Promise<TonerInventory[]> {
    if (companyId) {
      return db.select().from(tonerInventory).where(eq(tonerInventory.companyId, companyId)).orderBy(tonerInventory.createdAt);
    }
    return db.select().from(tonerInventory).orderBy(tonerInventory.createdAt);
  }

  async createTonerInventory(insertToner: InsertTonerInventory, userId?: string): Promise<TonerInventory> {
    const result = await db.insert(tonerInventory).values(insertToner).returning();
    const toner = result[0];

    // Registrar auditoría si hay userId
    if (userId && toner.companyId) {
      await this.createAuditLogEntry(
        toner.companyId,
        userId,
        "CREATE",
        "toner_inventory",
        toner.id,
        null,
        toner
      );
    }

    return toner;
  }

  async updateTonerInventory(id: string, data: Partial<InsertTonerInventory>, userId?: string): Promise<TonerInventory | undefined> {
    // Obtener valores anteriores para auditoría
    const oldToner = userId ? await this.getTonerInventory(id) : null;

    const result = await db.update(tonerInventory).set(data).where(eq(tonerInventory.id, id)).returning();
    const toner = result[0];

    // Registrar auditoría si hay userId y valores anteriores
    if (userId && oldToner && toner?.companyId) {
      const fieldChanges = [];

      // Detectar cambios en campos relevantes para auditoría
      if (data.stock !== undefined && data.stock !== oldToner.stock) {
        fieldChanges.push({
          field: "stock",
          oldValue: oldToner.stock,
          newValue: data.stock
        });
      }

      if (data.pricePerUnit !== undefined && data.pricePerUnit !== oldToner.pricePerUnit) {
        fieldChanges.push({
          field: "price_per_unit",
          oldValue: oldToner.pricePerUnit,
          newValue: data.pricePerUnit
        });
      }

      if (data.minStock !== undefined && data.minStock !== oldToner.minStock) {
        fieldChanges.push({
          field: "min_stock",
          oldValue: oldToner.minStock,
          newValue: data.minStock
        });
      }

      if (fieldChanges.length > 0) {
        await this.createAuditLogEntry(
          toner.companyId,
          userId,
          "UPDATE",
          "toner_inventory",
          id,
          oldToner,
          toner,
          fieldChanges
        );
      }
    }

    return toner;
  }

  async deleteTonerInventory(id: string, userId?: string): Promise<void> {
    // Obtener valores antes de eliminar para auditoría
    const toner = userId ? await this.getTonerInventory(id) : null;

    await db.delete(tonerInventory).where(eq(tonerInventory.id, id));

    // Registrar auditoría si hay userId y toner
    if (userId && toner?.companyId) {
      await this.createAuditLogEntry(
        toner.companyId,
        userId,
        "DELETE",
        "toner_inventory",
        id,
        toner,
        null
      );
    }
  }

  async getMaintenanceLog(id: string): Promise<MaintenanceLogWithDetails | undefined> {
    const result = await db.select().from(maintenanceLogs).where(eq(maintenanceLogs.id, id));
    if (!result[0]) return undefined;

    const log = result[0];
    const printer = await this.getPrinter(log.printerId);
    if (!printer) return undefined;

    let technician: Pick<User, "id" | "fullName"> | undefined;
    if (log.technicianId) {
      const tech = await this.getUser(log.technicianId);
      if (tech) {
        technician = { id: tech.id, fullName: tech.fullName };
      }
    }

    return {
      ...log,
      printer: { id: printer.id, name: printer.name, location: printer.location, model: printer.model },
      technician,
    };
  }

  async getAllMaintenanceLogs(companyId?: string): Promise<MaintenanceLogWithDetails[]> {
    const query = db.select().from(maintenanceLogs).orderBy(desc(maintenanceLogs.createdAt));
    const logs = companyId 
      ? await query.where(eq(maintenanceLogs.companyId, companyId))
      : await query;
    
    const result: MaintenanceLogWithDetails[] = [];

    for (const log of logs) {
      let technician: Pick<User, "id" | "fullName"> | undefined;
      if (log.technicianId) {
        const tech = await this.getUser(log.technicianId);
        if (tech) {
          technician = { id: tech.id, fullName: tech.fullName };
        }
      }

      // Optional printer info for non-peripheral logs
      let printer: any = null;
      if (log.printerId) {
        const printerData = await this.getPrinter(log.printerId);
        if (printerData) {
          printer = { id: printerData.id, name: printerData.name, location: printerData.location, model: printerData.model };
        }
      }

      result.push({
        ...log,
        printer: printer,
        technician,
      });
    }

    return result;
  }

  async createMaintenanceLog(insertLog: InsertMaintenanceLog): Promise<MaintenanceLog> {
    const result = await db.insert(maintenanceLogs).values(insertLog).returning();
    return result[0];
  }

  async updateMaintenanceLog(id: string, data: Partial<InsertMaintenanceLog>): Promise<MaintenanceLog | undefined> {
    const result = await db.update(maintenanceLogs).set(data).where(eq(maintenanceLogs.id, id)).returning();
    return result[0];
  }

  async deleteMaintenanceLog(id: string): Promise<void> {
    await db.delete(maintenanceLogs).where(eq(maintenanceLogs.id, id));
  }

  async getPrintJob(id: string): Promise<PrintJobWithDetails | undefined> {
    const job = await db.select().from(printJobs).where(eq(printJobs.id, id));
    if (!job[0]) return undefined;

    const user = await this.getUser(job[0].userId);
    const printer = await this.getPrinter(job[0].printerId);

    if (!user || !printer) return undefined;

    return {
      ...job[0],
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
      },
      printer: {
        id: printer.id,
        name: printer.name,
        location: printer.location,
      },
    };
  }

  async getAllPrintJobs(companyId?: string): Promise<PrintJobWithDetails[]> {
    const jobs = await db.select().from(printJobs).orderBy(desc(printJobs.printedAt));
    
    const jobsWithDetails: PrintJobWithDetails[] = [];
    for (const job of jobs) {
      const user = await this.getUser(job.userId);
      const printer = await this.getPrinter(job.printerId);

      if (!user || !printer) continue;
      
      if (companyId && user.companyId !== companyId) continue;

      jobsWithDetails.push({
        ...job,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
        },
        printer: {
          id: printer.id,
          name: printer.name,
          location: printer.location,
        },
      });
    }

    return jobsWithDetails;
  }

  async createPrintJob(insertJob: InsertPrintJob): Promise<PrintJob> {
    const result = await db.insert(printJobs).values(insertJob).returning();
    const printJob = result[0];

    // Registrar auditoría para trabajos de impresión (operación crítica de consumo)
    try {
      const user = await this.getUser(insertJob.userId);
      if (user?.companyId) {
        await this.createAuditLogEntry(
          user.companyId,
          insertJob.userId,
          "CREATE",
          "print_jobs",
          printJob.id,
          null,
          {
            documentName: printJob.documentName,
            pageCount: printJob.pageCount,
            copies: printJob.copies,
            colorMode: printJob.colorMode,
            printerId: printJob.printerId
          }
        );
      }
    } catch (error) {
      console.error("Error creando log de auditoría para print job:", error);
      // No fallar la operación principal por error en auditoría
    }

    return printJob;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id));
    return result[0];
  }

  async getAllCompanies(): Promise<Company[]> {
    const result = await db.select().from(companies).orderBy(companies.createdAt);
    return result;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const result = await db.insert(companies).values(insertCompany).returning();
    const createdCompany = result[0];

    // Registrar auditoría para creación de compañías (operación crítica del sistema)
    await this.createAuditLogEntry(
      createdCompany.id, // Usar el ID de la compañía como companyId
      "system", // Usuario del sistema
      "CREATE",
      "companies",
      createdCompany.id,
      null,
      { name: createdCompany.name, email: createdCompany.email }
    );

    return createdCompany;
  }

  async deleteCompany(id: string): Promise<void> {
    // Obtener datos de la compañía antes de eliminar para auditoría
    const company = await this.getCompany(id);

    await db.delete(companies).where(eq(companies.id, id));

    // Registrar auditoría para eliminación de compañías (operación crítica del sistema)
    if (company) {
      await this.createAuditLogEntry(
        company.id,
        "system", // Usuario del sistema
        "DELETE",
        "companies",
        id,
        { name: company.name, email: company.email },
        null
      );
    }
  }

  async updateCompanyAdmin(id: string, adminId: string | null): Promise<Company | undefined> {
    if (adminId) {
      await db
        .update(users)
        .set({ companyId: id })
        .where(eq(users.id, adminId));
    }
    
    const result = await db
      .update(companies)
      .set({ adminId: adminId || undefined })
      .where(eq(companies.id, id))
      .returning();
    return result[0];
  }

  async getDashboardStats(companyId?: string): Promise<DashboardStats> {
    const filteredJobs = await this.getAllPrintJobs(companyId);
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const jobsThisMonth = filteredJobs.filter(
      (job) => new Date(job.printedAt) >= firstDayOfMonth
    );

    const pagesThisMonth = jobsThisMonth.reduce(
      (sum, job) => sum + job.pageCount * job.copies,
      0
    );

    let userCount = 0;
    let printerCount = 0;

    if (!companyId) {
      const allAdmins = await db.select().from(users).where(eq(users.role, "admin"));
      userCount = allAdmins.length;
    } else {
      const companyUsers = await db
        .select()
        .from(users)
        .where(and(
          eq(users.companyId, companyId),
          inArray(users.role, ["operator", "viewer"])
        ));
      userCount = companyUsers.length;
    }

    if (companyId) {
      const companyPrinters = await db
        .select()
        .from(printers)
        .where(eq(printers.companyId, companyId));
      printerCount = companyPrinters.length;
    } else {
      const allPrinters = await db.select().from(printers);
      printerCount = allPrinters.length;
    }

    const totalCompanies = !companyId 
      ? (await this.getAllCompanies()).length
      : undefined;

    const topUsers = Array.from(
      filteredJobs
        .reduce((acc: Map<string, { username: string; count: number }>, job) => {
          const existing = acc.get(job.userId) || { username: job.user.fullName, count: 0 };
          existing.count++;
          acc.set(job.userId, existing);
          return acc;
        }, new Map())
        .entries()
    )
      .map(([userId, data]) => ({
        userId,
        username: data.username,
        jobCount: data.count,
      }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 5);

    const topPrinters = Array.from(
      filteredJobs
        .reduce((acc: Map<string, { printerName: string; count: number }>, job) => {
          const existing = acc.get(job.printerId) || { printerName: job.printer.name, count: 0 };
          existing.count++;
          acc.set(job.printerId, existing);
          return acc;
        }, new Map())
        .entries()
    )
      .map(([printerId, data]) => ({
        printerId,
        printerName: data.printerName,
        jobCount: data.count,
      }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 5);

    // Obtener proyecciones de suministro
    const supplyProjections = await this.getSupplyProjections(companyId);

    return {
      totalPrintJobs: filteredJobs.length,
      totalUsers: userCount,
      totalCompanies,
      totalPrinters: printerCount,
      totalPagesThisMonth: pagesThisMonth,
      recentJobs: filteredJobs.slice(0, 10),
      topUsers: topUsers,
      topPrinters: topPrinters,
      supplyProjections: supplyProjections,
    };
  }

  async getConsumptionStats(period: string, companyId?: string): Promise<ConsumptionStats> {
    const allJobs = await this.getAllPrintJobs(companyId);
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filteredJobs = allJobs.filter(
      (job) => new Date(job.printedAt) >= startDate
    );

    const totalPages = filteredJobs.reduce(
      (sum, job) => sum + job.pageCount * job.copies,
      0
    );

    const bwJobs = filteredJobs.filter((job) => job.colorMode === "bw");
    const colorJobs = filteredJobs.filter((job) => job.colorMode === "color");

    const totalBWPages = bwJobs.reduce(
      (sum, job) => sum + job.pageCount * job.copies,
      0
    );

    const totalColorPages = colorJobs.reduce(
      (sum, job) => sum + job.pageCount * job.copies,
      0
    );

    const estimatedInkUsed = totalBWPages * 0.5 + totalColorPages * 1.5;

    // Get consumption expenses
    let totalExpenses = 0;
    try {
      let expenses: any[] = [];
      if (companyId) {
        expenses = await db.select().from(consumptionExpenses).where(eq(consumptionExpenses.companyId, companyId));
      } else {
        expenses = await db.select().from(consumptionExpenses);
      }
      
      const filteredExpenses = expenses.filter(e => new Date(e.date) >= startDate);
      totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    } catch (error) {
      console.error("Error getting expenses:", error);
    }

    return {
      totalJobs: filteredJobs.length,
      totalPages,
      totalBWPages,
      totalColorPages,
      totalPaperUsed: totalPages,
      estimatedInkUsed: Math.round(estimatedInkUsed * 10) / 10,
      totalExpenses,
      period,
    };
  }

  async getAllAlerts(companyId: string): Promise<Alert[]> {
    try {
      return await db.select().from(alerts).where(eq(alerts.companyId, companyId));
    } catch (error) {
      console.error("Error getting alerts:", error);
      return [];
    }
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await db.insert(alerts).values(alert).returning();
    return result[0];
  }

  async markAlertRead(id: string): Promise<void> {
    await db.update(alerts).set({ read: true }).where(eq(alerts.id, id));
  }

  async deleteAlert(id: string): Promise<void> {
    await db.delete(alerts).where(eq(alerts.id, id));
  }

  async createConsumptionExpense(expense: any) {
    try {
      const result = await db.insert(consumptionExpenses).values(expense).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating consumption expense:", error);
      throw error;
    }
  }

  async getAnalyticsData(companyId?: string) {
    try {
      const allJobs = await this.getAllPrintJobs(companyId);

      const jobsByDate: { [key: string]: number } = {};
      const jobsByPrinter: { [key: string]: number } = {};
      const jobsByUser: { [key: string]: number } = {};

      allJobs.forEach((job) => {
        const date = new Date(job.printedAt).toISOString().split("T")[0];
        jobsByDate[date] = (jobsByDate[date] || 0) + job.pageCount;

        jobsByPrinter[job.printer.name] = (jobsByPrinter[job.printer.name] || 0) + job.pageCount;
        jobsByUser[job.user.username] = (jobsByUser[job.user.username] || 0) + job.pageCount;
      });

      const topPrinters = Object.entries(jobsByPrinter)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, pages]) => ({ name, pages }));

      const topUsers = Object.entries(jobsByUser)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([username, pages]) => ({ username, pages }));

      const totalPages = allJobs.reduce((sum, j) => sum + j.pageCount, 0);
      const totalColorPages = allJobs.filter(j => j.colorMode === "color").reduce((sum, j) => sum + j.pageCount, 0);

      return {
        jobsByDate,
        topPrinters,
        topUsers,
        totalJobs: allJobs.length,
        totalPages,
        totalColorPages,
        costEstimate: (totalPages * 0.05) + (totalColorPages * 0.2),
      };
    } catch (error) {
      console.error("Error getting analytics:", error);
      return { jobsByDate: {}, topPrinters: [], topUsers: [], totalJobs: 0, totalPages: 0, totalColorPages: 0, costEstimate: 0 };
    }
  }

  async createAuditLog(logData: any) {
    try {
      const result = await db.insert(auditLogs).values(logData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating audit log:", error);
      throw error;
    }
  }

  async getAuditLogs(companyId?: string, limit: number = 100) {
    try {
      if (companyId) {
        return db.select().from(auditLogs).where(eq(auditLogs.companyId, companyId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
      }
      return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
    } catch (error) {
      console.error("Error getting audit logs:", error);
      return [];
    }
  }

  async getSupplyProjections(companyId?: string) {
    try {
      const projections = [];

      // Obtener trabajos de impresión de los últimos 90 días para análisis más preciso
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const allJobs = await this.getAllPrintJobs(companyId);
      const recentJobs = allJobs.filter(job =>
        new Date(job.printedAt) >= ninetyDaysAgo
      );

      // Función helper para calcular regresión lineal simple (tendencia)
      const calculateTrend = (dataPoints: Array<{ date: Date, value: number }>) => {
        if (dataPoints.length < 2) return 0;

        const n = dataPoints.length;
        const sumX = dataPoints.reduce((sum, point, index) => sum + index, 0);
        const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0);
        const sumXY = dataPoints.reduce((sum, point, index) => sum + index * point.value, 0);
        const sumXX = dataPoints.reduce((sum, point, index) => sum + index * index, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope;
      };

      // Función para calcular consumo diario predictivo
      const calculatePredictiveConsumption = (
        dailyConsumptions: number[],
        trend: number
      ): number => {
        if (dailyConsumptions.length === 0) return 0;

        // Usar promedio de los últimos 7 días + tendencia
        const recentAvg = dailyConsumptions.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, dailyConsumptions.length);
        const predicted = recentAvg + trend;

        // No permitir valores negativos y agregar un buffer del 10%
        return Math.max(predicted * 1.1, 0);
      };

      // Calcular consumo diario de papel por tipo con análisis predictivo
      const paperConsumptionByType: { [key: string]: Array<{ date: Date, pages: number }> } = {};

      for (const job of recentJobs) {
        if (job.paperTypeId) {
          const jobDate = new Date(job.printedAt);
          const dateKey = jobDate.toISOString().split('T')[0]; // YYYY-MM-DD

          if (!paperConsumptionByType[job.paperTypeId]) {
            paperConsumptionByType[job.paperTypeId] = [];
          }

          // Buscar si ya existe entrada para esta fecha
          const existingEntry = paperConsumptionByType[job.paperTypeId].find(
            entry => entry.date.toISOString().split('T')[0] === dateKey
          );

          if (existingEntry) {
            existingEntry.pages += job.pageCount;
          } else {
            paperConsumptionByType[job.paperTypeId].push({
              date: jobDate,
              pages: job.pageCount
            });
          }
        }
      }

      // Obtener tipos de papel con stock actual
      const paperTypes = await this.getAllPaperTypes(companyId);

      for (const paperType of paperTypes) {
        const consumptionData = paperConsumptionByType[paperType.id];

        if (consumptionData && consumptionData.length > 0) {
          // Ordenar por fecha y calcular consumos diarios
          consumptionData.sort((a, b) => a.date.getTime() - b.date.getTime());

          // Calcular tendencia usando regresión lineal
          const dailyConsumptions = consumptionData.map(d => d.pages);
          const trend = calculateTrend(consumptionData.map((d, i) => ({ date: d.date, value: d.pages })));

          // Calcular consumo predictivo
          const predictedDailyConsumption = calculatePredictiveConsumption(dailyConsumptions, trend);

          if (predictedDailyConsumption > 0) {
            const daysRemaining = Math.floor(paperType.stock / predictedDailyConsumption);

            // Calcular varianza para determinar confiabilidad
            const mean = dailyConsumptions.reduce((a, b) => a + b, 0) / dailyConsumptions.length;
            const variance = dailyConsumptions.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / dailyConsumptions.length;
            const confidence = variance < (mean * 0.5) ? "high" : variance < (mean * 1.0) ? "medium" : "low";

            projections.push({
              type: "paper",
              id: paperType.id,
              name: paperType.name,
              currentStock: paperType.stock,
              dailyConsumption: Math.round(predictedDailyConsumption * 100) / 100,
              trend: Math.round(trend * 100) / 100,
              daysRemaining: daysRemaining,
              estimatedDepletionDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: daysRemaining <= 3 ? "critical" : daysRemaining <= 7 ? "warning" : daysRemaining <= 14 ? "caution" : "normal",
              confidence: confidence,
              dataPoints: consumptionData.length
            });
          }
        }
      }

      // Calcular proyección para toner con análisis mejorado
      const tonerInventory = await this.getAllTonerInventory(companyId);
      const tonerConsumptionByColor: { [key: string]: Array<{ date: Date, pages: number }> } = {};

      for (const job of recentJobs) {
        if (job.colorMode === "color") {
          const jobDate = new Date(job.printedAt);
          const dateKey = jobDate.toISOString().split('T')[0];

          if (!tonerConsumptionByColor[job.colorMode]) {
            tonerConsumptionByColor[job.colorMode] = [];
          }

          const existingEntry = tonerConsumptionByColor[job.colorMode].find(
            entry => entry.date.toISOString().split('T')[0] === dateKey
          );

          if (existingEntry) {
            existingEntry.pages += job.pageCount;
          } else {
            tonerConsumptionByColor[job.colorMode].push({
              date: jobDate,
              pages: job.pageCount
            });
          }
        }
      }

      for (const toner of tonerInventory) {
        // Estimaciones más realistas basadas en tipo de color
        const estimatedPagesPerCartridge = toner.color === 'black' ? 2500 :
                                         toner.color === 'tricolor' ? 1500 : 1200;

        const consumptionData = tonerConsumptionByColor["color"] || [];

        if (consumptionData.length > 0) {
          consumptionData.sort((a, b) => a.date.getTime() - b.date.getTime());

          const dailyConsumptions = consumptionData.map(d => d.pages);
          const trend = calculateTrend(consumptionData.map((d, i) => ({ date: d.date, value: d.pages })));
          const predictedDailyConsumption = calculatePredictiveConsumption(dailyConsumptions, trend);

          if (predictedDailyConsumption > 0) {
            const pagesRemaining = toner.stock * estimatedPagesPerCartridge;
            const daysRemaining = Math.floor(pagesRemaining / predictedDailyConsumption);

            const mean = dailyConsumptions.reduce((a, b) => a + b, 0) / dailyConsumptions.length;
            const variance = dailyConsumptions.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / dailyConsumptions.length;
            const confidence = variance < (mean * 0.5) ? "high" : variance < (mean * 1.0) ? "medium" : "low";

            projections.push({
              type: "toner",
              id: toner.id,
              name: toner.name,
              color: toner.color,
              currentStock: toner.stock,
              dailyConsumption: Math.round(predictedDailyConsumption * 100) / 100,
              trend: Math.round(trend * 100) / 100,
              estimatedPagesPerUnit: estimatedPagesPerCartridge,
              daysRemaining: daysRemaining,
              estimatedDepletionDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: daysRemaining <= 3 ? "critical" : daysRemaining <= 7 ? "warning" : daysRemaining <= 14 ? "caution" : "normal",
              confidence: confidence,
              dataPoints: consumptionData.length
            });
          }
        }
      }

      // Ordenar por días restantes (más críticos primero)
      return projections.sort((a, b) => a.daysRemaining - b.daysRemaining);
    } catch (error) {
      console.error("Error calculating supply projections:", error);
      return [];
    }
  }

  async generateSupplyAlerts(companyId?: string): Promise<void> {
    try {
      const projections = await this.getSupplyProjections(companyId);
      const companiesToCheck = companyId ? [companyId] : [];

      // Si no se especificó companyId, obtener todas las compañías
      if (!companyId) {
        const allCompanies = await this.getAllCompanies();
        companiesToCheck.push(...allCompanies.map(c => c.id));
      }

      for (const compId of companiesToCheck) {
        // Obtener proyecciones para esta compañía
        const companyProjections = companyId ? projections :
          await this.getSupplyProjections(compId);

        for (const projection of companyProjections) {
          let alertType = "";
          let title = "";
          let message = "";
          let severity: "info" | "warning" | "error" = "info";

          if (projection.daysRemaining <= 0) {
            // Suministro agotado
            alertType = projection.type === "paper" ? "paper_depleted" : "toner_depleted";
            title = `${projection.type === "paper" ? "Papel" : "Tóner"} agotado`;
            message = `El ${projection.type === "paper" ? "tipo de papel" : "cartucho de tóner"} "${projection.name}" se ha agotado. Stock actual: ${projection.currentStock}`;
            severity = "error";
          } else if (projection.daysRemaining <= 3) {
            // Crítico - menos de 3 días
            alertType = projection.type === "paper" ? "paper_critical" : "toner_critical";
            title = `¡${projection.type === "paper" ? "Papel" : "Tóner"} crítico!`;
            message = `${projection.type === "paper" ? "Tipo de papel" : "Cartucho de tóner"} "${projection.name}" se agotará en ${projection.daysRemaining} día(s). Stock actual: ${projection.currentStock}. Consumo diario: ${projection.dailyConsumption}`;
            severity = "error";
          } else if (projection.daysRemaining <= 7) {
            // Advertencia - menos de 7 días
            alertType = projection.type === "paper" ? "paper_warning" : "toner_warning";
            title = `${projection.type === "paper" ? "Papel" : "Tóner"} bajo`;
            message = `${projection.type === "paper" ? "Tipo de papel" : "Cartucho de tóner"} "${projection.name}" se agotará en ${projection.daysRemaining} día(s). Stock actual: ${projection.currentStock}`;
            severity = "warning";
          } else if (projection.daysRemaining <= 14) {
            // Precaución - menos de 14 días
            alertType = projection.type === "paper" ? "paper_caution" : "toner_caution";
            title = `${projection.type === "paper" ? "Papel" : "Tóner"} próximo a agotarse`;
            message = `${projection.type === "paper" ? "Tipo de papel" : "Cartucho de tóner"} "${projection.name}" se agotará en ${projection.daysRemaining} día(s). Considere reabastecer.`;
            severity = "warning";
          }

          if (alertType) {
            // Verificar si ya existe una alerta similar activa (no leída)
            const existingAlerts = await this.getAllAlerts(compId);
            const similarAlert = existingAlerts.find(alert =>
              alert.type === alertType &&
              alert.resourceId === projection.id &&
              alert.resourceType === projection.type &&
              !alert.read
            );

            if (!similarAlert) {
              // Crear nueva alerta
              await this.createAlert({
                companyId: compId,
                type: alertType,
                title,
                message,
                severity,
                resourceId: projection.id,
                resourceType: projection.type
              });
            } else {
              // Actualizar alerta existente si los datos han cambiado significativamente
              const daysDiff = Math.abs(projection.daysRemaining - parseInt(similarAlert.message.match(/(\d+) día/)?.[1] || "0"));
              if (daysDiff >= 2) {
                // Marcar alerta anterior como leída y crear nueva
                await this.markAlertRead(similarAlert.id);
                await this.createAlert({
                  companyId: compId,
                  type: alertType,
                  title,
                  message,
                  severity,
                  resourceId: projection.id,
                  resourceType: projection.type
                });
              }
            }
          }
        }

        // Crear alertas para suministros con baja confiabilidad en las proyecciones
        const lowConfidenceProjections = companyProjections.filter(p =>
          p.confidence === "low" && p.daysRemaining <= 30
        );

        for (const projection of lowConfidenceProjections) {
          const existingAlerts = await this.getAllAlerts(compId);
          const similarAlert = existingAlerts.find(alert =>
            alert.type === "projection_unreliable" &&
            alert.resourceId === projection.id &&
            !alert.read
          );

          if (!similarAlert) {
            await this.createAlert({
              companyId: compId,
              type: "projection_unreliable",
              title: `Proyección poco confiable: ${projection.name}`,
              message: `La proyección de agotamiento para "${projection.name}" tiene baja confiabilidad debido a datos insuficientes o variabilidad alta. Considere revisar el inventario manualmente.`,
              severity: "info",
              resourceId: projection.id,
              resourceType: projection.type
            });
          }
        }
      }
    } catch (error) {
      console.error("Error generating supply alerts:", error);
    }
  }
}

export const storage = new PostgresStorage();
