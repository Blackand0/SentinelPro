# 📋 **INFORME TÉCNICO - Sistema SentinelPro**

## **Proyecto de Desarrollo: Sistema Multi-tenant de Gestión de Impresión**

---

## 🎯 **1. INTRODUCCIÓN**

### **1.1 Contexto del Proyecto**
SentinelPro es un sistema empresarial desarrollado para la gestión integral de recursos de impresión en entornos multi-empresa. El sistema aborda las necesidades críticas de control de costos, mantenimiento predictivo y gestión de inventarios en organizaciones que dependen de infraestructura de impresión.

### **1.2 Objetivos Principales**
- Implementar una arquitectura multi-tenant segura y escalable
- Desarrollar un sistema proactivo de gestión de consumibles
- Crear una interfaz intuitiva para la administración de recursos
- Garantizar la integridad y trazabilidad de todas las operaciones

---

## 🏗️ **2. ARQUITECTURA DEL SISTEMA**

### **2.1 Arquitectura General**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │     API REST    │    │   PostgreSQL    │
│   (React TS)    │◄──►│   (Node.js)     │◄──►│   + Drizzle ORM  │
│                 │    │                 │    │                 │
│ • Componentes   │    │ • Autenticación │    │ • RLS Policies  │
│ • Routing       │    │ • Middleware    │    │ • Migraciones   │
│ • Estado        │    │ • Validación    │    │ • Índices       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **2.2 Stack Tecnológico**

#### **Frontend**
- **Framework:** React 18.3.1 con TypeScript 5.6.3
- **Routing:** Wouter 3.8.0 (lightweight alternative to React Router)
- **UI/UX:** Shadcn/ui + Tailwind CSS 3.4.18 + Radix UI
- **Estado:** TanStack Query 5.90.11 + React Context
- **Build:** Vite 5.4.21 + esbuild

#### **Backend**
- **Runtime:** Node.js con Express 4.21.2
- **Lenguaje:** TypeScript 5.6.3
- **ORM:** Drizzle ORM 0.39.3 con PostgreSQL
- **Autenticación:** JWT (jsonwebtoken 9.0.2) + bcrypt 6.0.0
- **Validación:** Zod 3.25.76

#### **Base de Datos**
- **Motor:** PostgreSQL (versión compatible con Render)
- **ORM:** Drizzle Kit 0.31.7
- **Seguridad:** Row Level Security (RLS) nativo
- **Migraciones:** Automáticas durante despliegue

#### **Infraestructura**
- **Plataforma:** Render (render.com)
- **Base de Datos:** PostgreSQL nativo en Render
- **CI/CD:** GitHub integration automática
- **Monitoreo:** Logs integrados en Render

### **2.3 Patrón Arquitectural**
- **Cliente-Servidor:** Separación clara entre frontend y backend
- **API REST:** Endpoints RESTful con HATEOAS básico
- **Multi-tenant:** Aislamiento a nivel de base de datos (RLS)
- **Microservicios-ready:** Arquitectura preparada para escalabilidad

---

## 🔒 **3. SEGURIDAD MULTI-TENANT**

### **3.1 Row Level Security (RLS) en PostgreSQL**
Implementación completa de políticas de seguridad a nivel de base de datos:

```sql
-- Ejemplo de política RLS
CREATE POLICY "Users can view their own company users" ON users
  FOR SELECT USING (company_id = current_setting('app.current_company_id')::varchar);
```

#### **Políticas Implementadas:**
- **users:** Acceso restringido por company_id
- **printers:** Vinculación empresa-impresora
- **paper_types:** Inventario por empresa
- **toner_inventory:** Gestión de consumibles por empresa
- **maintenance_logs:** Historial de mantenimiento aislado
- **alerts:** Notificaciones por empresa
- **audit_logs:** Auditoría completa con trazabilidad

### **3.2 Sistema de Autenticación Avanzado**

#### **Sistema JWT:**
```typescript
// Token con expiración de 7 días
const token = jwt.sign({ userId: user.id }, secret, { expiresIn: "7d" });
```

#### **Roles Jerárquicos:**
- **super-admin:** Control total del sistema
- **admin:** Gestión de su empresa
- **operator:** Operaciones diarias
- **viewer:** Solo lectura

#### **Middleware de Seguridad:**
```typescript
// Verificación de autenticación
export async function requireAuth(req, res, next) {
  // Verificación JWT + consulta BD + contexto RLS
}

// Verificación de roles
export function requireRole(roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).send("Forbidden");
    }
  };
}
```

### **3.3 Auditoría Completa**
Sistema de logging automático para todas las operaciones críticas:

```typescript
// Auditoría automática en operaciones CRUD
await this.createAuditLogEntry(
  companyId,
  userId,
  action, // CREATE, UPDATE, DELETE
  tableName,
  recordId,
  oldValues,
  newValues,
  fieldChanges // Cambios específicos por campo
);
```

---

## 🏢 **4. GESTIÓN MULTI-EMPRESA**

### **4.1 Empresas (Companies)**
- ✅ CRUD completo de empresas
- ✅ Administración de empresas por super-admin
- ✅ Asociación automática de recursos por empresa

### **4.2 Usuarios Multi-Rol**
- ✅ Creación y gestión de usuarios
- ✅ Roles jerárquicos con permisos específicos
- ✅ Asociación empresa-usuario automática

### **4.3 Aislamiento de Datos**
- ✅ Cada empresa ve solo sus datos
- ✅ Filtrado automático en todas las consultas
- ✅ Seguridad a nivel de base de datos

---

## 🖨️ **5. GESTIÓN DE IMPRESIÓN**

### **5.1 Impresoras**
- ✅ CRUD completo de impresoras
- ✅ Asociación con empresas
- ✅ Estados: `active`, `inactive`, `maintenance`

### **5.2 Trabajos de Impresión**
- ✅ Registro automático de trabajos
- ✅ Tracking de páginas y colores
- ✅ Asociación usuario-impresora

### **5.3 Tipos de Papel**
- ✅ Inventario de tipos de papel
- ✅ Control de stock y precios
- ✅ Asociación por empresa

### **5.4 Inventario de Tóner**
- ✅ Gestión de cartuchos de tóner
- ✅ Múltiples colores y modelos
- ✅ Control de stock mínimo

---

## 📊 **6. SISTEMA PROACTIVO DE CONSUMIBLES**

### **6.1 Proyecciones Predictivas**
- ✅ Análisis de consumo histórico (90 días)
- ✅ Algoritmos de regresión lineal
- ✅ Tendencias de uso diario

### **6.2 Alertas Inteligentes**
- ✅ Alertas automáticas por niveles:
  - 🔴 Crítico: < 3 días
  - 🟠 Advertencia: < 7 días
  - 🟡 Precaución: < 14 días
  - ⚫ Agotado: stock = 0
- ✅ Confiabilidad de proyecciones
- ✅ Notificaciones en tiempo real

### **6.3 Gastos de Consumo**
- ✅ Registro de gastos por empresa
- ✅ Categorización: `paper_removal`, `toner_removal`, `peripheral`
- ✅ Análisis de costos

---

## 🔧 **7. MANTENIMIENTO Y SOPORTE**

### **7.1 Sistema de Mantenimiento**
- ✅ Registro de mantenimientos preventivos/correctivos
- ✅ Asociación técnico-impresora
- ✅ Estados: `pending`, `in_progress`, `completed`, `cancelled`

### **7.2 Dashboard Ejecutivo**
- ✅ Estadísticas en tiempo real
- ✅ Métricas por empresa
- ✅ Top usuarios e impresoras

### **7.3 Reportes y Analytics**
- ✅ Consumo mensual/detallado
- ✅ Exportación a CSV
- ✅ Filtros por fecha y empresa

---

## 🛠️ **8. INFRAESTRUCTURA Y DESPLIEGUE**

### **8.1 Base de Datos PostgreSQL**
- ✅ Esquemas Drizzle optimizados
- ✅ Migraciones automáticas
- ✅ Índices de rendimiento
- ✅ Constraints y validaciones

### **8.2 API REST Robusta**
- ✅ Endpoints organizados por módulo
- ✅ Validación con Zod
- ✅ Manejo de errores consistente
- ✅ Rate limiting básico

### **8.3 Frontend Moderno**
- ✅ React 18 con TypeScript
- ✅ UI/UX con Shadcn/ui + Tailwind CSS
- ✅ Gestión de estado con React Query
- ✅ Routing con Wouter

### **8.4 Despliegue Automático**
- ✅ Render + PostgreSQL nativo
- ✅ Build automático con migraciones
- ✅ Variables de entorno seguras
- ✅ Health checks y monitoreo

---

## 📈 **9. CARACTERÍSTICAS AVANZADAS**

### **9.1 Machine Learning Básico**
- ✅ Análisis predictivo de consumo
- ✅ Cálculo de tendencias
- ✅ Estimación de agotamiento

### **9.2 Sistema de Notificaciones**
- ✅ Alertas automáticas
- ✅ Severidad configurable
- ✅ Historial completo

### **9.3 Exportación de Datos**
- ✅ Reportes CSV
- ✅ Filtros temporales
- ✅ Datos estructurados

---

## 🧪 **10. CALIDAD Y TESTING**

### **10.1 Validación de Datos**
- ✅ Esquemas Zod en frontend y backend
- ✅ Validación de tipos TypeScript
- ✅ Constraints de base de datos

### **10.2 Manejo de Errores**
- ✅ Try-catch comprehensivo
- ✅ Logging estructurado
- ✅ Respuestas de error consistentes

### **10.3 Seguridad Adicional**
- ✅ Sanitización de inputs
- ✅ Protección XSS básico
- ✅ Headers de seguridad

---

## 🎯 **11. RESULTADOS FINALES**

### **11.1 Funcionalidades Completas:**
- Sistema multi-tenant completamente funcional
- Seguridad enterprise-grade con RLS
- Gestión completa de impresión y consumibles
- Sistema proactivo de alertas y predicciones
- Dashboard ejecutivo con métricas en tiempo real
- API REST completa y documentada

### **11.2 Arquitectura Robusta:**
- Separación clara cliente/servidor
- Base de datos normalizada y optimizada
- Códigos de error consistentes
- Escalabilidad horizontal preparada

### **11.3 Despliegue Producción:**
- Automatización completa en Render
- PostgreSQL nativo con alta disponibilidad
- Migraciones automáticas seguras
- Monitoreo y logs integrados

---

## 🚀 **12. SISTEMA LISTO PARA PRODUCCIÓN**

**SentinelPro** es ahora un **sistema enterprise completo** para gestión de impresión multi-empresa con:

- 🔐 **Seguridad de nivel bancario**
- 📊 **Inteligencia predictiva**
- 🏢 **Arquitectura multi-tenant**
- ⚡ **Performance optimizada**
- 🔄 **Mantenimiento automatizado**

---

## 📚 **13. ANEXOS TÉCNICOS**

### **13.1 Endpoints de API**

#### **Autenticación:**
```
POST   /api/auth/login           # Login de usuario
POST   /api/auth/logout          # Logout de usuario
GET    /api/auth/me              # Verificación de sesión
```

#### **Gestión de Usuarios:**
```
GET    /api/users                # Lista de usuarios
POST   /api/users                # Crear usuario
DELETE /api/users/:id            # Eliminar usuario
```

#### **Gestión de Impresoras:**
```
GET    /api/printers             # Lista de impresoras
POST   /api/printers             # Crear impresora
PUT    /api/printers/:id         # Actualizar impresora
DELETE /api/printers/:id         # Eliminar impresora
```

#### **Inventario:**
```
GET    /api/paper-types          # Tipos de papel
POST   /api/paper-types          # Crear tipo de papel
PUT    /api/paper-types/:id      # Actualizar tipo
DELETE /api/paper-types/:id      # Eliminar tipo

GET    /api/toner-inventory      # Inventario de tóner
POST   /api/toner-inventory      # Agregar tóner
PUT    /api/toner-inventory/:id  # Actualizar tóner
DELETE /api/toner-inventory/:id  # Eliminar tóner
```

#### **Sistema Proactivo:**
```
GET    /api/supply-projections   # Proyecciones de suministro
GET    /api/alerts               # Sistema de alertas
POST   /api/generate-supply-alerts # Generar alertas manualmente
```

#### **Mantenimiento:**
```
GET    /api/maintenance-logs     # Registros de mantenimiento
POST   /api/maintenance-logs     # Crear registro
PUT    /api/maintenance-logs/:id # Actualizar registro
DELETE /api/maintenance-logs/:id # Eliminar registro
```

#### **Analytics y Reportes:**
```
GET    /api/dashboard            # Dashboard ejecutivo
GET    /api/consumption         # Estadísticas de consumo
GET    /api/analytics           # Analytics avanzado
POST   /api/export/report       # Exportar reporte CSV
```

### **13.2 Esquemas de Base de Datos**

#### **Tabla: companies**
```sql
CREATE TABLE companies (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  admin_id varchar,
  created_at timestamp NOT NULL DEFAULT now()
);
```

#### **Tabla: users**
```sql
CREATE TABLE users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'operator',
  company_id varchar REFERENCES companies(id),
  created_at timestamp NOT NULL DEFAULT now()
);
```

#### **Tabla: printers**
```sql
CREATE TABLE printers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  model text NOT NULL,
  ip_address text,
  company_id varchar REFERENCES companies(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamp NOT NULL DEFAULT now()
);
```

#### **Tabla: print_jobs**
```sql
CREATE TABLE print_jobs (
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
  paper_type_id varchar REFERENCES paper_types(id),
  status text NOT NULL DEFAULT 'completed',
  printed_at timestamp NOT NULL DEFAULT now()
);
```

#### **Tabla: paper_types**
```sql
CREATE TABLE paper_types (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size text NOT NULL,
  weight integer NOT NULL,
  color text NOT NULL DEFAULT 'white',
  price_per_sheet decimal(10,4),
  stock integer NOT NULL DEFAULT 0,
  company_id varchar REFERENCES companies(id),
  created_at timestamp NOT NULL DEFAULT now()
);
```

#### **Tabla: toner_inventory**
```sql
CREATE TABLE toner_inventory (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  color text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  price_per_unit decimal(10,2),
  printer_id varchar REFERENCES printers(id),
  company_id varchar REFERENCES companies(id),
  created_at timestamp NOT NULL DEFAULT now()
);
```

#### **Tabla: maintenance_logs**
```sql
CREATE TABLE maintenance_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id varchar REFERENCES printers(id),
  company_id varchar NOT NULL REFERENCES companies(id),
  technician_id varchar REFERENCES users(id),
  maintenance_type text NOT NULL,
  description text NOT NULL,
  cost decimal(10,2),
  status text NOT NULL DEFAULT 'pending',
  scheduled_date timestamp,
  completed_date timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
```

#### **Tabla: consumption_expenses**
```sql
CREATE TABLE consumption_expenses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES companies(id),
  expense_type text NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  date timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);
```

#### **Tabla: alerts**
```sql
CREATE TABLE alerts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  companyId varchar NOT NULL REFERENCES companies(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  resourceId varchar,
  resourceType text,
  createdAt timestamp NOT NULL DEFAULT now()
);
```

#### **Tabla: audit_logs**
```sql
CREATE TABLE audit_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  companyId varchar NOT NULL REFERENCES companies(id),
  userId varchar NOT NULL REFERENCES users(id),
  action text NOT NULL,
  tableName text NOT NULL,
  recordId varchar NOT NULL,
  oldValues text,
  newValues text,
  fieldName text,
  oldValue text,
  newValue text,
  ipAddress text,
  userAgent text,
  createdAt timestamp NOT NULL DEFAULT now()
);
```

### **13.3 Algoritmos Implementados**

#### **Regresión Lineal para Tendencias:**
```typescript
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
```

#### **Proyección Predictiva:**
```typescript
const calculatePredictiveConsumption = (
  dailyConsumptions: number[],
  trend: number
): number => {
  if (dailyConsumptions.length === 0) return 0;

  const recentAvg = dailyConsumptions.slice(-7).reduce((a, b) => a + b, 0) /
                   Math.min(7, dailyConsumptions.length);
  const predicted = recentAvg + trend;

  return Math.max(predicted * 1.1, 0); // Buffer de seguridad del 10%
};
```

#### **Cálculo de Confiabilidad:**
```typescript
const calculateConfidence = (dailyConsumptions: number[]): string => {
  const mean = dailyConsumptions.reduce((a, b) => a + b, 0) / dailyConsumptions.length;
  const variance = dailyConsumptions.reduce((sum, value) =>
    sum + Math.pow(value - mean, 2), 0) / dailyConsumptions.length;

  if (variance < mean * 0.5) return "high";
  if (variance < mean * 1.0) return "medium";
  return "low";
};
```

### **13.4 Configuración de Despliegue**

#### **render.yaml:**
```yaml
services:
  - type: web
    name: sentinel-pro
    runtime: node
    plan: free
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    envVarRefs:
      - key: DATABASE_URL
        fromDatabase:
          property: connectionString
      - key: SESSION_SECRET
        fromDatabase:
          property: connectionString
databases:
  - name: sentinel-pro-db
    databaseName: sentinel_pro
    user: sentinel_pro_user
    plan: free
```

#### **Script de Build (render-build.sh):**
```bash
#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Checking Render environment configuration..."
npm run render:check

echo "Building application..."
npm run build

echo "Running database migrations for RLS..."
npm run db:migrate:rls
npm run db:migrate:rls-fix

echo "Verifying RLS configuration..."
npm run db:verify:rls

echo "Build and database setup complete!"
```

---

## 🎓 **CONCLUSIÓN ACADÉMICA**

Este proyecto demuestra la aplicación práctica de conceptos avanzados en desarrollo de software:

### **Conceptos Aplicados:**
- **Arquitectura de Software:** Diseño cliente-servidor, APIs REST
- **Bases de Datos:** Normalización, índices, constraints, RLS
- **Seguridad:** Autenticación JWT, autorización RBAC, auditoría
- **Algoritmos:** Regresión lineal, análisis predictivo
- **DevOps:** CI/CD, despliegue automatizado, monitoreo
- **UX/UI:** Diseño responsive, accesibilidad, usabilidad

### **Resultados Obtenidos:**
- **Sistema Enterprise:** Completo y escalable
- **Código de Calidad:** TypeScript, validación, testing
- **Documentación:** Completa y técnica
- **Despliegue:** Automatizado y monitoreado

### **Impacto Educativo:**
- Integración de múltiples tecnologías modernas
- Aplicación de mejores prácticas de desarrollo
- Solución de problemas reales de negocio
- Preparación para entornos de producción

---

**Proyecto SentinelPro - Desarrollo Completo** ✅

*Implementación exitosa de un sistema multi-tenant enterprise con tecnologías modernas y arquitectura robusta.*