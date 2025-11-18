import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CircleUser } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function AppHeader() {
  const location = useLocation();

  const getBreadcrumbs = () => {
    const path = location.pathname;

    // Dashboard page
    if (path === "/") {
      return (
        <BreadcrumbItem>
          <BreadcrumbPage>Dashboard</BreadcrumbPage>
        </BreadcrumbItem>
      );
    }

    // Insight Detail page
    if (path.startsWith("/insights/")) {
      return (
        <>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Insight Detail</BreadcrumbPage>
          </BreadcrumbItem>
        </>
      );
    }

    // Default
    return (
      <BreadcrumbItem>
        <BreadcrumbPage>Dashboard</BreadcrumbPage>
      </BreadcrumbItem>
    );
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-gradient-to-r from-white/60 to-zinc-50/60 px-4">
      <SidebarTrigger />

      <Breadcrumb>
        <BreadcrumbList>{getBreadcrumbs()}</BreadcrumbList>
      </Breadcrumb>

      <Button variant="secondary" size="icon" className="ml-auto h-9 w-9 rounded-full">
        <CircleUser className="h-4 w-4" />
      </Button>
    </header>
  );
}
