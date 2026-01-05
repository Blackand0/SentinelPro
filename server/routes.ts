import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { storage, db, sql } from "./storage";
import { requireAuth, requireRole, requireCompanyAccess, validateCompanyResource, clearSecurityContext, validateMultiTenantIntegrity, requireStrictCompanyAccess } from "./middleware/auth";
import {
  insertUserSchema,
  loginSchema,
  insertPrinterSchema,
  insertPrintJobSchema,
  insertCompanySchema,
  insertPaperTypeSchema,
  insertTonerInventorySchema,
  insertMaintenanceLogSchema,
  insertConsumptionExpenseSchema,
  users,
  printers,
  printJobs,
  paperTypes,
  tonerInventory,
  maintenanceLogs,
  consumptionExpenses,
} from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function registerRoutes(app: Express): Promise<Server> {
  if (!process.env.SESSION_SECRET) {
    console.warn(
      "WARNING: SESSION_SECRET environment variable not set. Using default (insecure for production)"
    );
  }

  await storage.initializeDatabase();
  await storage.initializeSuperAdmin();

  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/files/download/:filename", requireAuth, clearSecurityContext, (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadsDir, filename);
      
      if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).send("Forbidden");
      }
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
      }
      
      res.download(filePath);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).send("Failed to download file");
    }
  });

  app.get("/api/files/view/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadsDir, filename);
      
      if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).send("Forbidden");
      }
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
      }
      
      res.sendFile(filePath);
    } catch (error) {
      console.error("View file error:", error);
      res.status(500).send("Failed to view file");
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).send("Username already exists");
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).send("Email already exists");
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      const secret = process.env.SESSION_SECRET || "sentinel-pro-dev-secret-change-for-production";
      const token = jwt.sign({ userId: user.id }, secret, { expiresIn: "7d" });

      res.json({ ok: true, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Registration error:", error);
      res.status(500).send("Registration failed");
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(data.username);
      if (!user) {
        return res.status(401).send("Invalid username or password");
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).send("Invalid username or password");
      }

      const secret = process.env.SESSION_SECRET || "sentinel-pro-dev-secret-change-for-production";
      const token = jwt.sign({ userId: user.id }, secret, { expiresIn: "7d" });

      console.log(`Login: User ${user.id} -> JWT Token generated`);

      res.json({ ok: true, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Login error:", error);
      res.status(500).send("Login failed");
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ ok: true });
  });

  // Debug endpoint para verificar login
  app.post("/api/auth/debug-login", async (req, res) => {
    try {
      const { username, password } = req.body;

      console.log(`🔍 Debug login attempt for user: ${username}`);

      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`❌ User ${username} not found`);
        return res.status(401).json({ error: "User not found" });
      }

      console.log(`✅ User found: ${user.username}, role: ${user.role}, companyId: ${user.companyId}`);

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        console.log(`❌ Invalid password for user ${username}`);
        return res.status(401).json({ error: "Invalid password" });
      }

      console.log(`✅ Password valid, generating token for user ${user.id}`);

      const secret = process.env.SESSION_SECRET || "sentinel-pro-dev-secret-change-for-production";
      const token = jwt.sign({ userId: user.id }, secret, { expiresIn: "7d" });

      console.log(`✅ Token generated successfully`);

      res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          companyId: user.companyId
        }
      });
    } catch (error) {
      console.error("Debug login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", requireAuth, clearSecurityContext, (req, res) => {
    res.json(req.user);
  });

  app.get("/api/users", requireAuth, clearSecurityContext, requireRole(["super-admin", "admin"]), async (req, res) => {
    try {
      if (req.user.role === "admin") {
        if (!req.user.companyId) {
          return res.status(403).send("Error: Tu usuario no tiene una empresa asignada");
        }
        const companyUsers = await storage.getUsersByCompany(req.user.companyId);
        res.json(companyUsers);
      } else {
        const adminUsers = await db
          .select()
          .from(users)
          .where(eq(users.role, "admin"));
        const result = adminUsers.map(({ password, ...user }) => user);
        res.json(result);
      }
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).send("Failed to fetch users");
    }
  });

  app.post("/api/users", requireAuth, requireRole(["super-admin", "admin"]), async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);

      if ((data.role === "super-admin" || data.role === "admin") && req.user.role !== "super-admin") {
        return res.status(403).send("Solo el Super Admin puede crear Admins");
      }

      if (req.user.role === "admin") {
        data.companyId = req.user.companyId;
        if (!data.companyId) {
          return res.status(403).send("Error: Tu usuario no tiene una empresa asignada");
        }
      }

      if (req.user.role === "admin" && (data.role === "operator" || data.role === "viewer")) {
        if (!data.companyId) {
          return res.status(400).send("Debes asignar una empresa para operadores y visualizadores");
        }
      }

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).send("El usuario ya existe");
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).send("El correo ya esta registrado");
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Create user error:", error);
      res.status(500).send("Failed to create user");
    }
  });

  app.delete("/api/users/:id", requireAuth, clearSecurityContext, requireRole(["super-admin", "admin"]), async (req, res) => {
    try {
      const userToDelete = await storage.getUser(req.params.id);
      if (!userToDelete) {
        return res.status(404).send("Usuario no encontrado");
      }

      if (userToDelete.role === "super-admin") {
        return res.status(403).send("No puedes eliminar el Super Admin");
      }

      if (req.user.role === "admin" && userToDelete.companyId !== req.user.companyId) {
        return res.status(403).send("No puedes eliminar usuarios de otra empresa");
      }

      await sql`DELETE FROM print_jobs WHERE user_id = ${req.params.id}`;
      
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).send("Failed to delete user");
    }
  });

  app.get("/api/printers", requireAuth, requireCompanyAccess(), async (req, res) => {
    try {
      let companyId: string | undefined;

      if (req.user.role === "super-admin") {
        companyId = undefined;
      } else {
        companyId = req.user.companyId;
      }

      const printerList = await storage.getAllPrinters(companyId);
      res.json(printerList);
    } catch (error) {
      console.error("Get printers error:", error);
      res.status(500).send("Failed to fetch printers");
    }
  });

  app.post("/api/printers", requireAuth, clearSecurityContext, requireRole(["admin", "operator"]), requireCompanyAccess(), validateMultiTenantIntegrity(), requireStrictCompanyAccess('create'), async (req, res) => {
    try {
      const data = insertPrinterSchema.parse(req.body);

      data.companyId = req.user.companyId;

      const printer = await storage.createPrinter(data);
      res.json(printer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Create printer error:", error);
      res.status(500).send("Failed to create printer");
    }
  });

  app.put("/api/printers/:id", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      await validateCompanyResource(req, res, () => {}, req.params.id, async (id) => {
        const printer = await storage.getPrinter(id);
        return printer?.companyId;
      });

      const data = insertPrinterSchema.partial().parse(req.body);
      const updatedPrinter = await storage.updatePrinter(req.params.id, data);
      res.json(updatedPrinter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Update printer error:", error);
      res.status(500).send("Failed to update printer");
    }
  });

  app.delete("/api/printers/:id", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      await validateCompanyResource(req, res, () => {}, req.params.id, async (id) => {
        const printer = await storage.getPrinter(id);
        return printer?.companyId;
      });

      await storage.deletePrinter(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete printer error:", error);
      res.status(500).send("Failed to delete printer");
    }
  });

// PAPER TYPES CRUD
  app.get("/api/paper-types", requireAuth, requireCompanyAccess(), async (req, res) => {
    try {
      let companyId: string | undefined;

      if (req.user.role === "super-admin") {
        companyId = undefined;
      } else {
        companyId = req.user.companyId;
      }

      const types = await storage.getAllPaperTypes(companyId);
      res.json(types);
    } catch (error) {
      console.error("Get paper types error:", error);
      res.status(500).send("Failed to fetch paper types");
    }
  });

  app.post("/api/paper-types", requireAuth, requireRole(["admin", "operator"]), requireCompanyAccess(), async (req, res) => {
    try {
      console.log("Paper type request body:", req.body);
      const data = insertPaperTypeSchema.parse({
        ...req.body,
        companyId: req.user.companyId,
        weight: parseInt(req.body.weight),
        stock: parseInt(req.body.stock || "0"),
      });

      console.log("Paper type parsed data:", data);
      const paperType = await storage.createPaperType(data, req.user.id);
      res.json(paperType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Paper type validation error:", error.errors);
        return res.status(400).send(JSON.stringify(error.errors));
      }
      console.error("Create paper type error:", error);
      res.status(500).send("Failed to create paper type");
    }
  });

  app.put("/api/paper-types/:id", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      await validateCompanyResource(req, res, () => {}, req.params.id, async (id) => {
        const paperType = await storage.getPaperType(id);
        return paperType?.companyId;
      });

      const data = insertPaperTypeSchema.partial().parse({
        ...req.body,
        weight: req.body.weight ? parseInt(req.body.weight) : undefined,
        stock: req.body.stock ? parseInt(req.body.stock) : undefined,
      });
      const updatedPaperType = await storage.updatePaperType(req.params.id, data, req.user.id);
      res.json(updatedPaperType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Update paper type error:", error);
      res.status(500).send("Failed to update paper type");
    }
  });

  app.delete("/api/paper-types/:id", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      await validateCompanyResource(req, res, () => {}, req.params.id, async (id) => {
        const paperType = await storage.getPaperType(id);
        return paperType?.companyId;
      });

      await storage.deletePaperType(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete paper type error:", error);
      res.status(500).send("Failed to delete paper type");
    }
  });

  // TONER INVENTORY CRUD
  app.get("/api/toner-inventory", requireAuth, requireCompanyAccess(), async (req, res) => {
    try {
      let companyId: string | undefined;

      if (req.user.role === "super-admin") {
        companyId = undefined;
      } else {
        companyId = req.user.companyId;
      }

      const inventory = await storage.getAllTonerInventory(companyId);
      res.json(inventory);
    } catch (error) {
      console.error("Get toner inventory error:", error);
      res.status(500).send("Failed to fetch toner inventory");
    }
  });

  app.post("/api/toner-inventory", requireAuth, requireRole(["admin", "operator"]), requireCompanyAccess(), async (req, res) => {
    try {
      const data = insertTonerInventorySchema.parse({
        ...req.body,
        companyId: req.user.companyId,
        stock: parseInt(req.body.stock || "0"),
        minStock: parseInt(req.body.minStock || "5"),
      });

      const toner = await storage.createTonerInventory(data, req.user.id);
      res.json(toner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Create toner inventory error:", error);
      res.status(500).send("Failed to create toner inventory");
    }
  });

  app.put("/api/toner-inventory/:id", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      await validateCompanyResource(req, res, () => {}, req.params.id, async (id) => {
        const toner = await storage.getTonerInventory(id);
        return toner?.companyId;
      });

      const data = insertTonerInventorySchema.partial().parse({
        ...req.body,
        stock: req.body.stock ? parseInt(req.body.stock) : undefined,
        minStock: req.body.minStock ? parseInt(req.body.minStock) : undefined,
      });
      const updatedToner = await storage.updateTonerInventory(req.params.id, data, req.user.id);
      res.json(updatedToner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Update toner inventory error:", error);
      res.status(500).send("Failed to update toner inventory");
    }
  });

  app.delete("/api/toner-inventory/:id", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      await validateCompanyResource(req, res, () => {}, req.params.id, async (id) => {
        const toner = await storage.getTonerInventory(id);
        return toner?.companyId;
      });

      await storage.deleteTonerInventory(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete toner inventory error:", error);
      res.status(500).send("Failed to delete toner inventory");
    }
  });

  // MAINTENANCE LOGS CRUD
  app.get("/api/maintenance-logs", requireAuth, async (req, res) => {
    try {
      let companyId: string | undefined;
      
      if (req.user.role === "super-admin") {
        companyId = undefined;
      } else {
        if (!req.user.companyId) {
          return res.status(403).send("Error: Tu usuario no tiene una empresa asignada");
        }
        companyId = req.user.companyId;
      }
      
      const logs = await storage.getAllMaintenanceLogs(companyId);
      res.json(logs);
    } catch (error) {
      console.error("Get maintenance logs error:", error);
      res.status(500).send("Failed to fetch maintenance logs");
    }
  });

  app.post("/api/maintenance-logs", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      if (!req.user.companyId) {
        return res.status(403).send("Error: Tu usuario no tiene una empresa asignada");
      }

      // printerId is optional - allow periféricos without printer
      if (req.body.printerId && req.body.printerId !== "") {
        const printer = await storage.getPrinter(req.body.printerId);
        if (!printer || printer.companyId !== req.user.companyId) {
          return res.status(403).send("Impresora no valida");
        }
      }

      const data = insertMaintenanceLogSchema.parse({
        ...req.body,
        companyId: req.user.companyId,
      });
      
      // Convert string dates to Date objects for Drizzle
      const logData = {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
      };
      
      const log = await storage.createMaintenanceLog(logData);
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Create maintenance log error:", error);
      res.status(500).send("Failed to create maintenance log");
    }
  });

  app.put("/api/maintenance-logs/:id", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const log = await storage.getMaintenanceLog(req.params.id);
      if (!log) {
        return res.status(404).send("Registro de mantenimiento no encontrado");
      }

      // Check company access - use printer's company if exists, otherwise use log's companyId
      const logCompanyId = log.printer?.companyId || (log as any).companyId;
      if (logCompanyId !== req.user.companyId) {
        return res.status(403).send("No puedes editar registros de otra empresa");
      }

      const data = insertMaintenanceLogSchema.partial().parse(req.body);
      const updatedLog = await storage.updateMaintenanceLog(req.params.id, data);
      res.json(updatedLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Update maintenance log error:", error);
      res.status(500).send("Failed to update maintenance log");
    }
  });

  app.delete("/api/maintenance-logs/:id", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const log = await storage.getMaintenanceLog(req.params.id);
      if (!log) {
        return res.status(404).send("Registro de mantenimiento no encontrado");
      }

      if (log.printer.companyId !== req.user.companyId) {
        return res.status(403).send("No puedes eliminar registros de otra empresa");
      }

      await storage.deleteMaintenanceLog(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete maintenance log error:", error);
      res.status(500).send("Failed to delete maintenance log");
    }
  });

  // PRINT JOBS
  app.get("/api/print-jobs", requireAuth, async (req, res) => {
    try {
      let companyId: string | undefined;
      
      if (req.user.role === "super-admin") {
        companyId = undefined;
      } else {
        if (!req.user.companyId) {
          return res.status(403).send("Error: Tu usuario no tiene una empresa asignada");
        }
        companyId = req.user.companyId;
      }
      
      const jobs = await storage.getAllPrintJobs(companyId);
      res.json(jobs);
    } catch (error) {
      console.error("Get print jobs error:", error);
      res.status(500).send("Failed to fetch print jobs");
    }
  });

  app.post("/api/print-jobs", requireAuth, requireRole(["admin", "operator"]), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      const data = insertPrintJobSchema.parse({
        ...req.body,
        pageCount: parseInt(req.body.pageCount),
        copies: parseInt(req.body.copies),
        fileSize: parseInt(req.body.fileSize),
      });

      const job = await storage.createPrintJob({
        ...data,
        filePath: `/uploads/${req.file.filename}`,
      });

      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Create print job error:", error);
      res.status(500).send("Failed to create print job");
    }
  });

  app.get("/api/print-jobs/:id", requireAuth, async (req, res) => {
    try {
      const job = await storage.getPrintJob(req.params.id);
      if (!job) {
        return res.status(404).send("Print job not found");
      }

      res.json(job);
    } catch (error) {
      console.error("Get print job error:", error);
      res.status(500).send("Failed to fetch print job");
    }
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      let companyId: string | undefined;
      
      if (req.user.role === "super-admin") {
        companyId = undefined;
      } else {
        if (!req.user.companyId) {
          return res.status(403).send("Error: Tu usuario no tiene una empresa asignada");
        }
        companyId = req.user.companyId;
      }
      
      const stats = await storage.getDashboardStats(companyId);
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).send("Failed to fetch dashboard stats");
    }
  });

  app.get("/api/consumption", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      if (!req.user.companyId) {
        return res.status(403).send("Error: Tu usuario no tiene una empresa asignada");
      }

      const period = (req.query.period as string) || "month";
      const stats = await storage.getConsumptionStats(period, req.user.companyId);
      res.json(stats);
    } catch (error) {
      console.error("Get consumption stats error:", error);
      res.status(500).send("Failed to fetch consumption stats");
    }
  });

  app.post("/api/consumption-expenses", requireAuth, async (req, res) => {
    try {
      if (!req.user.companyId) {
        return res.status(403).send("Error: Tu usuario no tiene una empresa asignada");
      }

      const dateValue = req.body.date ? new Date(req.body.date) : new Date();
      
      const data = insertConsumptionExpenseSchema.parse({
        ...req.body,
        companyId: req.user.companyId,
        date: dateValue.toISOString().split('T')[0],
      });
      
      const expense = await storage.createConsumptionExpense({
        ...data,
        date: new Date(data.date || new Date()),
      });
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Create expense error:", error);
      res.status(500).send("Failed to create expense");
    }
  });

  app.get("/api/companies", requireAuth, requireRole(["super-admin"]), async (req, res) => {
    try {
      const companiesList = await storage.getAllCompanies();
      res.json(companiesList);
    } catch (error) {
      console.error("Get companies error:", error);
      res.status(500).send("Failed to fetch companies");
    }
  });

  app.post("/api/companies", requireAuth, clearSecurityContext, requireRole(["super-admin"]), async (req, res) => {
    try {
      const data = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(data);
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Create company error:", error);
      res.status(500).send("Failed to create company");
    }
  });

  app.delete("/api/companies/:id", requireAuth, clearSecurityContext, requireRole(["super-admin"]), async (req, res) => {
    try {
      await sql`DELETE FROM print_jobs WHERE user_id IN (SELECT id FROM users WHERE company_id = ${req.params.id})`;
      await sql`DELETE FROM maintenance_logs WHERE printer_id IN (SELECT id FROM printers WHERE company_id = ${req.params.id})`;
      await sql`DELETE FROM toner_inventory WHERE company_id = ${req.params.id}`;
      await sql`DELETE FROM paper_types WHERE company_id = ${req.params.id}`;
      await db.delete(users).where(eq(users.companyId, req.params.id));
      await db.delete(printers).where(eq(printers.companyId, req.params.id));
      
      await storage.deleteCompany(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete company error:", error);
      res.status(500).send("Failed to delete company");
    }
  });

  app.patch("/api/companies/:id/admin", requireAuth, clearSecurityContext, requireRole(["super-admin"]), async (req, res) => {
    try {
      const { adminId } = req.body;
      const company = await storage.updateCompanyAdmin(req.params.id, adminId || null);
      if (!company) {
        return res.status(404).send("Company not found");
      }
      res.json(company);
    } catch (error) {
      console.error("Update company admin error:", error);
      res.status(500).send("Failed to update company admin");
    }
  });

  // Analytics API
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const analytics = await storage.getAnalyticsData(user.companyId);
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).send("Failed to get analytics");
    }
  });

  // Supply Projections API
  app.get("/api/supply-projections", requireAuth, clearSecurityContext, requireCompanyAccess(), async (req, res) => {
    try {
      let companyId: string | undefined;

      if (req.user.role === "super-admin") {
        companyId = undefined;
      } else {
        companyId = req.user.companyId;
      }

      const projections = await storage.getSupplyProjections(companyId);

      // Generar alertas automáticamente en background (no bloquea la respuesta)
      setImmediate(() => {
        storage.generateSupplyAlerts(companyId).catch(error => {
          console.error("Error generating supply alerts:", error);
        });
      });

      res.json(projections);
    } catch (error) {
      console.error("Supply projections error:", error);
      res.status(500).send("Failed to get supply projections");
    }
  });

  // Audit Logs API
  app.get("/api/audit-logs", requireAuth, requireCompanyAccess(), async (req, res) => {
    try {
      let companyId: string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      if (req.user.role === "super-admin") {
        companyId = undefined;
      } else {
        companyId = req.user.companyId;
      }

      const auditLogs = await storage.getAuditLogs(companyId, limit);
      res.json(auditLogs);
    } catch (error) {
      console.error("Audit logs error:", error);
      res.status(500).send("Failed to get audit logs");
    }
  });

  // Alerts API
  app.get("/api/alerts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const alerts = await storage.getAllAlerts(user.companyId);
      res.json(alerts);
    } catch (error) {
      console.error("Alerts error:", error);
      res.status(500).send("Failed to get alerts");
    }
  });

  app.post("/api/alerts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { type, title, message, severity, resourceId, resourceType } = req.body;
      const alert = await storage.createAlert({
        companyId: user.companyId,
        type,
        title,
        message,
        severity: severity || "info",
        resourceId,
        resourceType,
      });
      res.json(alert);
    } catch (error) {
      console.error("Create alert error:", error);
      res.status(500).send("Failed to create alert");
    }
  });

  app.patch("/api/alerts/:id/read", requireAuth, clearSecurityContext, async (req, res) => {
    try {
      await storage.markAlertRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark alert read error:", error);
      res.status(500).send("Failed to mark alert as read");
    }
  });

  app.delete("/api/alerts/:id", requireAuth, clearSecurityContext, async (req, res) => {
    try {
      await storage.deleteAlert(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete alert error:", error);
      res.status(500).send("Failed to delete alert");
    }
  });

  // Generate Supply Alerts API (manual trigger)
  app.post("/api/generate-supply-alerts", requireAuth, clearSecurityContext, requireCompanyAccess(), async (req, res) => {
    try {
      let companyId: string | undefined;

      if (req.user.role === "super-admin") {
        companyId = req.query.companyId as string;
      } else {
        companyId = req.user.companyId;
      }

      await storage.generateSupplyAlerts(companyId);
      res.json({ success: true, message: "Alertas de suministro generadas exitosamente" });
    } catch (error) {
      console.error("Generate supply alerts error:", error);
      res.status(500).send("Failed to generate supply alerts");
    }
  });

  // Export Report API
  app.post("/api/export/report", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { startDate, endDate } = req.body;
      const jobs = await storage.getAllPrintJobs(user.companyId);
      
      const filtered = jobs.filter(j => {
        const d = new Date(j.printedAt);
        return d >= new Date(startDate) && d <= new Date(endDate);
      });

      const csv = "Date,User,Printer,Pages,Color Mode,Document\n" +
        filtered.map(j => `${j.printedAt},${j.user.username},${j.printer.name},${j.pageCount},${j.colorMode},${j.documentName}`).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=report.csv");
      res.send(csv);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).send("Failed to export report");
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
