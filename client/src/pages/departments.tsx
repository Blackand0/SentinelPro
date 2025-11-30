import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import type { Department } from "@shared/schema";

const departmentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  budget: z.string().optional(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

export default function DepartmentsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/departments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar departamentos");
      return res.json();
    },
  });

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/departments", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Departamento creado exitosamente" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DepartmentFormData & { id: string }) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/departments/${data.id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Departamento actualizado exitosamente" });
      setIsOpen(false);
      setEditingDept(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/departments/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Departamento eliminado exitosamente" });
      setDeletingDept(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    form.reset({
      name: dept.name,
      description: dept.description || "",
      budget: dept.budget || "",
    });
    setIsOpen(true);
  };

  const openCreateDialog = () => {
    setEditingDept(null);
    form.reset({ name: "", description: "", budget: "" });
    setIsOpen(true);
  };

  const onSubmit = (data: DepartmentFormData) => {
    if (editingDept) {
      updateMutation.mutate({ ...data, id: editingDept.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los departamentos de tu empresa
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Departamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingDept ? "Editar Departamento" : "Nuevo Departamento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Ej: Recursos Humanos"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripcion</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Descripcion del departamento"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Presupuesto Mensual</Label>
                <Input
                  id="budget"
                  {...form.register("budget")}
                  placeholder="Ej: 50000"
                  type="number"
                  step="0.01"
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
                  {editingDept ? "Guardar Cambios" : "Crear Departamento"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Lista de Departamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando departamentos...
            </div>
          ) : departments && departments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Presupuesto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{dept.description || "-"}</TableCell>
                    <TableCell>
                      {dept.budget ? `$${parseFloat(dept.budget).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingDept(dept)}
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
              <Building className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">Sin departamentos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Crea el primer departamento para tu empresa
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingDept} onOpenChange={() => setDeletingDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Departamento</AlertDialogTitle>
            <AlertDialogDescription>
              Estas seguro de eliminar el departamento "{deletingDept?.name}"?
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDept && deleteMutation.mutate(deletingDept.id)}
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
