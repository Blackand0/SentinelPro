# Sentinel Pro - Sistema de Gestión de Impresión

**Plataforma web multi-tenant para pequeñas y medianas empresas, completamente funcional en Windows con VS Code.**

## 🚀 Inicio Rápido (Windows)

### Requisitos
- **Node.js 20+** → https://nodejs.org/
- **VS Code** → https://code.visualstudio.com/
- **PowerShell o CMD**

### Instalación (1 minuto)
```powershell
npm install
npm run dev
```

**Accede en:** `http://localhost:5000`

**Credenciales de prueba:**
- Usuario: `sentinelpro`
- Contraseña: `123456`

---

## 📋 Contenido

- [Características](#características)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Desarrollo](#desarrollo)
- [Tecnologías](#tecnologías)

---

## ✨ Características

- ✅ **Autenticación de 4 niveles**: Super Admin, Admin, Operador, Visualizador
- ✅ **Multi-tenant**: Gestión de múltiples empresas con aislamiento de datos
- ✅ **Gestión de usuarios**: CRUD completo con asignación de roles
- ✅ **Impresoras**: Registro y seguimiento de dispositivos
- ✅ **Trabajos de impresión**: Seguimiento con carga de archivos y metadatos
- ✅ **Análisis**: Dashboard en tiempo real con estadísticas de consumo
- ✅ **Interfaz profesional**: Diseño responsivo Material Design/Fluent Design
- ✅ **Completamente en español**: UI 100% en español

---

## 🏗️ Estructura del Proyecto

```
Sentinel Pro/
├── client/                    ← Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/       # Componentes React (shadcn/ui)
│   │   ├── pages/            # Páginas de la aplicación
│   │   ├── lib/              # Utilidades y librerías
│   │   ├── hooks/            # Custom React hooks
│   │   └── App.tsx
│   └── index.html
│
├── server/                    ← Backend (Express + TypeScript)
│   ├── app.ts               # Configuración Express
│   ├── index-dev.ts         # Punto de entrada desarrollo
│   ├── index-prod.ts        # Punto de entrada producción
│   ├── routes.ts            # Rutas API REST
│   ├── storage.ts           # Capa de almacenamiento
│   └── middleware/          # Autenticación, CSRF
│
├── shared/                   ← Código compartido
│   └── schema.ts            # Tipos y esquemas Zod
│
├── package.json             # Dependencias (490 paquetes)
├── tsconfig.json
├── vite.config.ts           # Build & dev server
├── tailwind.config.ts       # Estilos Tailwind
└── INSTRUCCIONES-WINDOWS.md ← Guía completa para Windows
```

---

## 🛠️ Desarrollo

### Scripts Disponibles

| Comando | Descripción |
|---------|------------|
| `npm run dev` | 🔧 Inicia servidor desarrollo (localhost:5000) |
| `npm run build` | 📦 Compila para producción |
| `npm run start` | ▶️ Inicia servidor producción |
| `npm run check` | ✓ Verifica tipos TypeScript |
| `npm run db:push` | 🗄️ Sincroniza base de datos |

### En VS Code

1. **Abre la carpeta** en VS Code
2. **Terminal → New Terminal** (PowerShell)
3. **Ejecuta:** `npm run dev`
4. **Abre navegador:** http://localhost:5000

### Extensiones Recomendadas VS Code
- ES7+ React/Redux snippets
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- TypeScript Vue Plugin

---

## 🔐 Seguridad

- **Autenticación**: express-session con regeneración de sesión
- **Contraseñas**: Hasheadas con bcrypt
- **CSRF**: Cookies con sameSite="strict"
- **Roles**: Verificación servidor-side en cada endpoint
- **Multi-tenant**: Filtrado automático por empresa

---

## 📊 Tecnologías

### Frontend
- **React 18** + TypeScript
- **Tailwind CSS** para estilos
- **Shadcn/UI** componentes accesibles
- **TanStack React Query** estado de servidor
- **Wouter** routing ligero
- **React Hook Form** + Zod validación

### Backend
- **Express.js** servidor web
- **TypeScript** tipado fuerte
- **Multer** cargas de archivos
- **bcrypt** hashing de contraseñas
- **Drizzle ORM** consultas de BD

### Base de Datos (Opcional)
- **PostgreSQL** vía Neon serverless
- **Drizzle Kit** migraciones

---

## 🚀 Despliegue en Replit

1. Descarga el ZIP desde GitHub
2. Sube a Replit
3. Ejecuta `npm install && npm run dev`
4. Publica automáticamente

---

## 📝 Notas de Desarrollo

### Desarrollo Local (Windows)
- Servidor: `http://localhost:5000`
- BD: En memoria (MemStorage)
- Archivos: Carpeta `/uploads`

### Producción
- Configure `SESSION_SECRET` env variable
- Ejecute `npm run build && npm run start`
- Implemente base de datos PostgreSQL

### Variables de Entorno
Ver archivo `.env.example`:
```
SESSION_SECRET=tu-secret-key
NODE_ENV=development
PORT=5000
```

---

## 👤 Roles de Usuario

| Rol | Permisos |
|-----|----------|
| **Super Admin** | Gestiona todo (empresas, admins) |
| **Admin** | Empresa: usuarios, impresoras, trabajos |
| **Operador** | Crea trabajos, gestiona impresoras |
| **Visualizador** | Solo lectura: trabajos y dashboard |

---

## 🐛 Solución de Problemas

**Error: "Cannot find module"**
- Verifica estar en la raíz del proyecto
- Ejecuta `npm install` nuevamente

**Error: "PORT 5000 en uso"**
- Cambia en `.env`: `PORT=3000`
- O cierra la app anterior

**Lentitud en desarrollo**
- Limpia: `npm cache clean --force`
- Reinstala: `del node_modules && npm install`

---

## 📚 Más Información

Consulta `INSTRUCCIONES-WINDOWS.md` para:
- Guía detallada de instalación
- Configuración de VS Code
- Troubleshooting completo
- Estructura de carpetas explicada

---

**Última actualización:** Noviembre 2025  
**Versión:** 1.0.0  
**Licencia:** MIT
