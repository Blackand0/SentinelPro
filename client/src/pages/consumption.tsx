import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, Droplet, PaperclipIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConsumptionStats } from "@shared/schema";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function ConsumptionPage() {
  const [period, setPeriod] = useState<string>("month");

  const { data: stats, isLoading } = useQuery<ConsumptionStats>({
    queryKey: ["/api/consumption", period],
    queryFn: async () => {
      return apiRequest<ConsumptionStats>("GET", `/api/consumption?period=${period}`);
    },
  });

  const consumptionCards = [
    {
      title: "Total de Trabajos",
      value: stats?.totalJobs || 0,
      icon: FileText,
      color: "text-chart-1",
      suffix: "trabajos",
    },
    {
      title: "Total de Páginas",
      value: stats?.totalPages || 0,
      icon: PaperclipIcon,
      color: "text-chart-2",
      suffix: "páginas",
    },
    {
      title: "Páginas B&N",
      value: stats?.totalBWPages || 0,
      icon: BarChart3,
      color: "text-chart-3",
      suffix: "páginas",
    },
    {
      title: "Gastos Mensuales",
      value: "$" + (stats?.totalExpenses || 0).toFixed(2),
      icon: Droplet,
      color: "text-chart-4",
      suffix: "periféricos + insumos",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Análisis de Consumo
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitorea el uso de papel e tinta en tu organización
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mes</SelectItem>
            <SelectItem value="quarter">Este Trimestre</SelectItem>
            <SelectItem value="year">Este Año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {consumptionCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div>
                  <div className="text-3xl font-bold" data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    {card.value.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.suffix}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consumo de Papel</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total de Hojas</span>
                    <span className="text-2xl font-bold">
                      {stats?.totalPaperUsed?.toLocaleString() || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Basado en {stats?.totalPages?.toLocaleString() || 0} páginas impresas
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Blanco y Negro
                      </span>
                      <span className="text-sm font-medium">
                        {stats?.totalBWPages || 0} páginas
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-chart-3 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            stats?.totalPages
                              ? (stats.totalBWPages / stats.totalPages) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Color</span>
                      <span className="text-sm font-medium">
                        {stats?.totalColorPages || 0} páginas
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-chart-4 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            stats?.totalPages
                              ? (stats.totalColorPages / stats.totalPages) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consumo Estimado de Tinta</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tinta Total (ml)</span>
                    <span className="text-2xl font-bold">
                      {stats?.estimatedInkUsed?.toLocaleString() || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimado basado en trabajos de impresión
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Droplet className="h-5 w-5 text-chart-4" />
                    <span className="font-medium">Desglose de Consumo</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tinta Negra</span>
                      <span className="font-medium">
                        {stats?.estimatedInkUsed
                          ? (stats.estimatedInkUsed * 0.6).toFixed(1)
                          : 0}{" "}
                        ml
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tinta Color</span>
                      <span className="font-medium">
                        {stats?.estimatedInkUsed
                          ? (stats.estimatedInkUsed * 0.4).toFixed(1)
                          : 0}{" "}
                        ml
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Nota:</strong> El consumo de tinta se estima en función de promedios de la industria. La impresión a color utiliza aproximadamente 3 veces más tinta que blanco y negro.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
