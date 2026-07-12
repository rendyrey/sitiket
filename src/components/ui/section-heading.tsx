import type { ReactNode } from "react";

type SectionHeadingProps = {
  action?: ReactNode;
  eyebrow: string;
  title: ReactNode;
};

export default function SectionHeading({
  action,
  eyebrow,
  title,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <span className="section-index">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
