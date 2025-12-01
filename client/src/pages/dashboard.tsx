import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, FileText, Users, Printer, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { DashboardStats } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  const statCards = user?.role === "super-admin" 
    ? [
        {
          title: "Admins Activos",
          value: stats?.totalUsers || 0,
          icon: Users,
          color: "text-chart-2",
        },
        {
          title: "Empresas Activas",
          value: stats?.totalCompanies || 0,
          icon: FileText,
          color: "text-chart-1",
        },
      ]
    : user?.role === "admin"
    ? [
        {
          title: "Usuarios Activos",
          value: stats?.totalUsers || 0,
          icon: Users,
          color: "text-chart-2",
        },
        {
          title: "Impresoras Activas",
          value: stats?.totalPrinters || 0,
          icon: Printer,
          color: "text-chart-3",
        },
      ]
    : [
        {
          title: "Total Trabajos",
          value: stats?.totalPrintJobs || 0,
          icon: FileText,
          color: "text-chart-1",
        },
        {
          title: "Impresoras Activas",
          value: stats?.totalPrinters || 0,
          icon: Printer,
          color: "text-chart-3",
        },
        {
          title: "Páginas Este Mes",
          value: stats?.totalPagesThisMonth || 0,
          icon: TrendingUp,
          color: "text-chart-4",
        },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
          Panel de Control
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumen de tu sistema de gestión de impresión
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold" data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  {card.value.toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(user?.role === "operator" || user?.role === "viewer") && (
      <Card>
        <CardHeader>
          <CardTitle>Trabajos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats?.recentJobs && stats.recentJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Impresora</TableHead>
                    <TableHead>Páginas</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentJobs.map((job) => (
                    <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                      <TableCell className="font-medium">
                        {job.documentName}
                      </TableCell>
                      <TableCell>{job.user.fullName}</TableCell>
                      <TableCell>{job.printer.name}</TableCell>
                      <TableCell>{job.pageCount}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(job.printedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            job.status === "completed"
                              ? "default"
                              : job.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {job.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">Sin trabajos aún</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Los trabajos aparecerán aquí cuando los usuarios comiencen a imprimir
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      )}

    </div>
  );
}
