import type { Metadata, Viewport } from "next";
import { Anybody, Roboto_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PIÙ — Pizza & Dolce",
    template: "%s · PIÙ",
  },
  description: "Pizza & Dolce.",
};

// Mobile first: ancho del dispositivo, contenido bajo el notch con safe areas, sin bloquear el zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e8e9d9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={cn("h-full antialiased", anybody.variable, robotoMono.variable)}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
