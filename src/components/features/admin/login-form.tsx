"use client"

import { useState, type FormEvent } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth"

import { Button } from "@/components/ui/button"
import { FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getClientAuth } from "@/lib/firebase/client-auth"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"

type LoginMessage = {
  text: string
}

function messageForFirebase(code: string): LoginMessage {
  if (code === "auth/user-disabled") {
    return { text: "Esta cuenta está deshabilitada. Pide ayuda al propietario." }
  }
  if (code === "auth/too-many-requests") {
    return { text: "Demasiados intentos. Espera un momento y vuelve a intentar." }
  }
  if (code === "auth/network-request-failed") {
    return { text: "No hay conexión con el servicio de acceso. Revisa tu red e inténtalo de nuevo." }
  }
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-email"
  ) {
    return { text: "El correo o la contraseña no son correctos." }
  }
  return { text: "No pudimos iniciar sesión. Inténtalo de nuevo." }
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const nextEmail = email.trim()
    if (!nextEmail.includes("@") || password.length === 0) {
      setError("Ingresa el correo y la contraseña.")
      return
    }

    setPending(true)
    setError("")
    const auth = getClientAuth()

    try {
      await setPersistence(auth, inMemoryPersistence)
      const credential = await signInWithEmailAndPassword(auth, nextEmail, password)
      const idToken = await credential.user.getIdToken(true)
      const response = await fetch("/admin/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [adminRequestHeader]: adminRequestValue,
        },
        body: JSON.stringify({ idToken }),
      })

      if (response.status === 403) {
        setError("Esta cuenta no tiene acceso al panel.")
        return
      }
      if (!response.ok) {
        setError("El correo o la contraseña no son correctos.")
        return
      }

      // La cookie httpOnly tiene que viajar en el próximo documento.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa para leer la cookie
      window.location.assign("/admin")
    } catch (caught) {
      const code = typeof caught === "object" && caught && "code" in caught ? String(caught.code) : ""
      if (code === "auth/network-request-failed" || caught instanceof TypeError) {
        setError("No hay conexión con el servicio de acceso. Revisa tu red e inténtalo de nuevo.")
        return
      }
      setError(messageForFirebase(code).text)
    } finally {
      await signOut(auth).catch(() => undefined)
      setPending(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" method="post" action="/admin/login" onSubmit={onSubmit} noValidate>
      <div>
        <FieldLabel htmlFor="admin-email">Correo electrónico</FieldLabel>
        <Input
          id="admin-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          value={email}
          className="mt-2 bg-cream"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "admin-login-error" : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div>
        <FieldLabel htmlFor="admin-password">Contraseña</FieldLabel>
        <div className="relative mt-2">
          <Input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            className="bg-cream pr-14"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "admin-login-error" : undefined}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0"
            aria-pressed={showPassword}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </div>

      <FieldError id="admin-login-error">{error || null}</FieldError>

      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Iniciando sesión" : "Iniciar sesión"}
      </Button>
    </form>
  )
}

export { LoginForm }
