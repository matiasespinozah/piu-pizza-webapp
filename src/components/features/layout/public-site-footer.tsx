import { SiteFooter } from "@/components/features/layout/site-footer"
import { getPublicOpeningHours } from "@/server/reservations/public-hours"

async function PublicSiteFooter() {
  const hours = await getPublicOpeningHours()
  return <SiteFooter hours={hours} />
}

export { PublicSiteFooter }
