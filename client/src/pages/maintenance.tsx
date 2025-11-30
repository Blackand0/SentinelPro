import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Wrench, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { MaintenanceLogWithDetails, Printer } from "@shared/schema";

const maintenanceSchema = z.object({
  printerId: z.string().min(1, "Selecciona una impresora"),
  maintenanceType: z.string().min(1, "Selecciona un tipo"),
  description: z.string().min(1, "La descripcion es requerida"),
  cost: z.string().optional(),
  status: z.string().default("pending"),
  scheduledDate: z.string().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

const typeLabels: Record<string, string> = {
  preventive: "Preventivo",
  corrective: "Correctivo",
  emergency: "Emergencia",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En Progreso",
  completed: "Completado",
  cancelled: "Cancelado",
};

export default function PeripheralsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLogWithDetails | null>(null);
  const [deletingLog, setDeletingLog] = useState<MaintenanceLogWithDetails | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: maintenanceLogs, isLoading } = useQuery<MaintenanceLogWithDetails[]>({
    queryKey: ["/api/maintenance-logs"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/maintenance-logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar periféricos");
      return res.json();
    },
  });

  const { data: printers } = useQuery<Printer[]>({
    queryKey: ["/api/printers"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/printers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar impresoras");
      return res.json();
    },
  });

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      printerId: "",
      maintenanceType: "preventive",
      description: "",
      cost: "",
      status: "pending",
      scheduledDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/maintenance-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      toast({ title: "Periférico registrado", description: "Gasto incluido en consumo mensual" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MaintenanceFormData & { id: string }) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/maintenance-logs/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      toast({ title: "Periférico actualizado", description: "Gasto incluido en consumo mensual" });
      setIsOpen(false);
      setEditingLog(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/maintenance-logs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      toast({ title: "Registro eliminado exitosamente" });
      setDeletingLog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (log: MaintenanceLogWithDetails) => {
    setEditingLog(log);
    form.reset({
      printerId: log.printerId,
      maintenanceType: log.maintenanceType,
      description: log.description,
      cost: log.cost || "",
      status: log.status,
      scheduledDate: log.scheduledDate ? new Date(log.scheduledDate).toISOString().split("T")[0] : "",
    });
    setIsOpen(true);
  };

  const openCreateDialog = () => {
    setEditingLog(null);
    form.reset({
      printerId: "",
      maintenanceType: "preventive",
      description: "",
      cost: "",
      status: "pending",
      scheduledDate: "",
    });
    setIsOpen(true);
  };

  const onSubmit = (data: MaintenanceFormData) => {
    if (editingLog) {
      updateMutation.mutate({ ...data, id: editingLog.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Completado</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> En Progreso</Badge>;
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendiente</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "emergency":
        return <Badge variant="destructive">{typeLabels[type]}</Badge>;
      case "corrective":
        return <Badge variant="secondary">{typeLabels[type]}</Badge>;
      default:
        return <Badge variant="outline">{typeLabels[type]}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">⚙️ Periféricos</h1>
          <p className="text-muted-foreground mt-1">
            Registra compras y mantenimiento de periféricos (gastos reflejados en consumo mensual)
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Periférico
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingLog ? "Editar Periférico" : "Nuevo Periférico"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="printerId">Impresora *</Label>
                <Select
                  value={form.watch("printerId")}
                  onValueChange={(value) => form.setValue("printerId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar impresora" />
                  </SelectTrigger>
                  <SelectContent>
                    {printers?.map((printer) => (
                      <SelectItem key={printer.id} value={printer.id}>
                        {printer.name} - {printer.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.printerId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.printerId.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maintenanceType">Tipo *</Label>
                  <Select
                    value={form.watch("maintenanceType")}
                    onValueChange={(value) => form.setValue("maintenanceType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventivo</SelectItem>
                      <SelectItem value="corrective">Correctivo</SelectItem>
                      <SelectItem value="emergency">Emergencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) => form.setValue("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_progress">En Progreso</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripcion *</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Describe el trabajo de mantenimiento..."
                  rows={3}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Costo</Label>
                  <Input
                    id="cost"
                    {...form.register("cost")}
                    placeholder="Ej: 15000"
                    type="number"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Fecha Programada</Label>
                  <Input
                    id="scheduledDate"
                    {...form.register("scheduledDate")}
                    type="date"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingLog ? "Guardar Cambios" : "Crear Registro"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Registros de Mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando registros...
            </div>
          ) : maintenanceLogs && maintenanceLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Impresora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.printer.name}
                      <div className="text-xs text-muted-foreground">{log.printer.location}</div>
                    </TableCell>
                    <TableCell>{getTypeBadge(log.maintenanceType)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{log.description}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      {log.cost ? `$${parseFloat(log.cost).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(log)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingLog(log)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">Sin registros de mantenimiento</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega registros para controlar el mantenimiento de las impresoras
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingLog} onOpenChange={() => setDeletingLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Estas seguro de eliminar este registro de mantenimiento?
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLog && deleteMutation.mutate(deletingLog.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
