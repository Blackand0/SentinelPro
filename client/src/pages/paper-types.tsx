import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { PaperType } from "@shared/schema";

const paperTypeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  size: z.string().min(1, "El tamaño es requerido"),
  weight: z.string().min(1, "El gramaje es requerido"),
  color: z.string().default("white"),
  pricePerSheet: z.string().optional(),
  stock: z.string().optional(),
});

type PaperTypeFormData = z.infer<typeof paperTypeSchema>;

const sizeLabels: Record<string, string> = {
  letter: "Carta (Letter)",
  legal: "Oficio (Legal)",
  a4: "A4",
  a3: "A3",
  a5: "A5",
};

export default function PaperTypesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingType, setEditingType] = useState<PaperType | null>(null);
  const [deletingType, setDeletingType] = useState<PaperType | null>(null);
  const [adjustingStock, setAdjustingStock] = useState<PaperType | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: paperTypes, isLoading } = useQuery<PaperType[]>({
    queryKey: ["/api/paper-types"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/paper-types", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar inventario");
      return res.json();
    },
  });

  const form = useForm<PaperTypeFormData>({
    resolver: zodResolver(paperTypeSchema),
    defaultValues: {
      name: "",
      size: "letter",
      weight: "75",
      color: "white",
      pricePerSheet: "",
      stock: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PaperTypeFormData) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/paper-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          weight: parseInt(data.weight),
          stock: data.stock ? parseInt(data.stock) : 0,
        }),
      });
      if (!res.ok) throw new Error("Error al crear tipo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paper-types"] });
      toast({ title: "Insumo creado", description: "Se agregó nuevo tipo de papel" });
      form.reset();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PaperTypeFormData) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/paper-types/${editingType?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          weight: parseInt(data.weight),
        }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paper-types"] });
      toast({ title: "Actualizado", description: "Los cambios se guardaron" });
      form.reset();
      setEditingType(null);
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async () => {
      if (!adjustingStock) return;
      const token = localStorage.getItem("authToken");
      const newStock = adjustmentType === "add" 
        ? (adjustingStock.stock as number) + adjustmentQuantity
        : (adjustingStock.stock as number) - adjustmentQuantity;
      
      const res = await fetch(`/api/paper-types/${adjustingStock.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stock: newStock.toString(),
        }),
      });
      if (!res.ok) throw new Error("Error al ajustar");
      
      // Register expense when removing stock
      if (adjustmentType === "remove" && adjustingStock.pricePerSheet) {
        const expenseAmount = parseFloat(adjustingStock.pricePerSheet as unknown as string) * adjustmentQuantity;
        await fetch("/api/consumption-expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            expenseType: "paper_removal",
            amount: expenseAmount.toString(),
            description: `Consumo de ${adjustingStock.name}: ${adjustmentQuantity} resmas`,
          }),
        }).catch(e => console.error("Error registering expense:", e));
        
        // Invalidate consumption query to show updated expenses
        queryClient.invalidateQueries({ queryKey: ["/api/consumption"] });
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paper-types"] });
      toast({ 
        title: "Stock actualizado", 
        description: `${adjustmentType === "add" ? "Agregadas" : "Removidas"} ${adjustmentQuantity} resmas` 
      });
      setAdjustingStock(null);
      setAdjustmentQuantity(0);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo ajustar stock", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/paper-types/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paper-types"] });
      toast({ title: "Eliminado", description: "Se removió el insumo" });
      setDeletingType(null);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    },
  });

  const handleEdit = (type: PaperType) => {
    setEditingType(type);
    form.reset({
      name: type.name,
      size: type.size,
      weight: type.weight.toString(),
      color: type.color,
      pricePerSheet: type.pricePerSheet ? type.pricePerSheet.toString() : "",
      stock: type.stock ? type.stock.toString() : "",
    });
    setIsOpen(true);
  };

  const onSubmit = async (data: PaperTypeFormData) => {
    if (editingType) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Insumos</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingType(null);
                form.reset();
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Insumo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Editar Insumo" : "Nuevo Insumo"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" {...form.register("name")} placeholder="Ej: Resmas Blancas A4" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size">Tamaño</Label>
                  <Select
                    value={form.watch("size")}
                    onValueChange={(value) => form.setValue("size", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(sizeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="weight">Gramaje (g)</Label>
                  <Input id="weight" type="number" {...form.register("weight")} placeholder="75" />
                </div>
              </div>

              <div>
                <Label htmlFor="color">Color/Tipo</Label>
                <Select
                  value={form.watch("color")}
                  onValueChange={(value) => form.setValue("color", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">Blanco</SelectItem>
                    <SelectItem value="cream">Crema</SelectItem>
                    <SelectItem value="black">Negro</SelectItem>
                    <SelectItem value="cyan">Cian</SelectItem>
                    <SelectItem value="magenta">Magenta</SelectItem>
                    <SelectItem value="yellow">Amarillo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Precio ($)</Label>
                  <Input id="price" type="number" step="0.01" {...form.register("pricePerSheet")} placeholder="0.50" />
                </div>
                <div>
                  <Label htmlFor="stock">Stock (Resmas)</Label>
                  <Input id="stock" type="number" {...form.register("stock")} placeholder="0" />
                  {form.formState.errors.stock && (
                    <p className="text-red-500 text-sm">{form.formState.errors.stock.message}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingType ? "Guardar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">Cargando insumos...</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Inventario de Insumos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Gramaje</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paperTypes?.map((type) => (
                    <TableRow
                      key={type.id}
                      className={
                        (type.stock as number) <= 10
                          ? "bg-orange-50"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{sizeLabels[type.size] || type.size}</TableCell>
                      <TableCell>{type.weight}g</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {type.color}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${type.pricePerSheet ? parseFloat(type.pricePerSheet as unknown as string).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={
                          (type.stock as number) <= 10 ? "text-orange-600" : ""
                        }>
                          {type.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdjustingStock(type);
                              setAdjustmentType("add");
                              setAdjustmentQuantity(1);
                            }}
                            title="Agregar unidades"
                          >
                            <ArrowUp className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdjustingStock(type);
                              setAdjustmentType("remove");
                              setAdjustmentQuantity(1);
                            }}
                            title="Remover unidades"
                          >
                            <ArrowDown className="w-4 h-4 text-red-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(type)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingType(type)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo para ajustar stock */}
      <Dialog open={!!adjustingStock} onOpenChange={() => setAdjustingStock(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === "add" ? "➕ Agregar Unidades" : "➖ Remover Unidades"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Insumo: <strong>{adjustingStock?.name}</strong></Label>
            </div>
            <div>
              <Label>Stock Actual: <strong>{adjustingStock?.stock} unidades</strong></Label>
            </div>
            <div>
              <Label htmlFor="qty">Cantidad</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="bg-blue-50 p-3 rounded text-sm">
              Nuevo stock: <strong>{
                adjustmentType === "add"
                  ? (adjustingStock?.stock as number) + adjustmentQuantity
                  : (adjustingStock?.stock as number) - adjustmentQuantity
              } unidades</strong>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAdjustingStock(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => adjustStockMutation.mutate()}
                disabled={adjustStockMutation.isPending || adjustmentQuantity <= 0}
                className={adjustmentType === "add" ? "bg-green-600" : "bg-red-600"}
              >
                {adjustmentType === "add" ? "Agregar" : "Remover"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de eliminación */}
      <AlertDialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Insumo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar "{deletingType?.name}"? No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingType && deleteMutation.mutate(deletingType.id)}
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
