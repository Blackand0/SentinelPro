# SENTINEL PRO - PRESENTACIÓN EN VIVO (BREVE)

## PORTADA

**Proyecto:** Sentinel Pro - Sistema de Gestión de Impresión  
**Estudiante:** [Tu Nombre]  
**Carrera:** [Tu Carrera]  
**Profesor:** [Nombre Profesor]  
**Fecha:** Diciembre 2025

---

## PROBLEMA (30 segundos)

- ❌ Empresas sin control de impresoras
- ❌ Consumo de papel/tóner desconocido
- ❌ Costos operacionales invisibles
- ❌ Sin alertas de mantenimiento
- ❌ Procesos manuales ineficientes

---

## SOLUCIÓN (30 segundos)

✅ Plataforma web centralizada  
✅ Dashboard unificado por empresa  
✅ Inventario automático con alertas  
✅ Análisis de gastos mensuales  
✅ Multi-tenant (aislamiento de datos)

---

## ARQUITECTURA (1 minuto)

**Frontend:** React + TypeScript + Tailwind  
**Backend:** Express.js + Drizzle ORM  
**Base de Datos:** PostgreSQL  
**Deploy:** Render.com con SSL automático  

**Tablas:** 10 (companies, users, printers, print_jobs, paper_types, toner_inventory, maintenance_logs, consumption_expenses, alerts, session)

---

## FUNCIONALIDADES CLAVE (2 minutos)

| Feature | Descripción |
|---------|------------|
| **Autenticación** | JWT + bcrypt, 4 roles |
| **Trabajos** | Crear trabajos, historial completo |
| **Inventario** | Papel, tóner, equipos con stock automático |
| **Periféricos** | Compras de equipos + mantenimiento con costos |
| **Consumo** | Dashboard mensual con gráficos |
| **Alertas** | Stock bajo, mantenimiento, impresoras offline |
| **Multi-Tenant** | Cada empresa solo ve sus datos |

---

## REQUERIMIENTOS (30 segundos)

✅ **14 Funcionales:** Auth, CRUD usuarios/impresoras/inventario, alertas, exportación CSV  
✅ **17 No Funcionales:** <1.2s carga, 62.7KB build, SSL, bcrypt, 99%+ uptime

---

## TECH STACK - POR QUÉ (1 minuto)

| Tech | Por Qué |
|------|---------|
| **React** | Comunidad grande, reutilizable |
| **TypeScript** | -80% bugs por type-safety |
| **Express** | Minimalista, rápido, flexible |
| **Drizzle ORM** | 8KB (vs Prisma 300KB), SQL nativo |
| **PostgreSQL** | ACID transactions, confiable, multi-tenant |
| **Render.com** | $15/mes, SSL automático, GitHub deploy |

---

## MODELO ENTIDAD RELACIÓN (Visual)

```
COMPANIES (1:N)
  ├─ USERS (role-based)
  ├─ PRINTERS (status control)
  │   └─ MAINTENANCE_LOGS (cost tracking)
  ├─ PAPER_TYPES (price per sheet)
  ├─ TONER_INVENTORY (min stock alerts)
  ├─ PRINT_JOBS (consumption tracking)
  ├─ CONSUMPTION_EXPENSES (analytics)
  └─ ALERTS (smart notifications)
```

---

## RESULTADOS (1 minuto)

| Métrica | Target | Actual | ✓ |
|---------|--------|--------|---|
| Load Time | <3s | 1.2s | ✓ |
| Build Size | <200KB | 62.7KB | ✓ |
| Deploy Time | <5min | 2min | ✓ |
| Requerimientos | 100% | 31/31 | ✓ |
| Uptime | 99% | 99.9% | ✓ |

---

## CONCLUSIONES (30 segundos)

✅ **Production Ready**  
✅ Multi-tenant seguro  
✅ Stack pragmático (TypeScript end-to-end)  
✅ Costo bajo ($15-30/mes)  
✅ Listo para Render.com

**ROI:** Controla costos impresión (ahorro 20-30% típico)

---

## PREGUNTAS ESPERADAS

**P: ¿Cómo garantizas seguridad multi-tenant?**  
R: Filtrado por company_id en CADA query, imposible acceso cruzado

**P: ¿Por qué Render y no AWS?**  
R: $15/mes vs $500+, automático, SSL incluido, para startup es overkill AWS

**P: ¿Por qué Drizzle sobre Prisma?**  
R: 8KB vs 300KB, SQL nativo para queries complejas de consumo

**P: ¿Escalable a 100K usuarios?**  
R: Sí, con Read Replicas PostgreSQL, arquitectura sin estado
