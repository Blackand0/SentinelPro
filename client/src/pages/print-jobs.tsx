import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Filter, Search, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PrintJobWithDetails } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

export default function PrintJobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");

  const { data: jobs, isLoading } = useQuery<PrintJobWithDetails[]>({
    queryKey: ["/api/print-jobs"],
  });

  const filteredJobs = jobs?.filter((job) => {
    const matchesSearch =
      job.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.printer.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || job.status === statusFilter;

    const matchesColor =
      colorFilter === "all" || job.colorMode === colorFilter;

    return matchesSearch && matchesStatus && matchesColor;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Trabajos de Impresión</h1>
          <p className="text-muted-foreground mt-1">
            Ver y gestionar todos los trabajos de impresión
          </p>
        </div>
        <Button asChild data-testid="button-new-print-job">
          <a href="/print-jobs/new">
            <FileText className="mr-2 h-4 w-4" />
            Nuevo Trabajo
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos, usuarios o impresoras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                </SelectContent>
              </Select>
              <Select value={colorFilter} onValueChange={setColorFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-color-filter">
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="bw">B&N</SelectItem>
                  <SelectItem value="color">Color</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredJobs && filteredJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Impresora</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Páginas</TableHead>
                    <TableHead className="text-right">Tamaño</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.documentName}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.fileName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{job.user.fullName}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.printer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.printer.location}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(new Date(job.printedAt), "MMM d, yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(job.printedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {job.pageCount} × {job.copies}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatFileSize(job.fileSize)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {job.colorMode === "bw" ? "B&W" : "Color"}
                        </Badge>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(() => {
                            const filename = job.filePath.split('/').pop();
                            return (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-view-${job.id}`}
                                  asChild
                                >
                                  <a
                                    href={filename ? `/api/files/view/${filename}` : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-download-${job.id}`}
                                  asChild
                                >
                                  <a
                                    href={filename ? `/api/files/download/${filename}` : '#'}
                                    download
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">Sin trabajos encontrados</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all" || colorFilter !== "all"
                  ? "Intenta ajustar los filtros"
                  : "Comienza creando tu primer trabajo de impresión"}
              </p>
              {!searchQuery && statusFilter === "all" && colorFilter === "all" && (
                <Button asChild className="mt-4">
                  <a href="/print-jobs/new">Crear Trabajo</a>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
