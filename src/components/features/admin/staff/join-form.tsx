"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { inMemoryPersistence, sendEmailVerification, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth"

import { Button } from "@/components/ui/button"
import { FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Heading, Text } from "@/components/ui/typography"
import { getClientAuth } from "@/lib/firebase/client-auth"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"

function JoinForm() {
  const [token, setToken] = useState("")
  const [email, setEmail] = useState("")
  const [accountExists, setAccountExists] = useState(false)
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [verifiedNote, setVerifiedNote] = useState(false)

  useEffect(() => {
    const secret = window.location.hash.replace(/^#/, "")
    if (!secret) {
      queueMicrotask(() => {
        setError("Abre el enlace completo de la invitación.")
        setReady(true)
      })
      return
    }
    void fetch("/api/admin/join", {
      method: "POST",
      headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
      body: JSON.stringify({ intent: "preview", token: secret }),
    })
      .then((response) => response.json())
      .then((result: { ok?: boolean; email?: string; accountExists?: boolean; message?: string }) => {
        setToken(secret)
        if (result.ok && result.email) {
          setEmail(result.email)
          setAccountExists(result.accountExists === true)
        } else setError(result.message || "Esta invitación no está disponible.")
        setReady(true)
      })
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !token) return
    setPending(true)
    setError("")
    const auth = getClientAuth()
    try {
      await setPersistence(auth, inMemoryPersistence)
      if (accountExists) {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
        const idToken = await credential.user.getIdToken(true)
        const response = await fetch("/api/admin/join", {
          method: "POST",
          headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
          body: JSON.stringify({ intent: "link", token, name, idToken }),
        })
        const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; emailVerified?: boolean } | null
        if (!result?.ok) {
          setError(result?.message || "No pudimos vincular la cuenta.")
          setPending(false)
          return
        }
        if (result.emailVerified !== true) await sendEmailVerification(credential.user).catch(() => undefined)
        setVerifiedNote(result.emailVerified !== true)
      } else {
        const response = await fetch("/api/admin/join", {
          method: "POST",
          headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
          body: JSON.stringify({ intent: "redeem", token, name, email, password }),
        })
        const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; emailVerified?: boolean } | null
        if (!result?.ok) {
          if (result?.message?.includes("Entra con tu contraseña")) setAccountExists(true)
          setError(result?.message || "No pudimos crear la cuenta.")
          setPending(false)
          return
        }
        if (result.emailVerified !== true) {
          const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
          await sendEmailVerification(credential.user).catch(() => undefined)
          setVerifiedNote(true)
        }
      }
      window.history.replaceState(null, "", "/admin/unirse")
      setPassword("")
      setDone(true)
    } catch {
      setError(accountExists ? "El correo o la contraseña no coinciden." : "No pudimos crear la cuenta.")
    } finally {
      await signOut(auth).catch(() => undefined)
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Heading as="h2" size="h4">
          Tu cuenta está pendiente de aprobación
        </Heading>
        <Text>
          {verifiedNote
            ? "Confirma el correo que te enviamos. El propietario no puede darte acceso hasta que esté verificado. Después la cuenta sigue pendiente de aprobación."
            : "Cuando el propietario la autorice, entra con este correo desde el acceso de empleados."}
        </Text>
        <Button asChild className="w-full">
          <Link href="/admin/login">Ir al ingreso</Link>
        </Button>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      <div>
        <FieldLabel htmlFor="join-name">Nombre</FieldLabel>
        <Input id="join-name" name="name" autoComplete="name" value={name} className="mt-2 bg-cream" onChange={(event) => setName(event.target.value)} />
      </div>
      <div>
        <FieldLabel htmlFor="join-email">Correo electrónico</FieldLabel>
        <Input
          id="join-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          readOnly
          value={email}
          className="mt-2 bg-cream"
        />
      </div>
      <div>
        <FieldLabel htmlFor="join-password">{accountExists ? "Contraseña actual" : "Contraseña"}</FieldLabel>
        {accountExists ? <Text tone="muted">Esta cuenta ya existe. Entra con tu contraseña actual. No la vamos a cambiar.</Text> : null}
        <div className="relative mt-2">
          <Input
            id="join-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={accountExists ? "current-password" : "new-password"}
            value={password}
            className="bg-cream pr-14"
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
      <FieldError>{error || null}</FieldError>
      <Button type="submit" className="w-full" loading={pending || !ready} disabled={!token || !email}>
        {pending ? (accountExists ? "Vinculando cuenta" : "Creando cuenta") : accountExists ? "Vincular mi cuenta" : "Crear cuenta"}
      </Button>
    </form>
  )
}

export { JoinForm }
