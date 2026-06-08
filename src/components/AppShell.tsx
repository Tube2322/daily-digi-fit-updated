import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, BookOpen, BarChart3, User, Plus, Moon, Sun } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useTheme, useProfile } from "@/lib/store";
import { LogSheet, type LogView } from "./LogSheet";

export function AppShell({ children, title, action }: { children: ReactNode; title?: string; action?: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { profile } = useProfile();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState<LogView>("menu");

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ view?: LogView }>).detail;
      setSheetView(detail?.view ?? "menu");
      setSheetOpen(true);
    }
    document.addEventListener("kalguroo:openFab", onOpen);
    return () => document.removeEventListener("kalguroo:openFab", onOpen);
  }, []);

  const left = [
    { to: "/", label: "แดชบอร์ด", icon: LayoutGrid },
    { to: "/diary", label: "ไดอารี่", icon: BookOpen },
  ] as const;
  const right = [
    { to: "/insights", label: "ข้อมูลเชิงลึก", icon: BarChart3 },
    { to: "/account", label: "บัญชี", icon: User },
  ] as const;

  const avatar = profile?.avatar;
  const displayName = profile?.nickname ?? profile?.displayName;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/90 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground font-bold text-base">
              {avatar ?? "K"}
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight leading-none">{title ?? "Kalguroo"}</h1>
              {displayName && <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{displayName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {action}
            <button
              onClick={toggle}
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-accent"
              aria-label="สลับธีม"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 pb-32 pt-4">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-4 pb-4">
          <div className="relative flex items-center justify-around rounded-3xl border border-border/60 bg-card/95 px-2 py-2 shadow-lg backdrop-blur-xl">
            {left.map((item) => (
              <NavLink key={item.to} item={item} active={path === item.to} />
            ))}
            <button
              onClick={() => { setSheetView("menu"); setSheetOpen(true); }}
              className="grid h-14 w-14 -translate-y-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-background transition active:scale-95"
              aria-label="บันทึก"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
            {right.map((item) => (
              <NavLink key={item.to} item={item} active={path === item.to} />
            ))}
          </div>
        </nav>

        <LogSheet open={sheetOpen} initialView={sheetView} onClose={() => setSheetOpen(false)} />
      </div>
    </div>
  );
}

function NavLink({ item, active }: { item: { to: string; label: string; icon: typeof LayoutGrid }; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-medium transition ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  );
}
