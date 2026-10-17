'use client';
/** The phone menu: the market search and every section, in a panel from the right. */
import { MenuIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MarketSearch } from './market-search';
import { NavLinks } from './nav-links';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-72 gap-0 overflow-y-auto"
        // Not the search box: focusing it would open a phone's keyboard over the menu.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>hlcharts</SheetTitle>
          <SheetDescription className="sr-only">Find a market or open a section.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-3">
          <MarketSearch fullWidth onNavigate={() => setOpen(false)} />
        </div>
        <nav className="flex flex-col gap-0.5 px-2 pb-6">
          <NavLinks layout="list" onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
