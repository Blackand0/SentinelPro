import {
  LayoutDashboard,
  Printer,
  FileText,
  Users,
  BarChart3,
  Settings,
  Building2,
  Building,
  Wrench,
  Package,
  Droplets,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const { user, hasRole } = useAuth();
  const [location] = useLocation();

  const mainItems = [
    {
      title: "Panel",
      url: "/",
      icon: LayoutDashboard,
      roles: ["admin", "operator", "viewer", "super-admin"],
    },
    {
      title: "Trabajos de Impresion",
      url: "/print-jobs",
      icon: FileText,
      roles: ["admin", "operator", "viewer"],
    },
    {
      title: "Nuevo Trabajo",
      url: "/print-jobs/new",
      icon: Printer,
      roles: ["admin", "operator"],
    },
  ];

  const managementItems = [
    {
      title: "Empresas",
      url: "/companies",
      icon: Building2,
      roles: ["super-admin"],
    },
    {
      title: "Usuarios",
      url: "/users",
      icon: Users,
      roles: ["admin", "super-admin"],
    },
    {
      title: "Impresoras",
      url: "/printers",
      icon: Settings,
      roles: ["admin"],
    },
  ];

  const inventoryItems = [
    {
      title: "Insumos",
      url: "/paper-types",
      icon: Package,
      roles: ["admin"],
    },
    {
      title: "Toner e Tinta",
      url: "/toner-inventory",
      icon: Droplets,
      roles: ["admin"],
    },
    {
      title: "Periféricos",
      url: "/maintenance",
      icon: Wrench,
      roles: ["admin"],
    },
    {
      title: "Consumo",
      url: "/consumption",
      icon: BarChart3,
      roles: ["admin"],
    },
  ];

  const visibleMainItems = mainItems.filter((item) => hasRole(item.roles));
  const visibleManagementItems = managementItems.filter((item) =>
    hasRole(item.roles)
  );
  const visibleInventoryItems = inventoryItems.filter((item) =>
    hasRole(item.roles)
  );

  const shouldShowManagement = user?.role === "admin" || user?.role === "super-admin";
  const shouldShowInventory = user?.role === "admin";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super-admin":
        return "default";
      case "admin":
        return "default";
      case "operator":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super-admin":
        return "Super Admin";
      case "admin":
        return "Administrador";
      case "operator":
        return "Operador";
      case "viewer":
        return "Visualizador";
      default:
        return role;
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Sentinel Pro</h2>
            <p className="text-xs text-muted-foreground">Gestion de Impresion</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {shouldShowManagement && visibleManagementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administracion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleManagementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {shouldShowInventory && visibleInventoryItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Inventario y Reportes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleInventoryItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.fullName}
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant={getRoleBadgeVariant(user.role)}
                  className="text-xs"
                >
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
