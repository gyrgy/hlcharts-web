'use client';
/**
 * The page a chart belongs to, when it is shown somewhere else (an embed): its
 * frame credits and watermarks that page rather than `/embed/…`. Absent on the
 * site's own pages, where the current address is the page.
 */
import { createContext } from 'react';

export const PagePathContext = createContext<string | null>(null);
