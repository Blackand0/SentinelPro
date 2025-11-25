import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import postgres from "postgres";
import { users, printers, printJobs, companies } from "@shared/schema";
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
  deletePrinter(id: string): Promise<void>;

  getPrintJob(id: string): Promise<PrintJobWithDetails | undefined>;
  getAllPrintJobs(companyId?: string): Promise<PrintJobWithDetails[]>;
  createPrintJob(job: InsertPrintJob): Promise<PrintJob>;

  getCompany(id: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  updateCompanyAdmin(id: string, adminId: string | null): Promise<Company | undefined>;

  getDashboardStats(companyId?: string): Promise<DashboardStats>;
  getConsumptionStats(period: string, companyId?: string): Promise<ConsumptionStats>;
}

export const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});
export const db = drizzle(sql);

export class PostgresStorage implements IStorage {
  private initializationAttempted = false;

  async initializeDatabase() {
    if (this.initializationAttempted) return;
    this.initializationAttempted = true;

    try {
      // Create companies table
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS companies (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          email text NOT NULL UNIQUE,
          admin_id varchar,
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      // Create users table
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS users (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          username text NOT NULL UNIQUE,
          password text NOT NULL,
          email text NOT NULL UNIQUE,
          full_name text NOT NULL,
          role text NOT NULL DEFAULT 'operator',
          company_id varchar REFERENCES companies(id),
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      // Add FK constraint if it doesn't exist
      try {
        await sql.unsafe(`
          ALTER TABLE companies ADD CONSTRAINT companies_admin_id_users_id_fk 
          FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;
        `);
      } catch (e: any) {
        if (!e.message?.includes("already exists")) {
          throw e;
        }
      }

      // Create printers table
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS printers (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          location text NOT NULL,
          model text NOT NULL,
          ip_address text,
          company_id varchar REFERENCES companies(id),
          status text NOT NULL DEFAULT 'active',
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);

      // Create print_jobs table
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS print_jobs (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id),
          printer_id varchar NOT NULL REFERENCES printers(id),
          document_name text NOT NULL,
          file_name text NOT NULL,
          file_path text NOT NULL,
          file_size integer NOT NULL,
          page_count integer NOT NULL,
          copies integer NOT NULL DEFAULT 1,
          color_mode text NOT NULL DEFAULT 'bw',
          paper_size text NOT NULL DEFAULT 'letter',
          status text NOT NULL DEFAULT 'completed',
          printed_at timestamp NOT NULL DEFAULT now()
        );
      `);

      // Create session table
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS session (
          sid varchar PRIMARY KEY,
          sess json NOT NULL,
          expire timestamp NOT NULL
        );
      `);

      console.log("✅ Database tables initialized");
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
        await db.insert(users).values({
          id: "00000000-0000-0000-0000-000000000001",
          username: "sentinelpro",
          password: hashedPassword,
          email: "sentinelpro@sentinel.cl",
          fullName: "Sentinel Pro - Super Admin",
          role: "super-admin",
        }).onConflictDoNothing();
        console.log("✅ Super admin created: sentinelpro / 123456");
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
      query = query.where(eq(users.companyId, companyId));
    }
    
    const result = await query.orderBy(users.createdAt);
    return result.map(({ password, ...user }) => user).filter((u: any) => u.role !== "super-admin");
  }

  async getUsersByCompany(companyId?: string): Promise<UserWithoutPassword[]> {
    let query = db.select().from(users);
    
    if (companyId) {
      query = query.where(and(
        eq(users.companyId, companyId)
      ));
    }
    
    const result = await query.orderBy(users.createdAt);
    return result.map(({ password, ...user }) => user);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getPrinter(id: string): Promise<Printer | undefined> {
    const result = await db.select().from(printers).where(eq(printers.id, id));
    return result[0];
  }

  async getAllPrinters(companyId?: string): Promise<Printer[]> {
    let query = db.select().from(printers);
    
    if (companyId) {
      query = query.where(eq(printers.companyId, companyId));
    }
    
    return query.orderBy(printers.createdAt);
  }

  async createPrinter(insertPrinter: InsertPrinter): Promise<Printer> {
    const result = await db.insert(printers).values(insertPrinter).returning();
    return result[0];
  }

  async deletePrinter(id: string): Promise<void> {
    await db.delete(printers).where(eq(printers.id, id));
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
    const jobs = await db.select().from(printJobs).orderBy(printJobs.printedAt);
    
    const jobsWithDetails: PrintJobWithDetails[] = [];
    for (const job of jobs) {
      const user = await this.getUser(job.userId);
      const printer = await this.getPrinter(job.printerId);

      if (!user || !printer) continue;
      
      // Filter by company if specified
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

    const allUsers = await this.getAllUsers(companyId);
    // Super-admin sees only admin users, admins see their company users
    const userCount = !companyId 
      ? allUsers.filter((u) => u.role === "admin").length
      : allUsers.filter((u) => u.role !== "super-admin").length;

    const allPrinters = await this.getAllPrinters(companyId);
    const printerCount = allPrinters.length;

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

    return {
      totalJobs: filteredJobs.length,
      totalPages,
      totalBWPages,
      totalColorPages,
      totalPaperUsed: totalPages,
      estimatedInkUsed: Math.round(estimatedInkUsed * 10) / 10,
      period,
    };
  }
}

export const storage = new PostgresStorage();
