import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { insertPrintJobSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { Printer, PrintJob } from "@shared/schema";
import type { z } from "zod";

export default function NewPrintJobPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: printers } = useQuery<Printer[]>({
    queryKey: ["/api/printers"],
  });

  const form = useForm<z.infer<typeof insertPrintJobSchema>>({
    resolver: zodResolver(insertPrintJobSchema),
    defaultValues: {
      userId: user?.id || "",
      printerId: "",
      documentName: "",
      fileName: "",
      filePath: "",
      fileSize: 0,
      pageCount: 1,
      copies: 1,
      colorMode: "bw",
      paperSize: "letter",
      status: "completed",
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      return await fetch("/api/print-jobs", {
        method: "POST",
        headers,
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Failed to create print job");
        }
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/print-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Trabajo registrado",
        description: "El trabajo de impresión se ha registrado exitosamente",
      });
      setLocation("/print-jobs");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar trabajo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      form.setValue("fileName", file.name);
      form.setValue("fileSize", file.size);
      if (!form.getValues("documentName")) {
        form.setValue("documentName", file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const onSubmit = (data: z.infer<typeof insertPrintJobSchema>) => {
    if (!selectedFile) {
      toast({
        title: "Sin archivo seleccionado",
        description: "Por favor selecciona un archivo para cargar",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    createJobMutation.mutate(formData);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Nuevo Trabajo de Impresión</h1>
        <p className="text-muted-foreground mt-1">
          Registra un nuevo documento para imprimir
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="documentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Documento</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Reporte Financiero Q4"
                        data-testid="input-document-name"
                      />
                    </FormControl>
                    <FormDescription>
                      Un nombre descriptivo para este documento
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="printerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impresora</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-printer">
                          <SelectValue placeholder="Selecciona una impresora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {printers?.map((printer) => (
                          <SelectItem key={printer.id} value={printer.id}>
                            {printer.name} - {printer.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pageCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad de Páginas</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)
                          }
                          data-testid="input-page-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="copies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Copies</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)
                          }
                          data-testid="input-copies"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="colorMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-color-mode">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bw">Black & White</SelectItem>
                          <SelectItem value="color">Color</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paperSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paper Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-paper-size">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="letter">Letter (8.5" × 11")</SelectItem>
                          <SelectItem value="legal">Legal (8.5" × 14")</SelectItem>
                          <SelectItem value="a4">A4</SelectItem>
                          <SelectItem value="a3">A3</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-12 w-12 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedFile(null)}
                        data-testid="button-remove-file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <label htmlFor="file-upload">
                        <Button
                          type="button"
                          variant="outline"
                          asChild
                          data-testid="button-upload"
                        >
                          <span>Choose File</span>
                        </Button>
                      </label>
                      <Input
                        id="file-upload"
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        or drag and drop
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX, TXT, JPG, PNG up to 10MB
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/print-jobs")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createJobMutation.isPending || !selectedFile}
                  data-testid="button-submit"
                >
                  {createJobMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Print Job"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
