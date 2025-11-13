import { Typography } from "@/components/nowts/typography";
import { LogoSvg } from "@/components/svg/logo-svg";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import { ThemeToggle } from "@/features/theme/theme-toggle";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <LogoSvg size={32} />
          <Typography variant="large" className="font-mono hidden sm:block">
            WebPerfekt
          </Typography>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/#features"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Fonctionnalités
          </Link>
          <Link
            href="/#pricing"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Tarifs
          </Link>
          <Link
            href="/#faq"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            FAQ
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Button asChild>
            <Link href="/auth/signin">
              Se connecter
            </Link>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 mt-8">
                {/* Navigation Links */}
                <nav className="flex flex-col gap-4">
                  <Link
                    href="/#features"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    Fonctionnalités
                  </Link>
                  <Link
                    href="/#pricing"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    Tarifs
                  </Link>
                  <Link
                    href="/#faq"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    FAQ
                  </Link>
                </nav>

                {/* Mobile Actions */}
                <div className="flex flex-col gap-3">
                  <Button asChild className="w-full">
                    <Link href="/auth/signin">
                      Se connecter
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
