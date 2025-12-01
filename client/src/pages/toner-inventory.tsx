import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import type { TonerInventory } from "@shared/schema";

const tonerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  brand: z.string().min(1, "La marca es requerida"),
  model: z.string().min(1, "El modelo es requerido"),
  color: z.enum(["black", "cyan", "magenta", "yellow", "tricolor"]),
  stock: z.string().default("0"),
  minStock: z.string().default("5"),
  pricePerUnit: z.string().optional(),
});

type TonerFormData = z.infer<typeof tonerSchema>;

const colorLabels: Record<string, string> = {
  black: "Negro",
  cyan: "Cian",
  magenta: "Magenta",
  yellow: "Amarillo",
  tricolor: "Tricolor",
};

export default function TonerInventoryPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingToner, setEditingToner] = useState<TonerInventory | null>(null);
  const [deletingToner, setDeletingToner] = useState<TonerInventory | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tonerList, isLoading } = useQuery<TonerInventory[]>({
    queryKey: ["/api/toner-inventory"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/toner-inventory", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar inventario de toner");
      return res.json();
    },
  });

  const form = useForm<TonerFormData>({
    resolver: zodResolver(tonerSchema),
    defaultValues: {
      name: "",
      brand: "",
      model: "",
      color: "black",
      stock: "0",
      minStock: "5",
      pricePerUnit: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TonerFormData) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/toner-inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          stock: parseInt(data.stock),
          minStock: parseInt(data.minStock),
        }),
      });
      if (!res.ok) throw new Error("Error al crear toner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toner-inventory"] });
      toast({ title: "Toner creado", description: "El toner se agregó correctamente" });
      form.reset();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el toner", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TonerFormData) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/toner-inventory/${editingToner?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          stock: parseInt(data.stock),
          minStock: parseInt(data.minStock),
        }),
      });
      if (!res.ok) throw new Error("Error al actualizar toner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toner-inventory"] });
      toast({ title: "Toner actualizado", description: "Los cambios se guardaron" });
      form.reset();
      setEditingToner(null);
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el toner", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/toner-inventory/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al eliminar toner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toner-inventory"] });
      toast({ title: "Toner eliminado", description: "El registro se removió" });
      setDeletingToner(null);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el toner", variant: "destructive" });
    },
  });

  const handleEdit = (toner: TonerInventory) => {
    setEditingToner(toner);
    form.reset({
      name: toner.name,
      brand: toner.brand,
      model: toner.model,
      color: toner.color as any,
      stock: toner.stock.toString(),
      minStock: toner.minStock.toString(),
      pricePerUnit: toner.pricePerUnit?.toString() || "",
    });
    setIsOpen(true);
  };

  const onSubmit = async (data: TonerFormData) => {
    if (editingToner) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const [adjustingToner, setAdjustingToner] = useState<TonerInventory | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);

  const adjustStockMutation = useMutation({
    mutationFn: async () => {
      if (!adjustingToner) return;
      const token = localStorage.getItem("authToken");
      const newStock = adjustmentType === "add" 
        ? (adjustingToner.stock as number) + adjustmentQuantity
        : (adjustingToner.stock as number) - adjustmentQuantity;
      
      const res = await fetch(`/api/toner-inventory/${adjustingToner.id}`, {
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
      if (adjustmentType === "remove" && adjustingToner.pricePerUnit) {
        const expenseAmount = parseFloat(adjustingToner.pricePerUnit as unknown as string) * adjustmentQuantity;
        await fetch("/api/consumption-expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            expenseType: "toner_removal",
            amount: expenseAmount.toString(),
            description: `Consumo de ${adjustingToner.name}: ${adjustmentQuantity} unidades`,
          }),
        }).catch(e => console.error("Error registering expense:", e));
        
        queryClient.invalidateQueries({ queryKey: ["/api/consumption"] });
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toner-inventory"] });
      toast({ 
        title: "Stock actualizado", 
        description: `${adjustmentType === "add" ? "Agregadas" : "Removidas"} ${adjustmentQuantity} unidades` 
      });
      setAdjustingToner(null);
      setAdjustmentQuantity(0);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo ajustar stock", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventario de Toner</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingToner(null);
                form.reset();
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Toner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingToner ? "Editar Toner" : "Nuevo Toner"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" {...form.register("name")} placeholder="Ej: Cartridge HP 125A" />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" {...form.register("brand")} placeholder="Ej: HP, Canon, Xerox" />
                {form.formState.errors.brand && (
                  <p className="text-red-500 text-sm">{form.formState.errors.brand.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="model">Modelo</Label>
                <Input id="model" {...form.register("model")} placeholder="Ej: CF213A" />
                {form.formState.errors.model && (
                  <p className="text-red-500 text-sm">{form.formState.errors.model.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Select
                  value={form.watch("color")}
                  onValueChange={(value) => form.setValue("color", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(colorLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="stock">Stock Actual</Label>
                <Input id="stock" type="number" {...form.register("stock")} placeholder="0" />
              </div>


              <div>
                <Label htmlFor="pricePerUnit">Precio Unitario</Label>
                <Input id="pricePerUnit" {...form.register("pricePerUnit")} placeholder="$0.00" />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingToner ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">Cargando...</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Toneres Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tonerList?.map((toner) => (
                    <TableRow key={toner.id}>
                      <TableCell className="font-medium">{toner.name}</TableCell>
                      <TableCell>{toner.brand}</TableCell>
                      <TableCell>{toner.model}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {colorLabels[toner.color]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdjustingToner(toner);
                              setAdjustmentType("remove");
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            ↓
                          </Button>
                          <span className="w-8 text-center">{toner.stock}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdjustingToner(toner);
                              setAdjustmentType("add");
                            }}
                            className="text-green-500 hover:text-green-700"
                          >
                            ↑
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(toner.pricePerUnit?.toString() || "0").toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(toner)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingToner(toner)}
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

      {adjustingToner && (
        <Dialog open={!!adjustingToner} onOpenChange={() => setAdjustingToner(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {adjustmentType === "add" ? "Agregar Stock" : "Remover Stock"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Producto: {adjustingToner.name}</Label>
              </div>
              <div>
                <Label>Stock Actual: {adjustingToner.stock}</Label>
              </div>
              <div>
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAdjustingToner(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => adjustStockMutation.mutate()}
                  disabled={adjustStockMutation.isPending || adjustmentQuantity <= 0}
                  className={adjustmentType === "add" ? "bg-green-600" : "bg-red-600"}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deletingToner} onOpenChange={() => setDeletingToner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Toner</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar "{deletingToner?.name}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingToner && deleteMutation.mutate(deletingToner.id)}
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
