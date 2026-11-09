"use client";

import { Fragment } from "react";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getAdminBreadcrumbs } from "./breadcrumbs";

/** Topbar trail: Admin, the tool, then readable sub-pages. */
export function AdminBreadcrumbs({ pathname }: { pathname: string }) {
  const crumbs = getAdminBreadcrumbs(pathname);
  const lastIndex = crumbs.length - 1;

  return (
    <Breadcrumb aria-label="Breadcrumb" className="admin-breadcrumbs">
      <BreadcrumbList className="admin-breadcrumb-list">
        {crumbs.map((crumb, index) => (
          <Fragment key={`${index}-${crumb.label}`}>
            {index > 0 && (
              <BreadcrumbSeparator className="admin-breadcrumb-separator" />
            )}
            <BreadcrumbItem className="admin-breadcrumb-item">
              {index === lastIndex ? (
                <BreadcrumbPage className="admin-breadcrumb-page">
                  {crumb.label}
                </BreadcrumbPage>
              ) : crumb.href ? (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href} prefetch={false}>
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <span className="admin-breadcrumb-text">{crumb.label}</span>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
