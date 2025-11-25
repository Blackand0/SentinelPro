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
} from "@shared/schema";
import { randomUUID } from "crypto";

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

type Company = any;
type InsertCompany = any;

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private printers: Map<string, Printer>;
  private printJobs: Map<string, PrintJob>;
  private companies: Map<string, Company>;

  constructor() {
    this.users = new Map();
    this.printers = new Map();
    this.printJobs = new Map();
    this.companies = new Map();
    
    // Seed super admin
    this.initializeSuperAdmin();
  }

  private async initializeSuperAdmin() {
    const bcrypt = await import("bcrypt");
    const superAdminExists = Array.from(this.users.values()).find(
      (user) => user.username === "sentinelpro"
    );
    
    if (!superAdminExists) {
      const hashedPassword = await bcrypt.default.hash("123456", 10);
      const id = "00000000-0000-0000-0000-000000000001";
      const user: User = {
        id,
        username: "sentinelpro",
        password: hashedPassword,
        email: "sentinelpro@sentinel.cl",
        fullName: "Sentinel Pro - Super Admin",
        role: "super-admin",
        createdAt: new Date(),
      };
      this.users.set(id, user);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<UserWithoutPassword[]> {
    const users = Array.from(this.users.values())
      .filter((u) => u.role !== "super-admin")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  }

  async getUsersByCompany(companyId?: string): Promise<UserWithoutPassword[]> {
    const users = Array.from(this.users.values())
      .filter((u) => u.role !== "super-admin" && (!companyId || u.companyId === companyId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async getPrinter(id: string): Promise<Printer | undefined> {
    return this.printers.get(id);
  }

  async getAllPrinters(): Promise<Printer[]> {
    return Array.from(this.printers.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createPrinter(insertPrinter: InsertPrinter): Promise<Printer> {
    const id = randomUUID();
    const printer: Printer = {
      ...insertPrinter,
      id,
      createdAt: new Date(),
    };
    this.printers.set(id, printer);
    return printer;
  }

  async deletePrinter(id: string): Promise<void> {
    this.printers.delete(id);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getAllCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = randomUUID();
    const company: Company = {
      ...insertCompany,
      id,
      createdAt: new Date(),
    };
    this.companies.set(id, company);
    return company;
  }

  async deleteCompany(id: string): Promise<void> {
    this.companies.delete(id);
  }

  async updateCompanyAdmin(id: string, adminId: string | null): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    const updated = { ...company, adminId: adminId || undefined };
    this.companies.set(id, updated);
    return updated;
  }

  async getPrintJob(id: string): Promise<PrintJobWithDetails | undefined> {
    const job = this.printJobs.get(id);
    if (!job) return undefined;

    const user = await this.getUser(job.userId);
    const printer = await this.getPrinter(job.printerId);

    if (!user || !printer) return undefined;

    return {
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
    };
  }

  async getAllPrintJobs(): Promise<PrintJobWithDetails[]> {
    const jobs = Array.from(this.printJobs.values()).sort(
      (a, b) => b.printedAt.getTime() - a.printedAt.getTime()
    );

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
    const id = randomUUID();
    const job: PrintJob = {
      ...insertJob,
      id,
      printedAt: new Date(),
    };
    this.printJobs.set(id, job);
    return job;
  }

  async getDashboardStats(companyId?: string): Promise<DashboardStats> {
    const allJobs = await this.getAllPrintJobs();
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter jobs by company if specified
    const filteredJobs = companyId
      ? allJobs.filter((job) => {
          const user = Array.from(this.users.values()).find((u) => u.id === job.userId);
          return user?.companyId === companyId;
        })
      : allJobs;

    const jobsThisMonth = filteredJobs.filter(
      (job) => new Date(job.printedAt) >= firstDayOfMonth
    );

    const pagesThisMonth = jobsThisMonth.reduce(
      (sum, job) => sum + job.pageCount * job.copies,
      0
    );

    const users = companyId
      ? Array.from(this.users.values()).filter(
          (u) => u.companyId === companyId && u.role !== "super-admin"
        )
      : Array.from(this.users.values()).filter((u) => u.role !== "super-admin");

    const userJobCounts = new Map<string, { username: string; count: number }>();
    filteredJobs.forEach((job) => {
      const existing = userJobCounts.get(job.userId);
      if (existing) {
        existing.count++;
      } else {
        userJobCounts.set(job.userId, {
          username: job.user.fullName,
          count: 1,
        });
      }
    });

    const printerJobCounts = new Map<
      string,
      { printerName: string; count: number }
    >();
    filteredJobs.forEach((job) => {
      const existing = printerJobCounts.get(job.printerId);
      if (existing) {
        existing.count++;
      } else {
        printerJobCounts.set(job.printerId, {
          printerName: job.printer.name,
          count: 1,
        });
      }
    });

    const topUsers = Array.from(userJobCounts.entries())
      .map(([userId, data]) => ({
        userId,
        username: data.username,
        jobCount: data.count,
      }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 5);

    const topPrinters = Array.from(printerJobCounts.entries())
      .map(([printerId, data]) => ({
        printerId,
        printerName: data.printerName,
        jobCount: data.count,
      }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 5);

    return {
      totalPrintJobs: filteredJobs.length,
      totalUsers: users.length,
      totalPrinters: this.printers.size,
      totalPagesThisMonth: pagesThisMonth,
      recentJobs: filteredJobs.slice(0, 10),
      topUsers,
      topPrinters,
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
          const user = Array.from(this.users.values()).find((u) => u.id === job.userId);
          return user?.companyId === companyId;
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

export const storage = new MemStorage();
