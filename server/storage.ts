import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, inArray, desc } from "drizzle-orm";
import postgres from "postgres";
import { 
  users, printers, printJobs, companies, 
  departments, paperTypes, tonerInventory, maintenanceLogs, alerts, consumptionExpenses
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
  Department,
  InsertDepartment,
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

  getDepartment(id: string): Promise<Department | undefined>;
  getAllDepartments(companyId?: string): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<void>;

  getPaperType(id: string): Promise<PaperType | undefined>;
  getAllPaperTypes(companyId?: string): Promise<PaperType[]>;
  createPaperType(paperType: InsertPaperType): Promise<PaperType>;
  updatePaperType(id: string, paperType: Partial<InsertPaperType>): Promise<PaperType | undefined>;
  deletePaperType(id: string): Promise<void>;

  getTonerInventory(id: string): Promise<TonerInventory | undefined>;
  getAllTonerInventory(companyId?: string): Promise<TonerInventory[]>;
  createTonerInventory(toner: InsertTonerInventory): Promise<TonerInventory>;
  updateTonerInventory(id: string, toner: Partial<InsertTonerInventory>): Promise<TonerInventory | undefined>;
  deleteTonerInventory(id: string): Promise<void>;

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
}

const getDatabaseUrl = () => {
  // For local development: use Replit PostgreSQL if available
  if (process.env.PGHOST === "helium" && process.env.PGUSER && process.env.PGPASSWORD) {
    console.log("Using Replit PostgreSQL (development)");
    return `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  }
  
  // For production: use external DATABASE_URL
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  console.log("Using DATABASE_URL (production)");
  return process.env.DATABASE_URL;
};

const isSslRequired = () => {
  // SSL required only for external databases (Render, etc)
  return process.env.PGHOST !== "helium";
};

export const sql = postgres(getDatabaseUrl(), {
  ssl: isSslRequired() ? "require" : false,
});
export const db = drizzle(sql);

export class PostgresStorage implements IStorage {
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
        CREATE TABLE IF NOT EXISTS departments (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          description text,
          company_id varchar NOT NULL,
          manager_id varchar,
          budget decimal(10,2),
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

        const deptExists = await this.getDepartment("00000000-0000-0000-0000-000000000020");
        if (!deptExists) {
          await db.insert(departments).values({
            id: "00000000-0000-0000-0000-000000000020",
            name: "Departamento General",
            description: "Departamento principal de la empresa",
            companyId: "00000000-0000-0000-0000-000000000010",
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
            departmentId: "00000000-0000-0000-0000-000000000020",
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
    return result[0];
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

  async getDepartment(id: string): Promise<Department | undefined> {
    const result = await db.select().from(departments).where(eq(departments.id, id));
    return result[0];
  }

  async getAllDepartments(companyId?: string): Promise<Department[]> {
    if (companyId) {
      return db.select().from(departments).where(eq(departments.companyId, companyId)).orderBy(departments.createdAt);
    }
    return db.select().from(departments).orderBy(departments.createdAt);
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const result = await db.insert(departments).values(insertDepartment).returning();
    return result[0];
  }

  async updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined> {
    const result = await db.update(departments).set(data).where(eq(departments.id, id)).returning();
    return result[0];
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
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

  async createPaperType(insertPaperType: InsertPaperType): Promise<PaperType> {
    const result = await db.insert(paperTypes).values(insertPaperType).returning();
    return result[0];
  }

  async updatePaperType(id: string, data: Partial<InsertPaperType>): Promise<PaperType | undefined> {
    const result = await db.update(paperTypes).set(data).where(eq(paperTypes.id, id)).returning();
    return result[0];
  }

  async deletePaperType(id: string): Promise<void> {
    await db.delete(paperTypes).where(eq(paperTypes.id, id));
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

  async createTonerInventory(insertToner: InsertTonerInventory): Promise<TonerInventory> {
    const result = await db.insert(tonerInventory).values(insertToner).returning();
    return result[0];
  }

  async updateTonerInventory(id: string, data: Partial<InsertTonerInventory>): Promise<TonerInventory | undefined> {
    const result = await db.update(tonerInventory).set(data).where(eq(tonerInventory.id, id)).returning();
    return result[0];
  }

  async deleteTonerInventory(id: string): Promise<void> {
    await db.delete(tonerInventory).where(eq(tonerInventory.id, id));
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
    return result[0];
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
    return result[0];
  }

  async deleteCompany(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
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

    return {
      totalPrintJobs: filteredJobs.length,
      totalUsers: userCount,
      totalCompanies,
      totalPrinters: printerCount,
      totalPagesThisMonth: pagesThisMonth,
      recentJobs: filteredJobs.slice(0, 10),
      topUsers: topUsers,
      topPrinters: topPrinters,
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
}

export const storage = new PostgresStorage();
