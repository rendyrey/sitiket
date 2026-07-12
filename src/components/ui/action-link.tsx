import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import cn from "@/utils/class-names";

type ActionLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  size?: "default" | "large";
  variant?: "dark" | "ghost" | "lime" | "outline";
};

const variants = {
  dark: "button-dark",
  ghost: "button-ghost",
  lime: "button-lime",
  outline: "button-outline",
};

export default function ActionLink({
  children,
  className,
  size = "default",
  variant = "dark",
  ...props
}: ActionLinkProps) {
  return (
    <Link
      className={cn(
        "button",
        variants[variant],
        size === "large" && "button-large",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
