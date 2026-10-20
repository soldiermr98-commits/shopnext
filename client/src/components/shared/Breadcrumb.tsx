import React from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  trailingBadge?: React.ReactNode;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, trailingBadge }) => {
  return (
    <div className="w-full bg-surface-container-lowest border-b border-outline-variant/60 py-2.5 no-print">
      <div className="max-w-[1320px] mx-auto px-margin-mobile md:px-margin-desktop flex items-center justify-between">
        <nav aria-label="راهنمای مسیر" className="flex items-center gap-1.5 text-body-sm font-body-sm text-on-surface-variant flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-base">home</span>
            <span>خانه</span>
          </Link>
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              <span className="material-symbols-outlined text-xs text-outline rotate-180">
                chevron_left
              </span>
              {item.isCurrent || !item.href ? (
                <span className="text-primary font-bold">{item.label}</span>
              ) : (
                <Link to={item.href} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
        {trailingBadge && <div className="hidden sm:block">{trailingBadge}</div>}
      </div>
    </div>
  );
};
