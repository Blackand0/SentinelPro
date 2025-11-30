import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Printer, Loader2 } from "lucide-react";
import { insertUserSchema } from "@shared/schema";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import type { z } from "zod";

export default function RegisterPage() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const form = useForm<z.infer<typeof insertUserSchema>>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      fullName: "",
      role: "operator",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertUserSchema>) => {
      return await apiRequest<{ok: boolean; token: string}>("POST", "/api/auth/register", data);
    },
    onSuccess: async (response) => {
      // Save JWT token to localStorage
      localStorage.setItem("authToken", response.token);
      await login();
      toast({
        title: "Registro exitoso",
        description: "¡Bienvenido a Sentinel Pro!",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error en el registro",
        description: error.message || "No se pudo crear la cuenta",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof insertUserSchema>) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Printer className="h-8 w-8" />
          </div>
          <div>
            <CardTitle className="font-display text-3xl">Crear Cuenta</CardTitle>
            <CardDescription className="mt-2">
              Únete a Sentinel Pro para gestionar operaciones de impresión
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Juan Pérez"
                        data-testid="input-fullname"
                        autoComplete="name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="juan@ejemplo.com"
                        data-testid="input-email"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="juanperez"
                        data-testid="input-username"
                        autoComplete="username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Crea una contraseña segura"
                        data-testid="input-password"
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormDescription>
                      Debe tener al menos 6 caracteres
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  "Crear Cuenta"
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <a
                href="/login"
                className="font-medium text-primary hover:underline"
                data-testid="link-login"
              >
                Inicia sesión
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
