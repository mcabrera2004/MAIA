"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { login, register, getAuthConfig } from "@/lib/api/client";
import type { UserRole, AuthConfig } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  role: UserRole;
}

export function AuthForm({ role }: AuthFormProps) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    getAuthConfig().then(setAuthConfig).catch(console.error);
  }, []);

  const passwordRequirements = authConfig?.password_requirements;

  const validatePassword = (pass: string) => {
    if (!passwordRequirements) return true;
    
    const { min_length, require_uppercase, require_lowercase, require_numbers, require_special_characters, special_characters_allowed } = passwordRequirements;
    
    if (pass.length < min_length) return false;
    if (require_uppercase && !/[A-Z]/.test(pass)) return false;
    if (require_lowercase && !/[a-z]/.test(pass)) return false;
    if (require_numbers && !/[0-9]/.test(pass)) return false;
    if (require_special_characters) {
      const specialRegex = new RegExp(`[${special_characters_allowed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`);
      if (!specialRegex.test(pass)) return false;
    }
    
    return true;
  };

  const isPasswordValid = isLogin || validatePassword(password);

  const roleLabel = role === "profesor" ? "Profesor" : "Alumno";
  const redirectPath = role === "profesor" ? "/profesor" : "/alumno";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isLogin && password !== confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }

    if (!isLogin && !validatePassword(password)) {
      setError("La contraseña no cumple con los requisitos de seguridad");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await login(email, password);
        if (response.role !== role) {
          setError(`Esta cuenta es de ${response.role}, no de ${role}`);
          return;
        }
        setUser(response.access_token, response.role, email);
      } else {
        const response = await register({ email, password, role });
        setUser(response.token.access_token, response.role, email);
      }
      router.push(redirectPath);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error de conexion. Verifica que el servidor este activo.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {isLogin ? "Iniciar Sesion" : "Registrarse"}
        </CardTitle>
        <CardDescription>
          Accede como {roleLabel}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              type="password"
              placeholder={passwordRequirements ? `Min ${passwordRequirements.min_length} caracteres...` : "Tu contraseña"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={passwordRequirements?.min_length ?? 8}
            />
            {!isLogin && passwordRequirements && (
              <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-1 duration-300">
                <RequirementItem 
                  met={password.length >= passwordRequirements.min_length} 
                  text={`${passwordRequirements.min_length}+ caracteres`} 
                />
                {passwordRequirements.require_uppercase && (
                   <RequirementItem met={/[A-Z]/.test(password)} text="Mayúscula" />
                )}
                {passwordRequirements.require_lowercase && (
                   <RequirementItem met={/[a-z]/.test(password)} text="Minúscula" />
                )}
                {passwordRequirements.require_numbers && (
                   <RequirementItem met={/[0-9]/.test(password)} text="Número" />
                )}
                {passwordRequirements.require_special_characters && (
                   <RequirementItem 
                    met={new RegExp(`[${passwordRequirements.special_characters_allowed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password)} 
                    text="Especial" 
                  />
                )}
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite tu contrasena"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || (!isLogin && !isPasswordValid)}
          >
            {isLoading && <Spinner className="mr-2 h-4 w-4" />}
            {isLogin ? "Iniciar Sesion" : "Crear Cuenta"}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            {isLogin ? "No tienes cuenta?" : "Ya tienes cuenta?"}{" "}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              disabled={isLoading}
            >
              {isLogin ? "Registrate" : "Inicia Sesion"}
            </button>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-[11px] font-medium transition-colors duration-200",
      met ? "text-emerald-500" : "text-muted-foreground/70"
    )}>
      <div className={cn(
        "flex items-center justify-center w-4 h-4 rounded-full border transition-all duration-200",
        met ? "bg-emerald-500/10 border-emerald-500/50" : "bg-muted border-muted-foreground/30"
      )}>
        {met ? <Check className="w-2.5 h-2.5" /> : <div className="w-1 h-1 bg-muted-foreground/40 rounded-full" />}
      </div>
      <span>{text}</span>
    </div>
  );
}
