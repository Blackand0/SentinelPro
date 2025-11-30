# Sentinel Pro - Sistema de Gestión de Impresión

**Plataforma web multi-tenant para pequeñas y medianas empresas, completamente funcional en la nube con Render.com.**

## 🚀 Acceso Rápido

### App en Vivo
**URL:** https://sentinelpro.onrender.com

**Credenciales Super Admin:**
- Usuario: `sentinelpro`
- Contraseña: `123456`

> **Nota:** La app está en Render free tier. Después de 15 minutos sin actividad se pausa. Cualquier click la reactiva automáticamente.

---

## 📋 Contenido

- [Acceso Rápido](#-acceso-rápido)
- [Características](#-características)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Cómo Usar](#-cómo-usar)
- [Seguridad](#-seguridad)
- [Tecnologías](#-tecnologías)
- [Deployment](#-deployment)

---

## ✨ Características

- ✅ **Autenticación de 4 niveles**: Super Admin, Admin, Operador, Visualizador
- ✅ **Multi-tenant**: Gestión de múltiples empresas con aislamiento total de datos
- ✅ **Gestión de usuarios**: CRUD completo con asignación de roles por empresa
- ✅ **Impresoras**: Registro y seguimiento de dispositivos por empresa
- ✅ **Trabajos de impresión**: Seguimiento con carga de archivos y metadatos
- ✅ **Análisis de consumo**: Dashboard en tiempo real con estadísticas
- ✅ **Interfaz profesional**: Diseño responsivo Material Design/Fluent Design
- ✅ **Completamente en español**: UI 100% en español
- ✅ **Deployado en producción**: Usando Render.com con PostgreSQL persistente

---

## 🏗️ Estructura del Proyecto

```
SentinelPro/
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
│   ├── index.ts             # Punto de entrada
│   ├── routes.ts            # Rutas API REST
│   ├── storage.ts           # Capa de almacenamiento (Drizzle ORM)
│   ├── middleware/          # Autenticación, validación
│   └── vite.ts              # Integración Vite
│
├── shared/                   ← Código compartido
│   └── schema.ts            # Modelos Drizzle + esquemas Zod
│
├── package.json             # Dependencias
├── tsconfig.json
├── vite.config.ts           # Build & dev server
├── drizzle.config.ts        # ORM configuration
├── tailwind.config.ts       # Estilos Tailwind
└── README.md                # Este archivo
```

---

## 🖥️ Cómo Usar

Visita: **https://sentinelpro.onrender.com**

```
1. Abre el navegador
2. Ve a https://sentinelpro.onrender.com
3. Login con credenciales:
   - Usuario: sentinelpro
   - Contraseña: 123456
4. ¡Explora la plataforma!
```
**Scripts Disponibles:**
- `npm run dev` - Desarrollo local
- `npm run build` - Build para producción
- `npm run start` - Inicia app compilada
- `npm run db:push` - Sincroniza base de datos

---

## 🔐 Seguridad

### Autenticación
- **JWT Tokens**: Autenticación sin estado (stateless)
- **bcrypt**: Hashing seguro de contraseñas
- **Session Persistence**: Sesiones en PostgreSQL

### Autorización
- **RBAC**: Role-Based Access Control (4 roles)
- **Validación por Rol**: Verificación servidor-side en cada endpoint
- **Multi-tenant**: Aislamiento garantizado por companyId

### Protección de Datos
- **Filtrado Automático**: Cada query filtra por empresa del usuario
- **CSRF Protection**: Cookies con sameSite="strict"
- **Input Validation**: Zod schemas en todos los endpoints
- **HTTPS**: Todo tráfico encriptado en Render

### Credenciales Seguras
- `SESSION_SECRET`: Variable de ambiente protegida
- `DATABASE_URL`: Credenciales PostgreSQL encriptadas
- Nunca se exponen secretos en logs

---

## 📊 Tecnologías

### Frontend
- **React 18** + TypeScript para interfaz moderna
- **Tailwind CSS** para estilos responsivos
- **Shadcn/UI** componentes accesibles y consistentes
- **TanStack React Query** gestión de estado del servidor
- **Wouter** routing ligero
- **React Hook Form** + Zod para validación de formularios

### Backend
- **Express.js** servidor web con TypeScript
- **Drizzle ORM** para queries seguras a BD
- **Multer** para cargas de archivos
- **bcrypt** para hashing de contraseñas
- **JWT** para autenticación sin estado

### Base de Datos
- **PostgreSQL** en Neon (serverless, escalable)
- **Connection Pooling** para manejo eficiente
- **Drizzle Kit** para migraciones automáticas

### Deployment
- **Render.com** hosting con auto-deploy desde GitHub
- **Node.js Runtime** en contenedor
- **PostgreSQL Database** persistente
- **HTTPS/TLS** automático

---

## 👤 Roles de Usuario

| Rol | Empresa | Usuarios | Impresoras | Trabajos | Consumo | Admin |
|-----|---------|----------|-----------|----------|---------|-------|
| **Super Admin** | Global | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | Su empresa | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Operador** | Su empresa | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Visualizador** | Su empresa | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 🚀 Deployment

### Deployment Actual (Render)

**URL Live:** https://sentinelpro.onrender.com

**Configuración en Render:**
- **Service Type:** Web Service
- **Build Command:** `npm install && npm run build`
- **Start Command:** `NODE_ENV=production node dist/index.js`
- **Environment Variables:**
  - `DATABASE_URL`: PostgreSQL connection string (Neon)
  - `SESSION_SECRET`: Cryptographic secret for sessions
  - `NODE_ENV`: production

**Cómo hacer re-deploy:**
1. Haz push a GitHub: `git push origin main`
2. Render automáticamente re-deploya
3. Espera 2-3 minutos
4. Accede a https://sentinelpro.onrender.com

### Para Desplegar Tú Mismo en Render

1. **Conecta GitHub a Render**
   - Ve a https://render.com
   - Crea una nueva "Web Service"
   - Conecta tu repositorio GitHub

2. **Configura variables de ambiente**
   - `DATABASE_URL`: Tu conexión PostgreSQL (Neon, AWS RDS, etc.)
   - `SESSION_SECRET`: Valor seguro aleatorio
   - `NODE_ENV`: production

3. **Click Deploy**
   - Render construye automáticamente
   - Espera 2-3 minutos
   - Tu app está viva en: `https://tu-servicio.onrender.com`

---

## 📝 Variables de Ambiente

### Requeridas para Producción

```env
# Base de Datos PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database

# Seguridad de Sesión
SESSION_SECRET=valor-super-secreto-aleatorio-muy-largo

# Entorno
NODE_ENV=production
```
## 🧪 Usuarios de Prueba

```
Super Admin:
- Usuario: sentinelpro
- Contraseña: 123456
- Acceso: TODO el sistema
```

## 🔗 Enlaces Importantes

- **App en vivo:** https://sentinelpro.onrender.com
- **Repositorio GitHub:** https://github.com/Blackand0/SentinelPro
- **Render Dashboard:** https://dashboard.render.com (si eres owner)
- **Neon Database:** https://neon.tech (administrar BD)

---

## 📜 Licencia

MIT License - Libre para usar, modificar y distribuir

---

## 👨‍💻 Autor

**Proyecto de Titulación**
- **Plataforma:** Sentinel Pro - Gestión de Impresoras para PyMEs
- **Año:** 2025
- **Presentación:** 20 minutos con demostración en vivo

---

**Última actualización:** Noviembre 2025  
**Versión:** 1.0.0 (Producción)  
**Estado:** ✅ Funcionando en Render.com
