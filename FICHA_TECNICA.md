# FICHA TÉCNICA - SENTINEL PRO

**Versión:** 1.0.0  
**Fecha:** Diciembre 2025  
**Estado:** Producción Lista ✅  
**Licencia:** MIT  

---

## 1. DESCRIPCIÓN GENERAL

**Sentinel Pro** es una plataforma web multi-inquilino (multi-tenant) diseñada para la gestión integral de operaciones de impresión empresarial. Sistema completo con control de acceso basado en roles, gestión de impresoras, inventario unificado, seguimiento de consumo y análisis de gastos.

### Objetivos Principales
- Centralizar la gestión de dispositivos de impresión y suministros
- Rastrear consumo de insumos y costos operativos
- Proporcionar análisis detallados de gastos mensuales
- Mantener inventario de periféricos y mantenimiento
- Garantizar aislamiento de datos entre empresas

---

## 2. STACK TECNOLÓGICO

### Frontend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| **Framework** | React | 18.3.1 |
| **Lenguaje** | TypeScript | 5.6.3 |
| **Build** | Vite + esbuild | 5.4.21 / 0.25.12 |
| **Routing** | Wouter | 3.8.0 |
| **UI Components** | shadcn/ui + Radix UI | Latest |
| **Styling** | Tailwind CSS | 3.4.18 |
| **Forms** | React Hook Form | 7.67.0 |
| **State Query** | TanStack React Query | 5.90.11 |
| **Gráficos** | Recharts | 2.15.4 |
| **Iconos** | Lucide React | 0.453.0 |
| **Animaciones** | Framer Motion | 11.18.2 |
| **Validación** | Zod | 3.25.76 |

### Backend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| **Framework** | Express.js | 4.21.2 |
| **Lenguaje** | TypeScript (tsx) | 5.6.3 |
| **ORM** | Drizzle ORM | 0.39.3 |
| **Base de Datos** | PostgreSQL | Via DATABASE_URL |
| **Driver DB** | postgres | 3.4.7 |
| **Autenticación** | Passport.js + JWT | 0.7.0 / 9.0.2 |
| **Sesiones** | express-session + connect-pg-simple | 1.18.2 / 10.0.0 |
| **Hash** | bcrypt | 6.0.0 |
| **Carga de Archivos** | Multer | 2.0.2 |
| **PDF** | PDFKit | 0.17.2 |
| **WebSocket** | ws | 8.18.0 |
| **Validación** | Zod | 3.25.76 |

### Infraestructura
| Componente | Especificación |
|-----------|--------|
| **Base de Datos** | PostgreSQL (Render.com / Neon) |
| **SSL/TLS** | Requerido (sslmode=require) |
| **Almacenamiento Sesiones** | PostgreSQL (connect-pg-simple) |
| **Variables de Entorno** | DATABASE_URL (única requerida) |

---

## 3. ARQUITECTURA

### Estructura del Proyecto
```
sentinel-pro/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/            # Componentes de página
│   │   ├── components/       # Componentes reutilizables
│   │   ├── lib/              # Utilidades (auth, query, theme)
│   │   ├── App.tsx           # Router principal
│   │   └── main.tsx          # Punto de entrada
│   └── index.html            # HTML base
│
├── server/                    # Backend Express
│   ├── app.ts               # Configuración Express
│   ├── index-dev.ts         # Entry point desarrollo
│   ├── index-prod.ts        # Entry point producción
│   ├── storage.ts           # Capa de datos (Drizzle ORM)
│   ├── routes.ts            # Definición de rutas API
│   └── middleware/          # Autenticación, CSRF, sesiones
│
├── shared/                    # Código compartido
│   └── schema.ts            # Tipos Zod, interfaces compartidas
│
├── package.json             # Dependencias
├── vite.config.ts           # Configuración Vite
└── dist/                    # Build producción (68.3 KB)
    └── index.js
```

### Patrón Arquitectónico
- **Frontend:** React + Vite con componentes funcionales
- **Backend:** Express REST API + WebSocket
- **ORM:** Drizzle con schema first
- **Autenticación:** JWT + Sesiones hibridizado
- **Multi-tenant:** Isolamiento por companyId

---

## 4. BASE DE DATOS

### Schema Completo (11 Tablas)

#### 4.1 `companies`
```sql
id (varchar, PK)          -- UUID primario
name (text)               -- Nombre empresa
email (text, UNIQUE)      -- Email único
admin_id (varchar)        -- FK a users
created_at (timestamp)    -- Timestamp creación
```
**Propósito:** Aislamiento multi-tenant

#### 4.2 `users`
```sql
id (varchar, PK)          -- UUID primario
username (text, UNIQUE)   -- Usuario único
password (text)           -- Hash bcrypt
email (text, UNIQUE)      -- Email único
full_name (text)          -- Nombre completo
role (text)               -- super-admin | admin | operator | viewer
company_id (varchar, FK)  -- Referencia a companies
department_id (varchar)   -- Referencia a departments
created_at (timestamp)    -- Timestamp creación
```
**Roles:**
- `super-admin`: Acceso total (empresas, admins)
- `admin`: Gestión completa dentro empresa (usuarios, impresoras, inventario)
- `operator`: Crear trabajos, ver consumo, gestión básica
- `viewer`: Solo lectura de trabajos e informes

#### 4.3 `departments`
```sql
id (varchar, PK)          -- UUID primario
name (text)               -- Nombre departamento
description (text)        -- Descripción
company_id (varchar, FK)  -- Referencia a companies
manager_id (varchar)      -- Gerente asignado
budget (decimal)          -- Presupuesto asignado
created_at (timestamp)    -- Timestamp creación
```
**Propósito:** Organización interna de empresas

#### 4.4 `printers`
```sql
id (varchar, PK)          -- UUID primario
name (text)               -- Nombre impresora
location (text)           -- Ubicación física
model (text)              -- Modelo dispositivo
ip_address (text)         -- IP de red
company_id (varchar, FK)  -- Referencia a companies
department_id (varchar)   -- Departamento asignado
status (text)             -- active | inactive | maintenance
created_at (timestamp)    -- Timestamp creación
```
**Propósito:** Registro de impresoras

#### 4.5 `paper_types` (Insumos)
```sql
id (varchar, PK)          -- UUID primario
name (text)               -- Tipo de papel
size (text)               -- Tamaño (letter, A4, etc)
weight (integer)          -- Gramaje (gsm)
color (text)              -- Color (white, colored, etc)
price_per_sheet (decimal) -- Precio unitario
stock (integer)           -- Stock actual
company_id (varchar, FK)  -- Referencia a companies
created_at (timestamp)    -- Timestamp creación
```
**Propósito:** Inventario de papel/insumos con precios

#### 4.6 `toner_inventory`
```sql
id (varchar, PK)          -- UUID primario
name (text)               -- Nombre toner
brand (text)              -- Marca
model (text)              -- Modelo compatible
color (text)              -- Color (black, cyan, magenta, yellow)
stock (integer)           -- Stock actual
min_stock (integer)       -- Stock mínimo alerta
price_per_unit (decimal)  -- Precio unitario
printer_id (varchar)      -- Impresora asociada
company_id (varchar, FK)  -- Referencia a companies
created_at (timestamp)    -- Timestamp creación
```
**Propósito:** Gestión de tóner/tinta con alertas

#### 4.7 `maintenance_logs` (Periféricos)
```sql
id (varchar, PK)          -- UUID primario
printer_id (varchar, FK)  -- Referencia a printers
technician_id (varchar)   -- Técnico asignado
maintenance_type (text)   -- preventive | corrective | equipment_purchase
description (text)        -- Descripción trabajo
cost (decimal)            -- Costo de la intervención
status (text)             -- pending | in_progress | completed
scheduled_date (timestamp)-- Fecha programada
completed_date (timestamp)-- Fecha completado
company_id (varchar, FK)  -- Referencia a companies (CRÍTICO para filtrado)
created_at (timestamp)    -- Timestamp creación
```
**Propósito:** Registro de mantenimiento y compras de equipos
**Nota:** companyId permite filtrado correcto por empresa

#### 4.8 `print_jobs`
```sql
id (varchar, PK)          -- UUID primario
user_id (varchar, FK)     -- Usuario que imprime
printer_id (varchar, FK)  -- Impresora usada
document_name (text)      -- Nombre documento
file_name (text)          -- Nombre archivo
file_path (text)          -- Ruta archivo guardado
file_size (integer)       -- Tamaño bytes
page_count (integer)      -- Páginas imprimidas
copies (integer)          -- Número copias
color_mode (text)         -- bw | color
paper_size (text)         -- letter | A4 | etc
paper_type_id (varchar)   -- Tipo papel usado
status (text)             -- completed | pending | failed
printed_at (timestamp)    -- Timestamp impresión
```
**Propósito:** Historial de trabajos de impresión

#### 4.9 `consumption_expenses`
```sql
id (varchar, PK)          -- UUID primario
company_id (varchar, FK)  -- Referencia a companies
expense_type (text)       -- maintenance | paper | toner | equipment
amount (decimal)          -- Monto en moneda
description (text)        -- Descripción gasto
date (timestamp)          -- Fecha del gasto
created_at (timestamp)    -- Timestamp creación
```
**Propósito:** Registro de gastos para análisis de consumo

#### 4.10 `alerts`
```sql
id (varchar, PK)          -- UUID primario
company_id (varchar, FK)  -- Referencia a companies
type (text)               -- stock_low | maintenance_due | etc
title (text)              -- Título alerta
message (text)            -- Mensaje descriptivo
severity (text)           -- info | warning | critical
read (boolean)            -- Estado lectura
resource_id (varchar)     -- ID recurso relacionado
resource_type (text)      -- Tipo recurso (printer, toner, etc)
created_at (timestamp)    -- Timestamp creación
```
**Propósito:** Sistema inteligente de notificaciones

#### 4.11 `session`
```sql
sid (varchar, PK)         -- Session ID
sess (json)               -- Datos sesión
expire (timestamp)        -- Expiración sesión
```
**Propósito:** Almacenamiento PostgreSQL de sesiones Express

### Relaciones y Dependencias
```
companies
  ├─ users (N:1)
  ├─ departments (1:N)
  └─ printers (1:N)
     └─ maintenance_logs (1:N)
     └─ print_jobs (1:N)

users
  ├─ print_jobs (1:N)
  └─ departments (N:1)

paper_types (1:N) → print_jobs
toner_inventory (1:N) → maintenance_logs

consumption_expenses (N:1) → companies
alerts (N:1) → companies
```

### Auto-migrations
- Tablas creadas con `IF NOT EXISTS`
- Nuevas columnas agregadas automáticamente con `ALTER TABLE ... IF NOT EXISTS`
- Se ejecutan en startup del servidor
- Garantizan compatibilidad entre versiones

---

## 5. FUNCIONALIDADES POR MÓDULO

### 5.1 Autenticación & Control de Acceso
- ✅ Registro de usuarios con validación
- ✅ Login con JWT + Sesiones
- ✅ Recuperación de sesión
- ✅ Control de acceso por rol
- ✅ Logout y cierre de sesión
- ✅ Hash de contraseñas con bcrypt

### 5.2 Dashboard
- ✅ Estadísticas en tiempo real según rol
- ✅ Últimos trabajos de impresión
- ✅ Indicadores de salud del sistema

### 5.3 Gestión de Empresas (Super Admin)
- ✅ Crear nuevas empresas
- ✅ Asignar administrador a empresa
- ✅ Listar todas las empresas
- ✅ Eliminar empresas

### 5.4 Gestión de Usuarios (Admin)
- ✅ Crear usuarios en empresa
- ✅ Asignar roles (admin, operator, viewer)
- ✅ Asignar departamentos
- ✅ Listar usuarios por empresa
- ✅ Eliminar usuarios
- ✅ Validación de username/email únicos

### 5.5 Gestión de Departamentos (Admin)
- ✅ Crear departamentos
- ✅ Asignar gerente
- ✅ Definir presupuesto
- ✅ Actualizar información
- ✅ Eliminar departamentos

### 5.6 Gestión de Impresoras (Admin)
- ✅ Agregar impresoras con modelo e IP
- ✅ Ubicación y departamento
- ✅ Estado (activa/inactiva/mantenimiento)
- ✅ Editar configuración
- ✅ Eliminar impresoras
- ✅ Filtrado por empresa

### 5.7 Trabajos de Impresión (Operator/Viewer)
- ✅ Crear nuevos trabajos (operator)
- ✅ Seleccionar impresora y paper type
- ✅ Modo color/B&W
- ✅ Subir archivos PDF
- ✅ Ver historial de trabajos
- ✅ Listar trabajos por empresa
- ✅ Filtrado por estado

### 5.8 Inventario Insumos (Admin)
- ✅ Crear tipos de papel con precios
- ✅ Gestionar stock
- ✅ Remover insumos cuando se usan
- ✅ Mostrar precio unitario
- ✅ Actualizar información
- ✅ Eliminar tipos de papel

### 5.9 Inventario Tóner/Tinta (Admin)
- ✅ Registrar cartuchos/botellas
- ✅ Marca, modelo, color
- ✅ Precio unitario y stock
- ✅ Stock mínimo para alertas
- ✅ Vincular a impresoras
- ✅ Editar stock
- ✅ Eliminar cartuchos

### 5.10 Periféricos & Mantenimiento (Admin)
- ✅ Registrar equipos/periféricos
- ✅ Compras de nuevo equipamiento
- ✅ Mantenimiento preventivo/correctivo
- ✅ Asignar técnico
- ✅ Registrar costos
- ✅ Fechas programadas y realizadas
- ✅ Estados de seguimiento
- ✅ Filtrado correcto por empresa (companyId)

### 5.11 Análisis de Consumo (Admin)
- ✅ Dashboard de gastos mensuales
- ✅ Desglose por categoría:
  - Mantenimiento (costos registrados)
  - Equipamiento (periféricos comprados)
  - Insumos (papel consumido)
  - Tóner (cartuchos usados)
- ✅ Exportar reportes CSV
- ✅ Visualización gráfica
- ✅ Filtro por período

### 5.12 Sistema de Alertas
- ✅ Stock bajo en tóner
- ✅ Stock bajo en paper
- ✅ Mantenimiento programado
- ✅ Impresoras inactivas
- ✅ Marcar alertas como leídas
- ✅ Notificaciones por severidad

---

## 6. RUTAS DEL SISTEMA

### Rutas Frontend (React + Wouter)
| Ruta | Componente | Roles | Descripción |
|------|-----------|-------|------------|
| `/login` | LoginPage | Public | Autenticación |
| `/register` | RegisterPage | Public | Registro usuario |
| `/` | DashboardPage | All | Panel principal |
| `/print-jobs` | PrintJobsPage | All | Historial impresiones |
| `/print-jobs/new` | NewPrintJobPage | admin, operator | Crear trabajo |
| `/companies` | CompaniesPage | super-admin | Gestión empresas |
| `/users` | UsersPage | admin, super-admin | Gestión usuarios |
| `/printers` | PrintersPage | admin | Gestión impresoras |
| `/paper-types` | PaperTypesPage | admin | Gestión insumos |
| `/toner-inventory` | TonerInventoryPage | admin | Gestión tóner |
| `/maintenance` | MaintenancePage | admin | Periféricos y mantenimiento |
| `/consumption` | ConsumptionPage | admin | Análisis de gastos |
| `/analytics` | AnalyticsPage | admin | Reportes avanzados |

### API Endpoints (Express)

#### Autenticación
```
POST /api/auth/login          - Login usuario
POST /api/auth/register       - Registro
POST /api/auth/logout         - Logout
GET  /api/auth/me             - Usuario actual
GET  /api/auth/refresh        - Refrescar JWT
```

#### Empresas
```
GET  /api/companies           - Listar todas (super-admin)
POST /api/companies           - Crear empresa
DELETE /api/companies/:id     - Eliminar empresa
```

#### Usuarios
```
GET  /api/users               - Listar usuarios empresa
POST /api/users               - Crear usuario
DELETE /api/users/:id         - Eliminar usuario
PATCH /api/users/:id          - Actualizar usuario
```

#### Departamentos
```
GET  /api/departments         - Listar departamentos
POST /api/departments         - Crear departamento
PATCH /api/departments/:id    - Actualizar
DELETE /api/departments/:id   - Eliminar
```

#### Impresoras
```
GET  /api/printers            - Listar impresoras
POST /api/printers            - Crear impresora
PATCH /api/printers/:id       - Actualizar
DELETE /api/printers/:id      - Eliminar
```

#### Trabajos de Impresión
```
GET  /api/print-jobs          - Listar trabajos
POST /api/print-jobs          - Crear trabajo
GET  /api/print-jobs/:id      - Detalles trabajo
```

#### Insumos (Paper Types)
```
GET  /api/paper-types         - Listar tipos papel
POST /api/paper-types         - Crear tipo
PATCH /api/paper-types/:id    - Actualizar
DELETE /api/paper-types/:id   - Eliminar
PATCH /api/paper-types/:id/consume - Remover stock
```

#### Tóner/Tinta
```
GET  /api/toner-inventory     - Listar cartuchos
POST /api/toner-inventory     - Crear cartucho
PATCH /api/toner-inventory/:id - Actualizar
DELETE /api/toner-inventory/:id - Eliminar
```

#### Periféricos/Mantenimiento
```
GET  /api/maintenance-logs    - Listar periféricos
POST /api/maintenance-logs    - Registrar
PATCH /api/maintenance-logs/:id - Actualizar
DELETE /api/maintenance-logs/:id - Eliminar
```

#### Consumo/Gastos
```
GET  /api/consumption         - Estadísticas consumo
POST /api/consumption-expenses - Registrar gasto
GET  /api/consumption/export  - Exportar CSV
```

#### Alertas
```
GET  /api/alerts              - Listar alertas
PATCH /api/alerts/:id/read    - Marcar leída
DELETE /api/alerts/:id        - Eliminar alerta
```

#### Dashboard
```
GET  /api/dashboard           - Estadísticas panel
```

---

## 7. ROLES Y PERMISOS

### Matriz de Control de Acceso

| Función | Super Admin | Admin | Operator | Viewer |
|---------|:-----------:|:-----:|:--------:|:------:|
| **Empresa** |
| Ver empresas | ✅ | - | - | - |
| Crear empresa | ✅ | - | - | - |
| Eliminar empresa | ✅ | - | - | - |
| **Usuarios** |
| Ver usuarios | ✅ | ✅ | - | - |
| Crear usuario | ✅ | ✅ | - | - |
| Eliminar usuario | ✅ | ✅ | - | - |
| Cambiar rol | ✅ | ✅ | - | - |
| **Impresoras** |
| Ver impresoras | ✅ | ✅ | ✅ | ✅ |
| Crear impresora | - | ✅ | - | - |
| Editar impresora | - | ✅ | - | - |
| Eliminar impresora | - | ✅ | - | - |
| **Trabajos Impresión** |
| Ver trabajos | ✅ | ✅ | ✅ | ✅ |
| Crear trabajo | - | ✅ | ✅ | - |
| Ver detalles | ✅ | ✅ | ✅ | ✅ |
| **Inventario** |
| Ver insumos | - | ✅ | - | - |
| Crear insumo | - | ✅ | - | - |
| Editar insumo | - | ✅ | - | - |
| Remover stock | - | ✅ | - | - |
| Ver tóner | - | ✅ | - | - |
| Crear tóner | - | ✅ | - | - |
| **Periféricos** |
| Ver periféricos | - | ✅ | - | - |
| Registrar compra | - | ✅ | - | - |
| Registrar mantenimiento | - | ✅ | - | - |
| **Consumo/Análisis** |
| Ver dashboard consumo | - | ✅ | - | - |
| Exportar reportes | - | ✅ | - | - |
| Ver alertas | - | ✅ | ✅ | ✅ |

---

## 8. CONFIGURACIÓN DE DEPLOYMENT

### Requisitos Previos
- Node.js 18+
- PostgreSQL 12+
- Variable de entorno: `DATABASE_URL`

### Build para Producción
```bash
npm run build
```
**Output:** `dist/index.js` (68.3 KB)

### Comando de Inicio
```bash
node dist/index.js
```

### Variables de Entorno Requeridas

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `DATABASE_URL` | **REQUERIDO** | postgresql://user:pass@host:5432/dbname?sslmode=require |
| `NODE_ENV` | production | production |

**Nota:** SSL es obligatorio (sslmode=require en DATABASE_URL)

### Configuración de Sesiones
- Storage: PostgreSQL (connect-pg-simple)
- Tabla: `session`
- Expiración: Configurable (default 24h)
- Automigración: Tabla creada en startup

---

## 9. DEPLOYMENT EN RENDER.COM

### Paso 1: Crear Base de Datos PostgreSQL
1. En Render.com, crear nuevo PostgreSQL Database
2. Copiar la cadena de conexión completa
3. Verificar que incluya `?sslmode=require`

### Paso 2: Crear Servicio Web
1. Nuevo Web Service en Render.com
2. Conectar repositorio Git
3. Build Command:
   ```bash
   npm install && npm run build
   ```
4. Start Command:
   ```bash
   node dist/index.js
   ```

### Paso 3: Configurar Variables de Entorno
1. En Render dashboard, ir a Environment
2. Agregar variable: `DATABASE_URL` = [URL PostgreSQL copiada del paso 1]
3. Asegurarse que incluye `?sslmode=require`

### Paso 4: Deploy
1. Hacer push a rama main (si está configurado)
2. O hacer click en "Deploy" manualmente
3. Esperar a que compile y se inicie

### Verificación
1. Acceder a `https://your-app.onrender.com`
2. Login con usuario super-admin: `sentinelpro` / `123456`
3. Verificar que tablas se crean automáticamente

### Troubleshooting
| Error | Solución |
|-------|----------|
| DATABASE_URL not found | Verificar que está configurada en Environment |
| SSL Error | Asegurar `?sslmode=require` en DATABASE_URL |
| Connection timeout | Verificar IP whitelist en Render PostgreSQL |
| Build fails | Ejecutar `npm install` localmente para validar |

---

## 10. DATOS DE ACCESO POR DEFECTO

### Usuario Super Admin (Generado Automáticamente)
```
Username: sentinelpro
Password: 123456
Rol: super-admin
```

### Usuario Admin (Generado Automáticamente)
```
Username: admin
Password: 123456
Rol: admin
Empresa: Empresa De Prueba
```

### Empresa de Prueba
```
Nombre: Empresa De Prueba
Email: empresa.prueba@sentinel.cl
ID: 00000000-0000-0000-0000-000000000010
```

**IMPORTANTE:** Cambiar estas credenciales después del primer acceso en producción.

---

## 11. CARACTERÍSTICAS DE SEGURIDAD

### Autenticación & Autorización
- ✅ JWT con expiración configurable
- ✅ Hash bcrypt para contraseñas (10 rondas)
- ✅ Sesiones PostgreSQL-backed
- ✅ Control de acceso por rol en rutas
- ✅ Validación de permisos en endpoints

### Aislamiento Multi-tenant
- ✅ Filtrado por `companyId` en todas consultas
- ✅ Usuarios vinculados a empresa
- ✅ Imposible acceder datos de otra empresa
- ✅ companyId en maintenance_logs para filtrado correcto

### Validación de Datos
- ✅ Zod schemas para entrada
- ✅ Validación en frontend y backend
- ✅ Mensajes de error descriptivos

### Protección CSRF
- ✅ Middleware CSRF en rutas sensibles
- ✅ Token CSRF en formularios

### Almacenamiento de Archivos
- ✅ Multer con validación MIME
- ✅ Límite de tamaño (5MB)
- ✅ Ruta segura de almacenamiento

---

## 12. RENDIMIENTO & OPTIMIZACIONES

### Frontend
- **Build Size:** 68.3 KB (minificado)
- **Code Splitting:** Vite lazy loading
- **Caching:** Cache control headers
- **Queries:** TanStack React Query con caché inteligente

### Backend
- **Pool de Conexiones:** PostgreSQL connection pool
- **Indexación:** Índices automáticos en PKs y FKs
- **Queries Optimizadas:** Drizzle con select selectivo

### Base de Datos
- **Conexiones SSL:** Requerido para seguridad
- **Auto-migrations:** Lazy loading de tablas
- **Índices:** En PRIMARY KEYS y FOREIGN KEYS

---

## 13. TESTING

### Unitarios (Sin herramientas externas)
- Validar schemas Zod
- Testear funciones de utility
- Verificar lógica de permisos

### Integración Manual
1. Login con diferentes roles
2. Acceder recursos según permisos
3. CRUD operations en cada módulo
4. Validar aislamiento multi-tenant

---

## 14. COMPATIBILIDAD

### Navegadores Soportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Sistemas Operativos
- Linux (Render.com)
- macOS 12+
- Windows 10+

### Bases de Datos
- PostgreSQL 12+
- Render PostgreSQL (Neon)

---

## 15. ROADMAP Y MEJORAS FUTURAS

### v1.1 (Próximo)
- [ ] Gráficos avanzados de consumo
- [ ] Exportación Excel completa
- [ ] Notificaciones por email

### v1.2
- [ ] Panel de control de costos por departamento
- [ ] Predicción de consumo con ML
- [ ] Integración con sistemas de facturación

### v1.3
- [ ] API pública para integraciones
- [ ] Webhooks para eventos
- [ ] Dashboard mobile responsive

---

## 16. SOPORTE & DOCUMENTACIÓN

### Generación de Reportes
- CSV: Compatible con Excel
- PDF: Generación con PDFKit

### Logs
- Stdout para debugging
- Disponibles en Render.com dashboard

### Migración de Datos
- Auto-migration en startup
- Compatibilidad hacia atrás garantizada

---

## 17. LICENCIA Y TÉRMINOS

**Licencia:** MIT

---

**Última actualización:** Diciembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ PRODUCCIÓN LISTA
