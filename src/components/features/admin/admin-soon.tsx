import { Eyebrow, Heading, Text } from "@/components/ui/typography"

function AdminSoon({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <Eyebrow>En desarrollo</Eyebrow>
      <Heading as="h1" size="h3">
        {title}
      </Heading>
      <Text tone="muted">{detail}</Text>
    </section>
  )
}

export { AdminSoon }
