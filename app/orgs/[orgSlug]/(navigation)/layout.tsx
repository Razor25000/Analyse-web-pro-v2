import type { LayoutParams } from "@/types/next";
import { OrgNavigation } from "./_navigation/org-navigation";

export default async function RouteLayout(
  props: LayoutParams<{ orgSlug: string }>,
) {
  return <OrgNavigation>{props.children}</OrgNavigation>;
}
