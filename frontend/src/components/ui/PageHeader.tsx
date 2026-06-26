interface PageHeaderProps {
  breadcrumb?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ breadcrumb, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb && (
        <p className="text-label-caps text-mono-grey mb-3" style={{ fontSize: 11 }}>
          {breadcrumb}
        </p>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-lg text-on-surface" style={{ fontSize: 48 }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0 pt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
