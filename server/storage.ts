import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
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
  getAllUsers(): Promise<UserWithoutPassword[]>;
  getUsersByCompany(companyId?: string): Promise<UserWithoutPassword[]>;
  deleteUser(id: string): Promise<void>;

  getPrinter(id: string): Promise<Printer | undefined>;
  getAllPrinters(): Promise<Printer[]>;
  createPrinter(printer: InsertPrinter): Promise<Printer>;
  deletePrinter(id: string): Promise<void>;

  getPrintJob(id: string): Promise<PrintJobWithDetails | undefined>;
  getAllPrintJobs(): Promise<PrintJobWithDetails[]>;
  createPrintJob(job: InsertPrintJob): Promise<PrintJob>;

  getCompany(id: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  updateCompanyAdmin(id: string, adminId: string | null): Promise<Company | undefined>;

  getDashboardStats(companyId?: string): Promise<DashboardStats>;
  getConsumptionStats(period: string, companyId?: string): Promise<ConsumptionStats>;
}

const db = drizzle(process.env.DATABASE_URL!);

export class PostgresStorage implements IStorage {
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

  async getAllUsers(): Promise<UserWithoutPassword[]> {
    const result = await db
      .select()
      .from(users)
      .orderBy(users.createdAt);
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

  async getAllPrinters(): Promise<Printer[]> {
    return db.select().from(printers).orderBy(printers.createdAt);
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

  async getAllPrintJobs(): Promise<PrintJobWithDetails[]> {
    const jobs = await db.select().from(printJobs).orderBy(printJobs.printedAt);
    
    const jobsWithDetails: PrintJobWithDetails[] = [];
    for (const job of jobs) {
      const user = await this.getUser(job.userId);
      const printer = await this.getPrinter(job.printerId);

      if (user && printer) {
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
    const allJobs = await this.getAllPrintJobs();
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const filteredJobs = companyId
      ? allJobs.filter((job) => {
          const user = Array.from([job.user]).find((u) => u.id === job.userId);
          return user?.id === job.userId;
        })
      : allJobs;

    const jobsThisMonth = filteredJobs.filter(
      (job) => new Date(job.printedAt) >= firstDayOfMonth
    );

    const pagesThisMonth = jobsThisMonth.reduce(
      (sum, job) => sum + job.pageCount * job.copies,
      0
    );

    const allUsers = await db.select().from(users);
    const userCount = companyId
      ? allUsers.filter((u) => u.companyId === companyId && u.role !== "super-admin").length
      : allUsers.filter((u) => u.role !== "super-admin").length;

    const allPrinters = await db.select().from(printers);
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
    const allJobs = await this.getAllPrintJobs();
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

    const dateFilteredJobs = allJobs.filter(
      (job) => new Date(job.printedAt) >= startDate
    );

    const filteredJobs = companyId
      ? dateFilteredJobs.filter((job) => {
          const user = Array.from([job.user]).find((u) => u.id === job.userId);
          return user?.id === job.userId;
        })
      : dateFilteredJobs;

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
