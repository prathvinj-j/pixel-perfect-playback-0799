import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Menu, PlusCircle, Store, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { SoundToggle } from "./SoundToggle";
import { useAuth } from "@/lib/auth";

export function initials(name?: string | null) {
  return (name ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const linkCls =
  "rounded-lg px-3 py-2 text-sm font-medium text-navy-muted transition-colors hover:bg-navy-elevated hover:text-navy-foreground";
const activeCls = "!text-navy-foreground bg-navy-elevated";

export function Navbar() {
  const { user, profile, isSeller, roles, signOut, ready } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-navy-border bg-navy/95 backdrop-blur supports-[backdrop-filter]:bg-navy/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <Link to="/auctions" search={{ tab: "active", sort: "ending" }} className={linkCls} activeProps={{ className: activeCls }}>
            Marketplace
          </Link>
          <Link to="/auctions" search={{ tab: "ending", sort: "ending" }} className={linkCls}>
            Ending soon
          </Link>
          {user && (
            <Link to="/dashboard" className={linkCls} activeProps={{ className: activeCls }}>
              Dashboard
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <SoundToggle />
          {user ? (
            <>
              {isSeller && (
                <Button asChild variant="hero" size="sm" className="hidden sm:inline-flex">
                  <Link to="/sell">
                    <PlusCircle /> New listing
                  </Link>
                </Button>
              )}
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-2 ring-transparent transition hover:ring-primary/60" aria-label="Account menu">
                    <Avatar className="size-9">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                      <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
                        {initials(profile?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="truncate">{profile?.display_name ?? "Member"}</div>
                    <div className="truncate text-xs font-normal capitalize text-muted-foreground">{roles.join(" · ") || "member"}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard"><LayoutDashboard /> Dashboard</Link>
                  </DropdownMenuItem>
                  {isSeller && (
                    <DropdownMenuItem asChild>
                      <Link to="/sell"><PlusCircle /> New listing</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/profile"><UserRound /> Profile & roles</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : ready ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button asChild variant="stage-ghost" size="sm">
                <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
              </Button>
              <Button asChild variant="hero" size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>Join free</Link>
              </Button>
            </div>
          ) : null}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="stage-ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1 px-4">
                <MobileLink to="/auctions" icon={<Store />}>Marketplace</MobileLink>
                {user ? (
                  <>
                    <MobileLink to="/dashboard" icon={<LayoutDashboard />}>Dashboard</MobileLink>
                    {isSeller && <MobileLink to="/sell" icon={<PlusCircle />}>New listing</MobileLink>}
                    <MobileLink to="/profile" icon={<UserRound />}>Profile & roles</MobileLink>
                    <Button variant="outline" className="mt-4" onClick={() => signOut()}>
                      <LogOut /> Sign out
                    </Button>
                  </>
                ) : (
                  <div className="mt-4 grid gap-2">
                    <Button asChild variant="outline"><Link to="/auth" search={{ mode: "signin" }}>Sign in</Link></Button>
                    <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Join free</Link></Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function MobileLink({ to, icon, children }: { to: "/auctions" | "/dashboard" | "/sell" | "/profile"; icon: ReactNode; children: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground">
      {icon}
      {children}
    </Link>
  );
}
