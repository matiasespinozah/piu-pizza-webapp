import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { HeartIcon, MenuIcon, ShoppingBagIcon, UserIcon } from "lucide-react"

import { CatalogEditor } from "@/components/features/admin/catalog/catalog-editor"
import { ProductImage } from "@/components/features/menu/product-image"
import { FloorEditor } from "@/components/features/admin/tables/floor-editor"
import { ReservationScreensPreview } from "@/components/features/reservations/reservation-screens-preview"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardMedia,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Container, Section, Stack } from "@/components/ui/layout"
import { Logo } from "@/components/ui/logo"
import { Price } from "@/components/ui/price"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TextLink } from "@/components/ui/text-link"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Caption, Display, Eyebrow, Heading, Lead, Text } from "@/components/ui/typography"
import { emptyDay } from "@/lib/reservations/day-policy"
import { defaultOperationRules } from "@/lib/reservations/operations"
import { ToastDemo } from "./toast-demo"

/**
 * Muestrario interno de componentes UI. Solo existe en desarrollo:
 * en producción responde 404. Contenido de ejemplo, no son productos reales.
 */
export const metadata: Metadata = {
  title: "Muestrario UI",
  robots: { index: false, follow: false },
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-12">
      <Eyebrow className="mb-6">{title}</Eyebrow>
      {children}
    </section>
  )
}

const sampleCategories = [
  {
    id: "muestra",
    slug: "muestra",
    name: "Categoría de muestra",
    description: "Texto de ejemplo del muestrario.",
    sortOrder: 1,
    isVisible: true,
  },
]

const sampleProducts = [
  {
    id: "muestra-1",
    categoryId: "muestra",
    name: "Producto de muestra",
    description: "Ejemplo del panel. No está en la carta.",
    priceClp: 1000,
    imageUrl: null,
    availability: "available" as const,
    isFeatured: false,
    isVisible: true,
    sortOrder: 1,
  },
  {
    id: "muestra-2",
    categoryId: "muestra",
    name: "Producto oculto de muestra",
    description: "",
    priceClp: 2000,
    imageUrl: null,
    availability: "unavailable" as const,
    isFeatured: true,
    isVisible: false,
    sortOrder: 2,
  },
]

export default function UiShowcasePage() {
  if (process.env.NODE_ENV === "production") notFound()

  return (
    <main>
      <Section spacing="sm">
        <Container>
          <Stack gap="sm">
            <Eyebrow>Interno · solo desarrollo</Eyebrow>
            <Heading as="h1" size="h2">
              Muestrario UI
            </Heading>
            <Lead>Todos los componentes de `src/components/ui` con sus variantes. Textos de ejemplo.</Lead>
          </Stack>

          <Block title="Tipografía">
            <Stack gap="lg">
              <Display>Pizza con carácter.</Display>
              <Heading as="h2" size="display-alt">
                Display alternativo
              </Heading>
              <Heading size="h2">Encabezado H2 de sección</Heading>
              <Heading size="h3">Encabezado H3 de subsección</Heading>
              <Heading size="h4">Título de tarjeta</Heading>
              <Lead>Entradilla editorial: un párrafo corto que introduce la sección con un tono cálido.</Lead>
              <Text className="max-w-prose">
                Cuerpo de texto. Anybody 400 a 16 px con interlineado 1,55 para lectura cómoda en móvil y
                desktop. Puede incluir un <TextLink href="#">enlace en línea</TextLink> dentro del párrafo.
              </Text>
              <Caption>Caption: información secundaria, 14 px.</Caption>
              <Eyebrow>Pizza &amp; Dolce</Eyebrow>
            </Stack>
          </Block>

          <Block title="Botones">
            <Stack gap="lg">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="tertiary">Terciario</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-olive p-4">
                <Button variant="accent">Terracota</Button>
                <Button variant="onPhoto">Sobre foto</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Pequeño</Button>
                <Button size="md">Mediano</Button>
                <Button size="lg">Grande</Button>
                <Button loading>Cargando</Button>
                <Button disabled>Deshabilitado</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button>
                  <ShoppingBagIcon /> Con ícono
                </Button>
                <Button size="icon" aria-label="Menú">
                  <MenuIcon />
                </Button>
                <Button size="icon" variant="secondary" aria-label="Favorito">
                  <HeartIcon />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Cuenta">
                  <UserIcon />
                </Button>
                <Button asChild variant="secondary">
                  <a href="#">Como enlace (asChild)</a>
                </Button>
              </div>
            </Stack>
          </Block>

          <Block title="Enlaces">
            <div className="flex flex-wrap items-center gap-8">
              <TextLink href="#" variant="nav">
                Navegación
              </TextLink>
              <TextLink href="#" variant="nav" aria-current="page">
                Activo
              </TextLink>
              <TextLink href="#" variant="standalone">
                Enlace suelto
              </TextLink>
              <TextLink href="https://example.com" variant="standalone" external>
                Externo
              </TextLink>
            </div>
          </Block>

          <Block title="Badges y precio">
            <Stack gap="lg">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Outline</Badge>
                <Badge variant="solid">Solid</Badge>
                <Badge variant="soft">Soft</Badge>
                <Badge size="md">Mediano</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <Price amount={12990} size="sm" />
                <Price amount={12990} />
                <Price amount={12990} size="lg" />
                <Price amount={9990} compareAt={12990} />
              </div>
            </Stack>
          </Block>

          <Block title="Cards">
            <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card interactive>
                <CardMedia ratio="4/5" />
                <CardHeader>
                  <CardTitle>Producto de ejemplo</CardTitle>
                  <CardDescription>Descripción corta de dos líneas como máximo.</CardDescription>
                </CardHeader>
                <CardFooter className="justify-between">
                  <Price amount={11990} />
                  <Button size="sm">Agregar</Button>
                </CardFooter>
              </Card>
              <Card variant="raised">
                <CardHeader>
                  <Eyebrow>Destacada</Eyebrow>
                  <CardTitle>Card raised</CardTitle>
                  <CardDescription>Superficie #F0F0E4 para jerarquía leve.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Text size="sm">Contenido de la tarjeta.</Text>
                </CardContent>
              </Card>
              <Stack gap="lg">
                <Card size="compact">
                  <CardHeader>
                    <CardTitle>Compacta</CardTitle>
                    <CardDescription>Radio 8 px, padding 16 px.</CardDescription>
                  </CardHeader>
                </Card>
                <Card size="feature">
                  <CardHeader>
                    <CardTitle>Feature</CardTitle>
                    <CardDescription>Radio 16 px, más aire.</CardDescription>
                  </CardHeader>
                </Card>
              </Stack>
            </div>
          </Block>

          <Block title="Imagen de producto">
            <div className="grid max-w-3xl items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <ProductImage src="/logos/logopiu.png" name="Americana" sizes="(max-width: 640px) 50vw, 220px" />
                <Caption className="mt-2">Fotografía válida</Caption>
              </div>
              <div>
                <ProductImage src={null} name="Pollo Espinaca" sizes="(max-width: 640px) 50vw, 220px" />
                <Caption className="mt-2">Sin fotografía</Caption>
              </div>
              <div>
                <ProductImage src="   " name="Caramel Funghi" sizes="(max-width: 640px) 50vw, 220px" />
                <Caption className="mt-2">Cadena vacía</Caption>
              </div>
              <div>
                <ProductImage src="/no-existe.webp" name="Margarita" sizes="(max-width: 640px) 50vw, 220px" />
                <Caption className="mt-2">Archivo inexistente</Caption>
              </div>
              <div>
                <ProductImage
                  src="https://example.com/no-permitida.jpg"
                  name="Calabresa"
                  sizes="(max-width: 640px) 50vw, 220px"
                />
                <Caption className="mt-2">URL remota no permitida</Caption>
              </div>
            </div>
          </Block>

          <Block title="Formularios">
            <FieldGroup className="max-w-md">
              <Field>
                <FieldLabel htmlFor="name">Nombre</FieldLabel>
                <Input id="name" placeholder="Tu nombre" />
              </Field>
              <Field data-invalid="true">
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" aria-invalid="true" defaultValue="correo@" aria-describedby="email-error" />
                <FieldError id="email-error">Ingresa un email válido.</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="notes">Comentarios</FieldLabel>
                <Textarea id="notes" placeholder="Algo que debamos saber" />
                <FieldDescription>Opcional. Máximo 300 caracteres.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="size">Tamaño</FieldLabel>
                <Select>
                  <SelectTrigger id="size" className="w-full">
                    <SelectValue placeholder="Elige un tamaño" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s">Individual</SelectItem>
                    <SelectItem value="m">Mediana</SelectItem>
                    <SelectItem value="l">Familiar</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="terms" />
                <FieldLabel htmlFor="terms">Acepto los términos</FieldLabel>
              </Field>
              <RadioGroup defaultValue="pickup">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="pickup" id="pickup" />
                  <Label htmlFor="pickup">Retiro en local</Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery">Despacho</Label>
                </div>
              </RadioGroup>
              <Input disabled placeholder="Deshabilitado" />
            </FieldGroup>
          </Block>

          <Block title="Tabs">
            <Tabs defaultValue="pizza">
              <TabsList>
                <TabsTrigger value="pizza">Pizza</TabsTrigger>
                <TabsTrigger value="dolce">Dolce</TabsTrigger>
              </TabsList>
              <TabsContent value="pizza" className="pt-4">
                <Text>Contenido de Pizza.</Text>
              </TabsContent>
              <TabsContent value="dolce" className="pt-4">
                <Text>Contenido de Dolce.</Text>
              </TabsContent>
            </Tabs>
          </Block>

          <Block title="Accordion">
            <Accordion type="single" collapsible className="max-w-2xl">
              <AccordionItem value="a">
                <AccordionTrigger>¿Pregunta frecuente de ejemplo?</AccordionTrigger>
                <AccordionContent>Respuesta de ejemplo con texto de lectura.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger>¿Otra pregunta?</AccordionTrigger>
                <AccordionContent>Otra respuesta.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </Block>

          <Block title="Overlays">
            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Abrir diálogo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Título del diálogo</DialogTitle>
                    <DialogDescription>Descripción breve de la acción.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter showCloseButton>
                    <Button>Confirmar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="secondary">Abrir sheet</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Menú</SheetTitle>
                    <SheetDescription>Panel lateral para navegación móvil o pedido.</SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">Dropdown</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Perfil</DropdownMenuItem>
                  <DropdownMenuItem>Pedidos</DropdownMenuItem>
                  <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" aria-label="Información">
                    ?
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tooltip de ejemplo</TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-6">
              <ToastDemo />
            </div>
          </Block>

          <Block title="Mesas del panel">
            <Text className="mb-4">Ejemplo. Guardar aquí no escribe en Firestore.</Text>
            <FloorEditor
              preview
              rules={defaultOperationRules()}
              date="2026-11-09"
              day={emptyDay("2026-11-09")}
              bookings={[]}
              pendingCount={0}
              confirmedCount={0}
              pendingTruncated={false}
            />
          </Block>

          <Block title="Reserva recibida y seguimiento">
            <Text className="mb-4">Ejemplo con datos ficticios. No consulta el servidor.</Text>
            <ReservationScreensPreview />
          </Block>

          <Block title="Carta del panel">
            <Text className="mb-4">
              Ejemplo del editor. Guardar llama al API local y pide sesión; estos nombres no están en la carta.
            </Text>
            <CatalogEditor categories={sampleCategories} products={sampleProducts} />
          </Block>

          <Block title="Feedback y utilidades">
            <Stack gap="lg">
              <div className="grid max-w-md gap-3">
                <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Separator />
              <Logo />
            </Stack>
          </Block>
        </Container>
      </Section>
    </main>
  )
}
