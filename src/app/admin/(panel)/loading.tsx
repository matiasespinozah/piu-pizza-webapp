import { Skeleton } from "@/components/ui/skeleton"

export default function AdminSectionLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-4" aria-busy="true">
      <span className="sr-only">Cargando la sección</span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-48" />
    </div>
  )
}
