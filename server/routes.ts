import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import session from "express-session";
import multer from "multer";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./middleware/auth";
import { generateCsrfToken, validateCsrfToken } from "./middleware/csrf";
import {
  insertUserSchema,
  loginSchema,
  insertPrinterSchema,
  insertPrintJobSchema,
  insertCompanySchema,
} from "@shared/schema";
import { z } from "zod";
import MemoryStoreLib from "memorystore";
import { PostgresSessionStore } from "./middleware/sessionStore";

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

  let sessionStore;

  if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
    try {
      sessionStore = new PostgresSessionStore(process.env.DATABASE_URL);
      console.log("✅ Using PostgreSQL Session Store");
    } catch (error) {
      console.error("Failed to create PostgreSQL session store:", error);
      const MemoryStore = MemoryStoreLib(session);
      sessionStore = new MemoryStore({ checkPeriod: 86400000 });
    }
  } else {
    const MemoryStore = MemoryStoreLib(session);
    sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "sentinel-pro-dev-secret-change-for-production",
      resave: true,
      saveUninitialized: true,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  // Initialize database and super admin after session setup
  await storage.initializeDatabase();
  await storage.initializeSuperAdmin();

  app.use("/uploads", express.static(uploadsDir));

  // Download file endpoint
  app.get("/api/files/download/:filename", requireAuth, (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadsDir, filename);
      
      // Security: ensure file is within uploads directory
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

  // View file endpoint - public access
  app.get("/api/files/view/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadsDir, filename);
      
      // Security: ensure file is within uploads directory
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

  app.use(validateCsrfToken);

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

      // Set session - express-session will save when response is sent (with resave: true)
      req.session.userId = user.id;

      generateCsrfToken(req, res);

      res.json({ ok: true });
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

      // Regenerate session - this will create a new session ID
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regenerate error:", err);
          return res.status(500).send("Login failed");
        }

        // Set user ID in regenerated session
        req.session.userId = user.id;
        console.log(`✅ Login: User ${user.id} → Session ${req.sessionID}`);

        // Express-session will save this session and send Set-Cookie when res.json() is called
        generateCsrfToken(req, res);
        res.json({ ok: true });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).send(error.errors[0].message);
      }
      console.error("Login error:", error);
      res.status(500).send("Login failed");
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    generateCsrfToken(req, res);
    res.json(req.user);
  });

  app.get("/api/users", requireAuth, requireRole(["super-admin", "admin"]), async (req, res) => {
    try {
      const companyId = req.user?.role === "admin" ? req.user?.companyId : undefined;
      const users = companyId
        ? await storage.getUsersByCompany(companyId)
        : await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).send("Failed to fetch users");
    }
  });

  app.post("/api/users", requireAuth, requireRole(["super-admin", "admin"]), async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);

      // Only super-admin can create other super-admins or admins
      if ((data.role === "super-admin" || data.role === "admin") && req.user.role !== "super-admin") {
        return res.status(403).send("Solo el Super Admin puede crear Admins");
      }

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).send("El usuario ya existe");
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).send("El correo ya está registrado");
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

  app.delete("/api/users/:id", requireAuth, requireRole(["super-admin", "admin"]), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).send("Failed to delete user");
    }
  });

  app.get("/api/printers", requireAuth, async (req, res) => {
    try {
      const printers = await storage.getAllPrinters();
      res.json(printers);
    } catch (error) {
      console.error("Get printers error:", error);
      res.status(500).send("Failed to fetch printers");
    }
  });

  app.post("/api/printers", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const data = insertPrinterSchema.parse(req.body);
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

  app.delete("/api/printers/:id", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      await storage.deletePrinter(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete printer error:", error);
      res.status(500).send("Failed to delete printer");
    }
  });

  app.get("/api/print-jobs", requireAuth, async (req, res) => {
    try {
      const jobs = await storage.getAllPrintJobs();
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
      const companyId = req.user?.role === "admin" ? req.user?.companyId : undefined;
      const stats = await storage.getDashboardStats(companyId);
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).send("Failed to fetch dashboard stats");
    }
  });

  app.get("/api/consumption", requireAuth, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const period = (req.query.period as string) || "month";
      const companyId = req.user?.role === "admin" ? req.user?.companyId : undefined;
      const stats = await storage.getConsumptionStats(period, companyId);
      res.json(stats);
    } catch (error) {
      console.error("Get consumption stats error:", error);
      res.status(500).send("Failed to fetch consumption stats");
    }
  });

  app.get("/api/companies", requireAuth, requireRole(["super-admin"]), async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Get companies error:", error);
      res.status(500).send("Failed to fetch companies");
    }
  });

  app.post("/api/companies", requireAuth, requireRole(["super-admin"]), async (req, res) => {
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

  app.delete("/api/companies/:id", requireAuth, requireRole(["super-admin"]), async (req, res) => {
    try {
      await storage.deleteCompany(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete company error:", error);
      res.status(500).send("Failed to delete company");
    }
  });

  app.patch("/api/companies/:id/admin", requireAuth, requireRole(["super-admin"]), async (req, res) => {
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

  const httpServer = createServer(app);

  return httpServer;
}
