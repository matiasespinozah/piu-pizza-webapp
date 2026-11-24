"use client"

import { VisitMeter } from "@/components/features/metrics/visit-meter"

/** La carta usa el mismo medidor que el inicio: una escritura al salir. */
function CartaVisitMeter() {
  return <VisitMeter surface="carta" />
}

export { CartaVisitMeter }
