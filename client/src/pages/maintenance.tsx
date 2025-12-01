import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, DollarSign, Calendar } from "lucide-react";
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
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import type { MaintenanceLogWithDetails } from "@shared/schema";

const peripheralSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  category: z.enum(["purchase", "maintenance"]),
  cost: z.string().min(1, "El costo es requerido"),
  date: z.string().min(1, "La fecha es requerida"),
  notes: z.string().optional(),
});

type PeripheralFormData = z.infer<typeof peripheralSchema>;

const categoryLabels: Record<string, string> = {
  purchase: "Compra de Periférico",
  maintenance: "Mantenimiento",
};

export default function PeripheralsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceLogWithDetails | null>(null);
  const [deletingItem, setDeletingItem] = useState<MaintenanceLogWithDetails | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery<MaintenanceLogWithDetails[]>({
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

  const form = useForm<PeripheralFormData>({
    resolver: zodResolver(peripheralSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "purchase",
      cost: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PeripheralFormData) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/maintenance-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          printerId: "", // Empty for peripherals
          maintenanceType: data.category === "purchase" ? "purchase" : "maintenance",
          description: `${data.name}: ${data.description}`,
          cost: data.cost,
          status: "completed",
          scheduledDate: data.date,
          notes: data.notes,
        }),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      const result = res.json();
      
      // Register expense when creating peripheral
      await fetch("/api/consumption-expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          expenseType: "peripheral",
          amount: data.cost,
          description: `${data.category === "purchase" ? "Compra" : "Mantenimiento"}: ${data.name}`,
        }),
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/consumption"] });
      const category = form.getValues("category");
      toast({ 
        title: "Periférico registrado", 
        description: category === "purchase" ? "Compra registrada" : "Mantenimiento registrado"
      });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PeripheralFormData) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/maintenance-logs/${editingItem?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          printerId: editingItem?.printerId || "",
          maintenanceType: data.category === "purchase" ? "purchase" : "maintenance",
          description: `${data.name}: ${data.description}`,
          cost: data.cost,
          status: "completed",
          scheduledDate: data.date,
          notes: data.notes,
        }),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      const result = res.json();
      
      // Register additional expense if cost changed (difference)
      const oldCost = parseFloat(editingItem?.cost?.toString() || "0");
      const newCost = parseFloat(data.cost);
      if (newCost > oldCost) {
        const difference = newCost - oldCost;
        await fetch("/api/consumption-expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            expenseType: "peripheral",
            amount: difference,
            description: `Ajuste de costo: ${data.name}`,
          }),
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/consumption"] });
      toast({ title: "Actualizado", description: "Periférico actualizado" });
      setIsOpen(false);
      setEditingItem(null);
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
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      toast({ title: "Eliminado", description: "Periférico eliminado" });
      setDeletingItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (item: MaintenanceLogWithDetails) => {
    setEditingItem(item);
    const [name, ...descParts] = item.description.split(": ");
    const desc = descParts.join(": ") || item.description;
    form.reset({
      name: name || "",
      description: desc,
      category: item.maintenanceType === "purchase" ? "purchase" : "maintenance",
      cost: item.cost?.toString() || "",
      date: item.scheduledDate ? format(new Date(item.scheduledDate), "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
      notes: item.description,
    });
    setIsOpen(true);
  };

  const onSubmit = async (data: PeripheralFormData) => {
    if (editingItem) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const totalCost = items?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Periféricos</h1>
          <p className="text-muted-foreground mt-1">
            Registra compras y mantenimiento de periféricos (gastos reflejados en consumo mensual)
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingItem(null);
                form.reset({
                  name: "",
                  description: "",
                  category: "purchase",
                  cost: "",
                  date: new Date().toISOString().split("T")[0],
                  notes: "",
                });
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Periférico
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Periférico" : "Nuevo Periférico"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Periférico *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Ej: Tóner HP 85A, Cartucho Epson, Papel Fotográfico"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Tipo *</Label>
                <Select
                  value={form.watch("category")}
                  onValueChange={(value) => form.setValue("category", value as "purchase" | "maintenance")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Compra de Periférico</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Ej: Tóner HP 85A, Mantenimiento impresora X, etc."
                  rows={3}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Costo ($) *</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("cost")}
                    placeholder="0.00"
                  />
                  {form.formState.errors.cost && (
                    <p className="text-sm text-red-500">{form.formState.errors.cost.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha *</Label>
                  <Input
                    id="date"
                    type="date"
                    {...form.register("date")}
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Input
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Información adicional, proveedor, etc."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? "Guardar Cambios" : "Registrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">Cargando periféricos...</CardContent>
        </Card>
      ) : items?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No hay periféricos registrados. ¡Crea el primero!
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registro de Periféricos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.map((item) => {
                    const [name, ...descParts] = item.description.split(": ");
                    const desc = descParts.join(": ") || "";
                    return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{desc || item.description}</TableCell>
                      <TableCell>
                        <Badge variant={item.maintenanceType === "purchase" ? "default" : "secondary"}>
                          {item.maintenanceType === "purchase" ? "Compra" : "Mantenimiento"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${(item.cost || 0).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {item.scheduledDate ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(item.scheduledDate), "dd MMM yyyy", { locale: es })}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingItem(item)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de eliminación */}
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Periférico</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar "{deletingItem?.description}"? No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
