"use client";

import { Typography } from "@/components/nowts/typography";
import { LogoSvg } from "@/components/svg/logo-svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarMenuButtonLink } from "@/components/ui/sidebar-utils";
import { SidebarUserButton } from "@/features/sidebar/sidebar-user-button";
import { SiteConfig } from "@/site-config";
import { getDashboardNavigation } from "./dashboard.links";

export const DashboardSidebar = () => {
  const navigationGroups = getDashboardNavigation();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="mb-4 flex flex-row items-center gap-2">
          <LogoSvg size={24} />
          <Typography>{SiteConfig.title}</Typography>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="flex flex-col gap-6">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <Typography
                variant="small"
                className="text-muted-foreground mb-2 px-3 font-medium"
              >
                {group.title}
              </Typography>
              <SidebarMenu>
                {group.links.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButtonLink href={link.href}>
                      <link.Icon />
                      <span>{link.label}</span>
                    </SidebarMenuButtonLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          ))}
        </div>
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <SidebarUserButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
