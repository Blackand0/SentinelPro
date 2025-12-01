# REQUERIMIENTOS FUNCIONALES - SENTINEL PRO

| ID | Nombre | Descripción |
|---|---|---|
| RF01 | Autenticación | Login/Logout con JWT + contraseña hasheada bcrypt |
| RF02 | Gestión de Empresas | Super admin crea, edita y elimina empresas (multi-tenant) |
| RF03 | Gestión de Usuarios | Admin crea usuarios, asigna roles y departamentos dentro empresa |
| RF04 | Control de Acceso | 4 roles: super-admin, admin, operator, viewer con permisos granulares |
| RF05 | Gestión de Impresoras | Admin: crear, editar, eliminar impresoras; define ubicación, modelo, estado |
| RF06 | Trabajos de Impresión | Operator: crear trabajos. Todos: ver historial con filtros y detalles |
| RF07 | Inventario Insumos | Admin: crear tipos de papel, definir precio/sheet, gestionar stock |
| RF08 | Consumo de Insumos | Sistema automático: remover stock cuando se usa papel en trabajos |
| RF09 | Inventario Tóner/Tinta | Admin: registrar cartuchos, marca, modelo, precio, stock mínimo |
| RF10 | Periféricos y Mantenimiento | Admin: registrar compras de equipos y mantenimiento preventivo/correctivo con costos |
| RF11 | Análisis de Consumo | Dashboard mensual: gráficos de gastos (maintenance + equipos + insumos + tóner) |
| RF12 | Exportación de Reportes | Admin: exportar datos a CSV para análisis externo |
| RF13 | Sistema de Alertas | Notificaciones: stock bajo, mantenimiento programado, impresoras inactivas |
| RF14 | Departamentos | Admin: organizar usuarios por área, asignar presupuesto |

---

**Total Requerimientos Funcionales:** 14  
**Cobertura:** 100% implementado
