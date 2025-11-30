import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
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
  size: z.string().min(1, "El tamano es requerido"),
  weight: z.string().min(1, "El gramaje es requerido"),
  color: z.string().default("white"),
  pricePerSheet: z.string().optional(),
  stock: z.string().default("0"),
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: paperTypes, isLoading } = useQuery<PaperType[]>({
    queryKey: ["/api/paper-types"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/paper-types", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar tipos de papel");
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
      stock: "0",
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
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paper-types"] });
      toast({ title: "Tipo de papel creado exitosamente" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PaperTypeFormData & { id: string }) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/paper-types/${data.id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/paper-types"] });
      toast({ title: "Tipo de papel actualizado exitosamente" });
      setIsOpen(false);
      setEditingType(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/paper-types/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/paper-types"] });
      toast({ title: "Tipo de papel eliminado exitosamente" });
      setDeletingType(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (type: PaperType) => {
    setEditingType(type);
    form.reset({
      name: type.name,
      size: type.size,
      weight: String(type.weight),
      color: type.color,
      pricePerSheet: type.pricePerSheet || "",
      stock: String(type.stock),
    });
    setIsOpen(true);
  };

  const openCreateDialog = () => {
    setEditingType(null);
    form.reset({ name: "", size: "letter", weight: "75", color: "white", pricePerSheet: "", stock: "0" });
    setIsOpen(true);
  };

  const onSubmit = (data: PaperTypeFormData) => {
    if (editingType) {
      updateMutation.mutate({ ...data, id: editingType.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive">Sin Stock</Badge>;
    if (stock < 100) return <Badge variant="secondary">Stock Bajo</Badge>;
    return <Badge variant="default">En Stock</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Tipos de Papel</h1>
          <p className="text-muted-foreground mt-1">
            Administra el inventario de papel
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo de Papel
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Editar Tipo de Papel" : "Nuevo Tipo de Papel"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Ej: Papel Bond Carta"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size">Tamano *</Label>
                  <Select
                    value={form.watch("size")}
                    onValueChange={(value) => form.setValue("size", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tamano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letter">Carta (Letter)</SelectItem>
                      <SelectItem value="legal">Oficio (Legal)</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="a3">A3</SelectItem>
                      <SelectItem value="a5">A5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Gramaje (g/m2) *</Label>
                  <Input
                    id="weight"
                    {...form.register("weight")}
                    placeholder="Ej: 75"
                    type="number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Select
                    value={form.watch("color")}
                    onValueChange={(value) => form.setValue("color", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">Blanco</SelectItem>
                      <SelectItem value="cream">Crema</SelectItem>
                      <SelectItem value="yellow">Amarillo</SelectItem>
                      <SelectItem value="blue">Azul</SelectItem>
                      <SelectItem value="green">Verde</SelectItem>
                      <SelectItem value="pink">Rosa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock (hojas)</Label>
                  <Input
                    id="stock"
                    {...form.register("stock")}
                    placeholder="Ej: 5000"
                    type="number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerSheet">Precio por Hoja</Label>
                <Input
                  id="pricePerSheet"
                  {...form.register("pricePerSheet")}
                  placeholder="Ej: 0.01"
                  type="number"
                  step="0.0001"
                />
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
                  {editingType ? "Guardar Cambios" : "Crear Tipo de Papel"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Inventario de Papel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando tipos de papel...
            </div>
          ) : paperTypes && paperTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tamano</TableHead>
                  <TableHead>Gramaje</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Precio/Hoja</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paperTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{sizeLabels[type.size] || type.size}</TableCell>
                    <TableCell>{type.weight} g/m2</TableCell>
                    <TableCell className="capitalize">{type.color}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {type.stock.toLocaleString()}
                        {getStockBadge(type.stock)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {type.pricePerSheet ? `$${parseFloat(type.pricePerSheet).toFixed(4)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingType(type)}
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
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">Sin tipos de papel</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega tipos de papel para controlar el inventario
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Tipo de Papel</AlertDialogTitle>
            <AlertDialogDescription>
              Estas seguro de eliminar el tipo de papel "{deletingType?.name}"?
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingType && deleteMutation.mutate(deletingType.id)}
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
