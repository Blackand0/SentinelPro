import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Printer as PrinterIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPrinterSchema } from "@shared/schema";
import type { Printer } from "@shared/schema";
import type { z } from "zod";
import { format } from "date-fns";

export default function PrintersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: printers, isLoading } = useQuery<Printer[]>({
    queryKey: ["/api/printers"],
  });

  const form = useForm<z.infer<typeof insertPrinterSchema>>({
    resolver: zodResolver(insertPrinterSchema),
    defaultValues: {
      name: "",
      location: "",
      model: "",
      ipAddress: "",
      status: "active",
    },
  });

  const createPrinterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertPrinterSchema>) => {
      return await apiRequest<Printer>("POST", "/api/printers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Impresora agregada",
        description: "La impresora se ha registrado exitosamente",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al agregar la impresora",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePrinterMutation = useMutation({
    mutationFn: async (printerId: string) => {
      return await apiRequest("DELETE", `/api/printers/${printerId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Impresora eliminada",
        description: "La impresora se ha eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar la impresora",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof insertPrinterSchema>) => {
    createPrinterMutation.mutate(data);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "maintenance":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Gestión de Impresoras</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona impresoras y sus configuraciones
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-printer">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Impresora
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nueva Impresora</DialogTitle>
              <DialogDescription>
                Agrega una nueva impresora al sistema para monitorear
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Impresora</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="HP LaserJet Pro"
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Oficina 2do Piso"
                          data-testid="input-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="LaserJet Pro MFP M428fdw"
                          data-testid="input-model"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ipAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección IP (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="192.168.1.100"
                          data-testid="input-ip"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                          <SelectItem value="maintenance">Mantenimiento</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPrinterMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createPrinterMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      "Agregar Impresora"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Impresoras</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : printers && printers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Dirección IP</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Agregada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printers.map((printer) => (
                    <TableRow key={printer.id} data-testid={`row-printer-${printer.id}`}>
                      <TableCell className="font-medium">
                        {printer.name}
                      </TableCell>
                      <TableCell>{printer.location}</TableCell>
                      <TableCell>{printer.model}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {printer.ipAddress || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(printer.status)}>
                          {printer.status === "active" ? "Activo" : printer.status === "inactive" ? "Inactivo" : "Mantenimiento"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(printer.createdAt), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-edit-${printer.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePrinterMutation.mutate(printer.id)}
                            disabled={deletePrinterMutation.isPending}
                            data-testid={`button-delete-${printer.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PrinterIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">Sin impresoras registradas</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega tu primera impresora para comenzar a registrar trabajos de impresión
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
